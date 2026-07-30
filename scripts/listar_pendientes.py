#!/usr/bin/env python3
"""
listar_pendientes.py — Paso A
Escanea carpeta fuente → lista_pendiente.txt + processing_queue.json

El JSON es la cola durable: si el industrial se cae en la foto 50.000,
retoma exactamente donde quedó (status pending/processing/done/failed).

USO:
  source scripts/.venv/bin/activate
  python scripts/listar_pendientes.py
  python scripts/listar_pendientes.py --folder hot_folder --recursive
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp", ".tif"}
DEFAULT_FOLDER = ROOT / "hot_folder"
DEFAULT_LISTA = ROOT / "lista_pendiente.txt"
DEFAULT_QUEUE = ROOT / "processing_queue.json"


def escanear(folder: Path, recursive: bool) -> list[Path]:
    if not folder.is_dir():
        sys.exit(f"Carpeta no encontrada: {folder}")

    pattern = "**/*.*" if recursive else "*.*"
    paths = [
        p.resolve()
        for p in sorted(folder.glob(pattern))
        if p.is_file() and p.suffix.lower() in IMAGE_EXT and not p.name.startswith(".")
    ]
    seen: set[str] = set()
    unique: list[Path] = []
    for p in paths:
        key = str(p)
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def merge_queue(
    queue_path: Path,
    source_dir: Path,
    paths: list[Path],
    reset_stuck: bool,
) -> dict:
    """
    Fusiona rutas nuevas en processing_queue.json sin pisar done/failed.
    Si reset_stuck: processing → pending (crash recovery).
    """
    if queue_path.exists():
        try:
            data = json.loads(queue_path.read_text("utf-8"))
        except Exception:
            data = {}
    else:
        data = {}

    items: dict[str, dict] = {}
    raw_items = data.get("items", [])
    if isinstance(raw_items, dict):
        items = {k: v for k, v in raw_items.items() if isinstance(v, dict)}
    elif isinstance(raw_items, list):
        for it in raw_items:
            if isinstance(it, dict) and it.get("path"):
                items[str(it["path"])] = it

    added = 0
    for p in paths:
        key = str(p)
        if key in items:
            if reset_stuck and items[key].get("status") == "processing":
                items[key]["status"] = "pending"
                items[key]["updated_at"] = _now()
            continue
        items[key] = {
            "path": key,
            "status": "pending",
            "attempts": 0,
            "error": None,
            "code": None,
            "view": None,
            "public_id": None,
            "secure_url": None,
            "updated_at": _now(),
        }
        added += 1

    # Orden estable por path
    ordered = [items[k] for k in sorted(items.keys())]
    pending = sum(1 for i in ordered if i.get("status") == "pending")
    done = sum(1 for i in ordered if i.get("status") == "done")
    failed = sum(1 for i in ordered if i.get("status") == "failed")
    processing = sum(1 for i in ordered if i.get("status") == "processing")

    out = {
        "version": 1,
        "source_dir": str(source_dir),
        "created_at": data.get("created_at") or _now(),
        "updated_at": _now(),
        "stats": {
            "total": len(ordered),
            "pending": pending,
            "processing": processing,
            "done": done,
            "failed": failed,
        },
        "items": ordered,
    }
    queue_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"added": added, **out["stats"]}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Paso A — Escanea carpeta → lista_pendiente.txt + processing_queue.json",
    )
    parser.add_argument("--folder", default=str(DEFAULT_FOLDER))
    parser.add_argument("--out", default=str(DEFAULT_LISTA), help="lista_pendiente.txt")
    parser.add_argument("--queue", default=str(DEFAULT_QUEUE), help="processing_queue.json")
    parser.add_argument("--recursive", action="store_true")
    parser.add_argument(
        "--reset-stuck",
        action="store_true",
        help="Marca items 'processing' como 'pending' (recuperación de crash)",
    )
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    queue_path = Path(args.queue).expanduser().resolve()

    encontrados = escanear(folder, args.recursive)
    out.write_text(
        "# lista_pendiente.txt — una ruta absoluta por línea\n"
        + "\n".join(str(p) for p in encontrados)
        + ("\n" if encontrados else ""),
        encoding="utf-8",
    )

    stats = merge_queue(queue_path, folder, encontrados, reset_stuck=args.reset_stuck)

    print("━" * 54)
    print("  PASO A — COLA DE PROCESAMIENTO")
    print("━" * 54)
    print(f"  Carpeta:     {folder}")
    print(f"  Escaneados:  {len(encontrados)}")
    print(f"  Nuevos:      {stats['added']}")
    print(f"  Total cola:  {stats['total']}")
    print(f"  pending:     {stats['pending']}")
    print(f"  done:        {stats['done']}")
    print(f"  failed:      {stats['failed']}")
    print(f"  Lista:       {out}")
    print(f"  Queue JSON:  {queue_path}")
    print("━" * 54)
    print("  Siguiente:")
    print("  python scripts/procesador_industrial.py --workers 8")
    print("━" * 54)


if __name__ == "__main__":
    main()
