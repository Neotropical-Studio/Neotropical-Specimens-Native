#!/usr/bin/env python3
"""
procesador_industrial.py — Pipeline industrial resiliente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUEUE MANAGEMENT
  Lee processing_queue.json (no watchdog). Cada item tiene status:
  pending → processing → done | failed
  Si cae en la foto 50.000, al reiniciar retoma exactamente ahí.

MULTITHREADING
  concurrent.futures.ThreadPoolExecutor(max_workers=8).
  Mientras Cloudinary responde por 1 foto, otras 7 ya van en paralelo
  (~8× más rápido que el pipeline secuencial).

GESTIÓN DE ARCHIVOS
  Tras éxito: os.rename → procesados_finales/{PREFIJO}/
  hot_folder queda vacía (evita congelar el Finder con 180k archivos).

ERROR ISOLATION
  Cada fallo → failure_report.log
  El hilo principal NUNCA se detiene por un archivo.

SUPABASE EFFICIENCY
  Un solo cliente / un solo writer. Workers empujan resultados a un buffer;
  el writer hace upsert masivo en lotes (transaction-like), sin N conexiones.

USO:
  source scripts/.venv/bin/activate
  python scripts/listar_pendientes.py --folder hot_folder --reset-stuck
  python scripts/procesador_industrial.py
  python scripts/procesador_industrial.py --workers 8 --batch 25
  python scripts/procesador_industrial.py --dry-run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from processor import (  # noqa: E402
    DISPLAY_ORDER,
    SUPABASE_KEY,
    SUPABASE_URL,
    parse_code_view,
    upload_to_cloudinary,
)
from supabase import Client, create_client  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  [%(threadName)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("industrial")

DEFAULT_QUEUE = ROOT / "processing_queue.json"
DEFAULT_FAILURES = ROOT / "failure_report.log"
DEFAULT_PROCESADOS = ROOT / "procesados_finales"
DEFAULT_WORKERS = 8  # 8× vs secuencial mientras Cloudinary responde


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# ── Prefijo / mover (os.rename → hot_folder vacía) ────────────────────────────

def _prefijo(nombre: str) -> str:
    if "_" in nombre:
        p = nombre.split("_", 1)[0].strip()
        return p if p else "OTROS"
    return "OTROS"


def _mover_procesado(path: Path, dest_root: Path) -> str | None:
    """
    Sacá el archivo de hot_folder YA (os.rename atómico en el mismo disco).
    Así hot_folder no acumula 180k archivos y el listado no congela la máquina.
    """
    try:
        if not path.exists():
            return None
        sub = dest_root / _prefijo(path.name)
        os.makedirs(sub, exist_ok=True)
        destino = sub / path.name
        if destino.exists():
            stem, suffix = path.stem, path.suffix
            n = 1
            while True:
                candidato = sub / f"{stem}_{n}{suffix}"
                if not candidato.exists():
                    destino = candidato
                    break
                n += 1
        # os.rename = mismo volumen, instantáneo, deja hot_folder limpia
        try:
            os.rename(path, destino)
        except OSError:
            # Fallback cross-device (p.ej. disco externo → interno)
            shutil.move(str(path), str(destino))
        log.info("  📁 rename → %s", destino)
        return str(destino)
    except Exception as e:
        log.warning("No se pudo mover %s: %s", path.name, e)
    return None


# ── Cola durable (processing_queue.json) ──────────────────────────────────────

class QueueStore:
    """Cola JSON thread-safe con flush atómico."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()
        self.data = self._load()
        self._index = {str(it["path"]): i for i, it in enumerate(self.data["items"])}

    def _load(self) -> dict:
        if not self.path.exists():
            sys.exit(
                f"No existe {self.path}\n"
                "Primero: python scripts/listar_pendientes.py --reset-stuck"
            )
        data = json.loads(self.path.read_text("utf-8"))
        items = data.get("items", [])
        if isinstance(items, dict):
            data["items"] = list(items.values())
        # Crash recovery: processing → pending
        for it in data["items"]:
            if it.get("status") == "processing":
                it["status"] = "pending"
                it["updated_at"] = _now()
        return data

    def _recompute_stats(self) -> None:
        items = self.data["items"]
        self.data["stats"] = {
            "total": len(items),
            "pending": sum(1 for i in items if i.get("status") == "pending"),
            "processing": sum(1 for i in items if i.get("status") == "processing"),
            "done": sum(1 for i in items if i.get("status") == "done"),
            "failed": sum(1 for i in items if i.get("status") == "failed"),
        }
        self.data["updated_at"] = _now()

    def save(self) -> None:
        with self._lock:
            self._recompute_stats()
            tmp = self.path.with_suffix(".json.tmp")
            tmp.write_text(
                json.dumps(self.data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            tmp.replace(self.path)

    def pending_items(self) -> list[dict]:
        with self._lock:
            return [dict(it) for it in self.data["items"] if it.get("status") == "pending"]

    def mark(self, path: str, **fields) -> None:
        with self._lock:
            idx = self._index.get(path)
            if idx is None:
                return
            self.data["items"][idx].update(fields)
            self.data["items"][idx]["updated_at"] = _now()


# ── Failure report ────────────────────────────────────────────────────────────

class FailureReport:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def log(self, path: str, reason: str) -> None:
        line = f"{_now()}\t{path}\t{reason}\n"
        with self._lock:
            with self.path.open("a", encoding="utf-8") as f:
                f.write(line)


# ── Supabase writer (un solo hilo / un cliente) ────────────────────────────────

@dataclass
class MediaResult:
    path: str
    code: str
    view: str
    public_id: str
    secure_url: str
    resource_type: str
    bg_status: str


def _media_type(resource_type: str) -> str:
    return {
        "image": "photo_webp",
        "video": "video_mp4",
        "raw":   "model_3d_glb",
    }.get(resource_type, resource_type)


class SupabaseBatchWriter:
    """
    Writer serializado: workers solo producen MediaResult.
    Un solo cliente Supabase + upserts en lotes = sin saturar conexiones.
    """

    def __init__(self, sb: Client | None, batch_size: int) -> None:
        self.sb = sb
        self.batch_size = max(1, batch_size)
        self._buf: list[MediaResult] = []
        self._lock = threading.Lock()
        self._id_cache: dict[str, str] = {}
        self.upserted = 0

    def push(self, item: MediaResult) -> None:
        if self.sb is None:
            return
        flush_now = False
        with self._lock:
            self._buf.append(item)
            if len(self._buf) >= self.batch_size:
                flush_now = True
                batch = self._buf
                self._buf = []
        if flush_now:
            self._flush(batch)

    def flush_remaining(self) -> None:
        with self._lock:
            batch = self._buf
            self._buf = []
        if batch:
            self._flush(batch)

    def _resolve_ids(self, codes: list[str]) -> dict[str, str]:
        assert self.sb is not None
        need = [c.upper() for c in codes if c.upper() not in self._id_cache]
        if not need:
            return {c: self._id_cache[c.upper()] for c in codes if c.upper() in self._id_cache}

        CHUNK = 40
        for i in range(0, len(need), CHUNK):
            chunk = need[i : i + CHUNK]
            try:
                r = (
                    self.sb.table("specimens")
                    .select("id, metadata, specimen_code")
                    .in_("specimen_code", chunk)
                    .execute()
                )
                for row in r.data or []:
                    code = str(row.get("specimen_code") or "").upper()
                    if code:
                        self._id_cache[code] = str(row["id"])
            except Exception as e:
                log.warning("Lookup specimen_code: %s", e)

            missing = [c for c in chunk if c not in self._id_cache]
            if missing:
                try:
                    r2 = (
                        self.sb.table("specimens")
                        .select("id, metadata")
                        .in_("metadata->>code", missing)
                        .execute()
                    )
                    for row in r2.data or []:
                        meta = row.get("metadata") or {}
                        code = str(meta.get("code") or "").upper()
                        if code:
                            self._id_cache[code] = str(row["id"])
                except Exception as e:
                    log.warning("Lookup metadata.code: %s", e)

            still = [c for c in chunk if c not in self._id_cache]
            if still:
                rows = [
                    {
                        "specimen_code": c,
                        "metadata": {
                            "code": c,
                            "auto_created": True,
                            "source": "industrial",
                        },
                    }
                    for c in still
                ]
                try:
                    ins = self.sb.table("specimens").insert(rows).execute()
                    for row in ins.data or []:
                        meta = row.get("metadata") or {}
                        code = str(meta.get("code") or row.get("specimen_code") or "").upper()
                        if code:
                            self._id_cache[code] = str(row["id"])
                    log.info("Specimens creados (lote): %d", len(ins.data or []))
                except Exception as e:
                    log.error("Insert specimens lote falló: %s", e)
                    for c in still:
                        try:
                            ins = (
                                self.sb.table("specimens")
                                .insert({
                                    "specimen_code": c,
                                    "metadata": {
                                        "code": c,
                                        "auto_created": True,
                                        "source": "industrial",
                                    },
                                })
                                .execute()
                            )
                            if ins.data:
                                self._id_cache[c] = str(ins.data[0]["id"])
                        except Exception as e2:
                            log.error("No se pudo crear specimen %s: %s", c, e2)

        return {c: self._id_cache[c.upper()] for c in codes if c.upper() in self._id_cache}

    def _flush(self, batch: list[MediaResult]) -> None:
        if not batch or self.sb is None:
            return
        id_map = self._resolve_ids([b.code for b in batch])
        rows = []
        for b in batch:
            sid = id_map.get(b.code.upper())
            if not sid:
                log.error("Sin specimen_id para %s — omitido del upsert", b.code)
                continue
            rows.append({
                "specimen_id":   sid,
                "public_id":     b.public_id,
                "media_url":     b.secure_url,
                "media_type":    _media_type(b.resource_type),
                "view":          b.view,
                "display_order": DISPLAY_ORDER.get(b.view, 9),
            })
        if not rows:
            return
        try:
            res = (
                self.sb.table("specimen_media")
                .upsert(rows, on_conflict="public_id")
                .execute()
            )
            n = len(res.data or rows)
            self.upserted += n
            log.info("✔ Upsert masivo specimen_media: %d filas (acum=%d)", n, self.upserted)
        except Exception as e:
            log.error("Upsert masivo falló (%d): %s — fallback 1×1", len(rows), e)
            for row in rows:
                try:
                    self.sb.table("specimen_media").upsert(row, on_conflict="public_id").execute()
                    self.upserted += 1
                except Exception as e2:
                    log.error("Upsert 1×1 falló %s: %s", row.get("public_id"), e2)


# ── Worker (Cloudinary only) ──────────────────────────────────────────────────

@dataclass
class WorkOutcome:
    path: str
    ok: bool
    error: str | None = None
    result: MediaResult | None = None
    moved_to: str | None = None


def process_one(
    path_str: str,
    dry_run: bool,
    move: bool,
    dest_root: Path,
) -> WorkOutcome:
    """Ejecutado en worker thread. Nunca lanza hacia el main (aísla errores)."""
    path = Path(path_str)
    try:
        if not path.exists():
            return WorkOutcome(path_str, False, "not_found")

        parsed = parse_code_view(path)
        if not parsed:
            return WorkOutcome(
                path_str, False,
                "nombre_invalido (usa CODE-NNN_vista.ext p.ej. BR-001_dorsal.jpg)",
            )
        code, view = parsed

        upload = upload_to_cloudinary(
            path, code, view,
            dry_run=dry_run,
            wait_adobe=False,
        )
        media = MediaResult(
            path=path_str,
            code=code,
            view=view,
            public_id=upload["public_id"],
            secure_url=upload["secure_url"],
            resource_type=upload["resource_type"],
            bg_status=upload["bg_status"],
        )
        moved = None
        if move and not dry_run:
            moved = _mover_procesado(path, dest_root)
        return WorkOutcome(path_str, True, None, media, moved)
    except Exception as e:
        return WorkOutcome(path_str, False, f"{type(e).__name__}: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Procesador industrial: cola JSON + multithreading + upsert batch",
    )
    parser.add_argument("--queue", default=str(DEFAULT_QUEUE))
    parser.add_argument("--failures", default=str(DEFAULT_FAILURES))
    parser.add_argument("--procesados", default=str(DEFAULT_PROCESADOS))
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Hilos paralelos (default {DEFAULT_WORKERS} = ~8× vs secuencial)",
    )
    parser.add_argument("--batch", type=int, default=25, help="Tamaño upsert Supabase")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-move", action="store_true")
    parser.add_argument("--no-db", action="store_true")
    parser.add_argument(
        "--checkpoint-every",
        type=int,
        default=10,
        help="Guardar processing_queue.json cada N resultados",
    )
    args = parser.parse_args()

    workers = max(1, min(32, args.workers))
    queue = QueueStore(Path(args.queue).expanduser().resolve())
    failures = FailureReport(Path(args.failures).expanduser().resolve())
    dest_root = Path(args.procesados).expanduser().resolve()
    dest_root.mkdir(parents=True, exist_ok=True)

    # Persist crash recovery (processing→pending) immediately
    queue.save()

    pending = queue.pending_items()
    if not pending:
        log.info("Nada pendiente en la cola. Escanea de nuevo con listar_pendientes.py")
        print(json.dumps(queue.data.get("stats", {}), indent=2))
        return

    sb: Client | None = None
    if not args.no_db and not args.dry_run:
        if not SUPABASE_URL or not SUPABASE_KEY:
            sys.exit("Faltan credenciales Supabase en .env.local")
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    writer = SupabaseBatchWriter(sb, args.batch)

    print("\n" + "━" * 54)
    print("  PROCESADOR INDUSTRIAL — MULTITHREAD + COLA JSON")
    print("━" * 54)
    print(f"  Cola:       {args.queue}")
    print(f"  Pendientes: {len(pending)}")
    print(f"  Workers:    {workers}  (max_workers={workers} — paralelo Cloudinary)")
    print(f"  Upsert:     lotes de {args.batch} (1 conexión)")
    print(f"  Rename:     hot_folder → procesados_finales/{{PREFIJO}}/  (os.rename)")
    print(f"  Failures:   {args.failures}")
    print(f"  Modo:       {'DRY-RUN' if args.dry_run else 'PRODUCCIÓN'}")
    print("━" * 54 + "\n")

    ok = err = 0
    since_ckpt = 0
    t0 = time.monotonic()
    # Oleadas: no materializar 50k futures de golpe; retoma fina tras crash
    wave = max(workers * 4, workers)

    try:
        while True:
            pending = queue.pending_items()
            if not pending:
                break
            wave_items = pending[:wave]

            for it in wave_items:
                queue.mark(
                    it["path"],
                    status="processing",
                    attempts=int(it.get("attempts", 0)) + 1,
                )
            queue.save()

            with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="w") as pool:
                futures = {
                    pool.submit(
                        process_one,
                        it["path"],
                        args.dry_run,
                        not args.no_move,
                        dest_root,
                    ): it["path"]
                    for it in wave_items
                }

                for fut in as_completed(futures):
                    path = futures[fut]
                    try:
                        outcome = fut.result()
                    except Exception as e:
                        outcome = WorkOutcome(path, False, f"future:{e}")

                    if outcome.ok and outcome.result:
                        ok += 1
                        r = outcome.result
                        queue.mark(
                            path,
                            status="done",
                            code=r.code,
                            view=r.view,
                            public_id=r.public_id,
                            secure_url=r.secure_url,
                            error=None,
                        )
                        writer.push(r)
                        log.info(
                            "✔ [%d ok / %d err] %s → %s",
                            ok, err, Path(path).name, r.public_id,
                        )
                    else:
                        err += 1
                        reason = outcome.error or "unknown"
                        queue.mark(path, status="failed", error=reason)
                        failures.log(path, reason)
                        log.error(
                            "✘ [%d ok / %d err] %s — %s",
                            ok, err, Path(path).name, reason,
                        )

                    since_ckpt += 1
                    if since_ckpt >= max(1, args.checkpoint_every):
                        queue.save()
                        since_ckpt = 0

            queue.save()

    except KeyboardInterrupt:
        print("\n⏹ Interrumpido — checkpoint + flush Supabase…")
        with queue._lock:
            for it in queue.data["items"]:
                if it.get("status") == "processing":
                    it["status"] = "pending"
                    it["updated_at"] = _now()
    finally:
        writer.flush_remaining()
        queue.save()

    elapsed = time.monotonic() - t0
    stats = queue.data.get("stats", {})
    print("\n" + "━" * 54)
    print("  RESUMEN INDUSTRIAL")
    print(f"  ✔ OK:          {ok}")
    print(f"  ✘ Failed:      {err}")
    print(f"  ⬆ Upserts DB:  {writer.upserted}")
    print(f"  ⏱ Tiempo:      {elapsed:.1f}s")
    if elapsed > 0 and ok:
        print(f"  ⚡ Throughput:  {ok / (elapsed / 60):.1f} fotos/min")
    print(f"  Cola stats:    {stats}")
    print(f"  Failures log:  {args.failures}")
    print("━" * 54 + "\n")


if __name__ == "__main__":
    main()
