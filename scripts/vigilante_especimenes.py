#!/usr/bin/env python3
"""
vigilante_especimenes.py — Guardián autónomo de Hot Folder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCIONAMIENTO (cero intervención manual):
  1. Mueve/copia tus fotos a la carpeta hot_folder/
  2. El vigilante las detecta al instante con watchdog
  3. Las encola y procesa con Adobe Firefly Remove Background
  4. Las sube a Cloudinary y registra en Supabase
  5. El espécimen aparece en el Admin Overview listo para venta

CONVENCIÓN DE NOMBRE OBLIGATORIA:
  {CODE}[_{vista}].{ext}
  BR-001_dorsal.jpg    →  mariposa BR-001, vista dorsal
  BR-001_ventral.png   →  mariposa BR-001, vista ventral
  BR-001.glb           →  modelo 3D
  HE-032.mp4           →  video

MÉTODOS DE REMOCIÓN:
  adobe      (DEFAULT) Adobe Firefly — calidad Adobe Express, gratis
  birefnet   IA local  — gratis, offline, sin límite
  cloudinary Cloudinary AI — integrado en el stack

USO:
  # Vigilante en tiempo real (recomendado):
  python scripts/vigilante_especimenes.py

  # Procesar carpeta existente en lote:
  python scripts/vigilante_especimenes.py --scan /ruta/a/carpeta

  # Cambiar método de remoción:
  python scripts/vigilante_especimenes.py --method birefnet

  # Simular sin subir nada:
  python scripts/vigilante_especimenes.py --dry-run

VARIABLES DE ENTORNO (.env.local):
  ADOBE_CLIENT_ID          ADOBE_CLIENT_SECRET   (para --method adobe)
  CLOUDINARY_CLOUD_NAME    CLOUDINARY_API_KEY     CLOUDINARY_API_SECRET
  NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import queue
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple

# ── Cargar .env.local ─────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env.local")
except ImportError:
    sys.exit("Dependencia faltante: python-dotenv\nEjecuta: pip install python-dotenv")

# ── Importar motor de procesamiento ──────────────────────────────────────────
# Reutilizamos todo el código de process_assets_bg.py directamente.
sys.path.insert(0, str(Path(__file__).parent))
try:
    from process_assets_bg import (
        parse_filename,
        process_file,
        IMAGE_EXT, MODEL_EXT, VIDEO_EXT,
    )
    from supabase import create_client, Client
except ImportError as e:
    sys.exit(
        f"Dependencia faltante: {e}\n"
        "Ejecuta: pip install watchdog 'rembg[gpu]' opencv-python-headless "
        "pillow cloudinary supabase python-dotenv requests"
    )

# ── watchdog ──────────────────────────────────────────────────────────────────
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileCreatedEvent
except ImportError:
    sys.exit(
        "Dependencia faltante: watchdog\n"
        "Ejecuta: pip install watchdog"
    )

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("vigilante")

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_HOT_FOLDER   = ROOT / "hot_folder"
CHECKPOINT_FILE      = ROOT / ".vigilante_checkpoint.json"
DEBOUNCE_SECONDS     = 1.5    # espera antes de procesar (el archivo debe terminar de copiarse)
RETRY_MAX            = 3      # reintentos ante fallo
RETRY_DELAY_S        = 8.0    # pausa entre reintentos
QUEUE_POLL_INTERVAL  = 0.3    # polling del worker thread

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

SUPPORTED_EXT = IMAGE_EXT | MODEL_EXT | VIDEO_EXT

# ── Checkpoint (no reprocesar archivos ya subidos) ────────────────────────────

def load_checkpoint() -> set[str]:
    if CHECKPOINT_FILE.exists():
        try:
            return set(json.loads(CHECKPOINT_FILE.read_text("utf-8")))
        except Exception:
            pass
    return set()

def save_checkpoint(done: set[str]) -> None:
    CHECKPOINT_FILE.write_text(json.dumps(sorted(done), indent=2), encoding="utf-8")

# ── Estadísticas en tiempo real ───────────────────────────────────────────────

class Stats:
    def __init__(self) -> None:
        self.lock        = threading.Lock()
        self.detected    = 0
        self.ok          = 0
        self.rejected_qc = 0
        self.errors      = 0
        self.processing  = 0
        self.queue_size  = 0

    def print_status(self) -> None:
        with self.lock:
            bar = "━" * 52
            print(f"\n{bar}")
            print(f"  VIGILANTE ACTIVO  {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')}")
            print(f"  Detectados:   {self.detected:>5}")
            print(f"  En cola:      {self.queue_size:>5}")
            print(f"  Procesando:   {self.processing:>5}")
            print(f"  ✔ Subidos:    {self.ok:>5}")
            print(f"  ⚠ QC fail:    {self.rejected_qc:>5}")
            print(f"  ✘ Errores:    {self.errors:>5}")
            print(f"{bar}\n")

stats = Stats()

# ── Cola de trabajo ───────────────────────────────────────────────────────────

class QueueItem(NamedTuple):
    path:     Path
    added_at: float    # timestamp para debounce
    retries:  int = 0

work_queue: queue.Queue[QueueItem] = queue.Queue()

# ── Worker thread — procesa archivos de la cola ───────────────────────────────

def worker(sb: Client | None, method: str, min_sharpness: float, dry_run: bool,
           checkpoint: set[str]) -> None:
    """Hilo que consume la cola y procesa cada archivo."""
    while True:
        try:
            item = work_queue.get(timeout=QUEUE_POLL_INTERVAL)
        except queue.Empty:
            continue

        stats.queue_size = work_queue.qsize()

        # ── Debounce: espera a que el archivo termine de copiarse ─────────────
        wait = DEBOUNCE_SECONDS - (time.monotonic() - item.added_at)
        if wait > 0:
            time.sleep(wait)

        path_str = str(item.path)

        # ── Verificar que el archivo existe y es accesible ────────────────────
        if not item.path.exists():
            log.warning("Archivo desaparecido antes de procesar: %s", item.path.name)
            work_queue.task_done()
            continue

        # ── Verificar checkpoint ──────────────────────────────────────────────
        if path_str in checkpoint:
            log.info("Ya procesado (checkpoint): %s", item.path.name)
            work_queue.task_done()
            continue

        # ── Parsear nombre de archivo ─────────────────────────────────────────
        pf = parse_filename(item.path)
        if pf is None:
            log.warning("Nombre no reconocido (se ignora): %s", item.path.name)
            work_queue.task_done()
            continue

        # ── Procesar ──────────────────────────────────────────────────────────
        with stats.lock:
            stats.processing += 1

        log.info("▶ Procesando [%s] %s", method.upper(), item.path.name)

        try:
            result = process_file(
                pf,
                sb,                  # type: ignore[arg-type]
                min_sharpness,
                dry_run,
                method=method,
            )
        except Exception as exc:
            result = {"status": f"EXCEPTION: {exc}", "file": item.path.name}

        with stats.lock:
            stats.processing -= 1

        status = result.get("status", "")

        if status in ("OK", "DRY_RUN_OK"):
            with stats.lock:
                stats.ok += 1
            checkpoint.add(path_str)
            save_checkpoint(checkpoint)
            log.info("  ✔  %s  →  %s", item.path.name, result.get("public_id", "dry"))

        elif "RECHAZADO" in (status or ""):
            with stats.lock:
                stats.rejected_qc += 1
            log.warning("  ⚠  %s  QC rechazado: %s", item.path.name, status)

        else:
            # Error — reintentar si no se superó el límite
            if item.retries < RETRY_MAX:
                log.warning(
                    "  ✘  %s  error: %s — reintento %d/%d en %.0fs",
                    item.path.name, status, item.retries + 1, RETRY_MAX, RETRY_DELAY_S,
                )
                time.sleep(RETRY_DELAY_S)
                work_queue.put(QueueItem(item.path, time.monotonic(), item.retries + 1))
            else:
                with stats.lock:
                    stats.errors += 1
                log.error("  ✘  %s  abandonado tras %d intentos: %s",
                          item.path.name, RETRY_MAX, status)

        stats.queue_size = work_queue.qsize()
        work_queue.task_done()

# ── Watchdog handler ──────────────────────────────────────────────────────────

class HotFolderHandler(FileSystemEventHandler):
    def __init__(self, checkpoint: set[str]) -> None:
        super().__init__()
        self.checkpoint = checkpoint

    def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        p = Path(str(event.src_path))
        if p.suffix.lower() not in SUPPORTED_EXT:
            return
        if str(p) in self.checkpoint:
            return

        with stats.lock:
            stats.detected += 1

        log.info("⚡ Detectado: %s", p.name)
        work_queue.put(QueueItem(path=p, added_at=time.monotonic()))
        stats.queue_size = work_queue.qsize()

    # Soporte para archivos movidos a la carpeta (drag & drop desde Finder/Explorer)
    def on_moved(self, event) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        p = Path(str(event.dest_path))
        if p.suffix.lower() not in SUPPORTED_EXT:
            return
        if str(p) in self.checkpoint:
            return

        with stats.lock:
            stats.detected += 1

        log.info("⚡ Movido a hot_folder: %s", p.name)
        work_queue.put(QueueItem(path=p, added_at=time.monotonic()))
        stats.queue_size = work_queue.qsize()

# ── Modo --scan (lote de archivos existentes) ──────────────────────────────────

def scan_existing(folder: Path, checkpoint: set[str], recursive: bool) -> int:
    """Encola todos los archivos existentes que no están en el checkpoint."""
    glob_fn = folder.rglob if recursive else folder.glob
    files   = sorted(f for f in glob_fn("*.*") if f.suffix.lower() in SUPPORTED_EXT)
    pending = [f for f in files if str(f) not in checkpoint]

    log.info("Archivos encontrados: %d  /  pendientes: %d", len(files), len(pending))

    for f in pending:
        with stats.lock:
            stats.detected += 1
        work_queue.put(QueueItem(path=f, added_at=time.monotonic()))

    stats.queue_size = work_queue.qsize()
    return len(pending)

# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Vigilante autónomo de Hot Folder — Adobe Firefly + Cloudinary + Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EJEMPLOS:
  # Vigilante en tiempo real (modos por defecto: hot_folder/, método adobe):
  python scripts/vigilante_especimenes.py

  # Hot folder personalizada:
  python scripts/vigilante_especimenes.py --folder ~/Desktop/fotos_mariposas

  # Procesar carpeta existente en lote y luego vigilar:
  python scripts/vigilante_especimenes.py --scan ~/fotos/morpho --watch

  # Solo lote (sin vigilar después):
  python scripts/vigilante_especimenes.py --scan ~/fotos --no-watch

  # Offline sin internet (BiRefNet local):
  python scripts/vigilante_especimenes.py --method birefnet

  # Simular sin subir nada:
  python scripts/vigilante_especimenes.py --dry-run

  # Borrar checkpoint y reprocesar todo:
  python scripts/vigilante_especimenes.py --reset-checkpoint
        """,
    )
    parser.add_argument(
        "--folder",
        default=str(DEFAULT_HOT_FOLDER),
        help=f"Hot folder a vigilar (default: {DEFAULT_HOT_FOLDER})",
    )
    parser.add_argument(
        "--scan",
        metavar="CARPETA",
        default=None,
        help="Procesar archivos existentes en CARPETA en lote antes de vigilar",
    )
    parser.add_argument(
        "--no-watch",
        action="store_true",
        help="Solo procesar --scan, no vigilar después",
    )
    parser.add_argument(
        "--method",
        choices=["adobe", "birefnet", "cloudinary"],
        default="adobe",
        help="Motor de remoción de fondo (default: adobe — Adobe Firefly)",
    )
    parser.add_argument(
        "--min-sharpness",
        type=float,
        default=80.0,
        help="Umbral mínimo de nitidez Laplacian (default 80)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular sin subir a Cloudinary ni escribir en Supabase",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Buscar en subcarpetas del hot_folder",
    )
    parser.add_argument(
        "--reset-checkpoint",
        action="store_true",
        help="Borrar checkpoint y reprocesar todos los archivos",
    )
    args = parser.parse_args()

    # ── Checkpoint ────────────────────────────────────────────────────────────
    if args.reset_checkpoint and CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        log.info("Checkpoint borrado — se reprocesará todo")
    checkpoint = load_checkpoint()
    log.info("Checkpoint: %d archivos ya procesados", len(checkpoint))

    # ── Supabase ──────────────────────────────────────────────────────────────
    sb: Client | None = None
    if not args.dry_run:
        if not SUPABASE_URL or not SUPABASE_KEY:
            sys.exit(
                "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local\n"
                "Usa --dry-run para probar sin BD."
            )
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        log.info("Supabase conectado: %s", SUPABASE_URL[:40] + "…")

    # ── Hot folder ─────────────────────────────────────────────────────────────
    hot_folder = Path(args.folder)
    hot_folder.mkdir(parents=True, exist_ok=True)

    # ── Worker thread ─────────────────────────────────────────────────────────
    worker_thread = threading.Thread(
        target=worker,
        args=(sb, args.method, args.min_sharpness, args.dry_run, checkpoint),
        daemon=True,
        name="worker",
    )
    worker_thread.start()

    # ── Modo --scan: encolar archivos existentes ───────────────────────────────
    scan_folder = Path(args.scan) if args.scan else None
    if scan_folder:
        if not scan_folder.is_dir():
            sys.exit(f"Carpeta no encontrada: {scan_folder}")
        n = scan_existing(scan_folder, checkpoint, recursive=args.recursive)
        log.info("Lote encolado: %d archivos", n)

        if args.no_watch:
            # Esperar a que el worker vacíe la cola
            log.info("Procesando lote — espera a que finalice…")
            work_queue.join()
            stats.print_status()
            log.info("Lote completado. Saliendo.")
            return

    # ── Modo watch (hot folder en vivo) ────────────────────────────────────────
    method_label = {
        "adobe":      "Adobe Firefly (misma IA que Adobe Express)",
        "birefnet":   "BiRefNet local (offline)",
        "cloudinary": "Cloudinary AI",
    }.get(args.method, args.method)

    print("\n" + "━" * 60)
    print("  VIGILANTE AUTÓNOMO DE HOT FOLDER")
    print(f"  Carpeta:  {hot_folder}")
    print(f"  Método:   {method_label}")
    print(f"  Modo:     {'DRY-RUN (sin subir)' if args.dry_run else 'PRODUCCIÓN'}")
    print("━" * 60)
    print("  Mueve o copia tus fotos a la carpeta y el sistema")
    print("  las procesará automáticamente. Ctrl+C para salir.")
    print("━" * 60 + "\n")

    handler  = HotFolderHandler(checkpoint)
    observer = Observer()
    observer.schedule(handler, str(hot_folder), recursive=args.recursive)
    observer.start()

    # También encolar lo que ya esté en hot_folder al arrancar
    n_existing = scan_existing(hot_folder, checkpoint, recursive=args.recursive)
    if n_existing:
        log.info("Archivos preexistentes en hot_folder encolados: %d", n_existing)

    # Imprimir estado cada 30 segundos
    last_status = time.monotonic()
    try:
        while True:
            time.sleep(1)
            if time.monotonic() - last_status >= 30:
                stats.print_status()
                last_status = time.monotonic()
    except KeyboardInterrupt:
        print("\nDeteniendo vigilante…")
        observer.stop()

    observer.join()
    work_queue.join()   # Terminar lo que queda en cola
    stats.print_status()
    log.info("Vigilante detenido. Hasta la próxima.")


if __name__ == "__main__":
    main()
