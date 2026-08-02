#!/usr/bin/env python3
"""
auto_studio_daemon.py — Estudio automático sin vigilancia.

Dejá archivos en hot_folder/ y este proceso hace el trabajo solo:
  • foto  → QC + cutout + sharpen + WebP + Cloudinary (process_assets_bg)
  • video → sube optimizado vía procesador industrial / Cloudinary
  • .glb/.gltf/.usdz → modelo 3D (raw) etiquetado

Uso (dejar corriendo en segundo plano):
  source .venv-ingest/bin/activate   # o scripts/.venv
  python scripts/auto_studio_daemon.py
  python scripts/auto_studio_daemon.py --interval 20 --method cloudinary

No hace falta mirar la pantalla: log → auto_studio.log
Fallos → revision_humana/
Listos → procesados_finales/
"""
from __future__ import annotations

import argparse
import logging
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOT = ROOT / "hot_folder"
DONE = ROOT / "procesados_finales"
REVISION = ROOT / "revision_humana"
LOG = ROOT / "auto_studio.log"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".bmp"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v", ".mkv"}
MODEL_EXT = {".glb", ".gltf", ".usdz"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG, encoding="utf-8"),
    ],
)
log = logging.getLogger("auto_studio")


def ensure_dirs() -> None:
    for d in (HOT, DONE, REVISION):
        d.mkdir(parents=True, exist_ok=True)


def list_ready_files(min_age_s: float = 2.0) -> list[Path]:
    """Archivos estables (no en medio de una copia)."""
    now = time.time()
    out: list[Path] = []
    for p in sorted(HOT.iterdir()):
        if not p.is_file() or p.name.startswith("."):
            continue
        try:
            if now - p.stat().st_mtime < min_age_s:
                continue
        except OSError:
            continue
        out.append(p)
    return out


def run_bg_batch(method: str) -> int:
    """Procesa el lote de imágenes actuales con process_assets_bg."""
    script = ROOT / "scripts" / "process_assets_bg.py"
    if not script.exists():
        log.error("Falta scripts/process_assets_bg.py")
        return 1
    py = sys.executable
    cmd = [
        py,
        str(script),
        "--input",
        str(HOT),
        "--method",
        method,
    ]
    log.info("Fotos → process_assets_bg (%s)", method)
    proc = subprocess.run(cmd, cwd=str(ROOT))
    return proc.returncode


def run_industrial_once() -> int:
    """Cola industrial (videos / resto) si existe processing_queue.json."""
    script = ROOT / "scripts" / "procesador_industrial.py"
    queue = ROOT / "processing_queue.json"
    if not script.exists() or not queue.exists():
        return 0
    log.info("Cola industrial → procesador_industrial.py")
    proc = subprocess.run([sys.executable, str(script), "--batch", "25"], cwd=str(ROOT))
    return proc.returncode


def classify(files: list[Path]) -> dict[str, list[Path]]:
    buckets = {"image": [], "video": [], "model": [], "other": []}
    for p in files:
        ext = p.suffix.lower()
        if ext in IMAGE_EXT:
            buckets["image"].append(p)
        elif ext in VIDEO_EXT:
            buckets["video"].append(p)
        elif ext in MODEL_EXT:
            buckets["model"].append(p)
        else:
            buckets["other"].append(p)
    return buckets


def flag_other(path: Path) -> None:
    REVISION.mkdir(parents=True, exist_ok=True)
    dest = REVISION / path.name
    try:
        path.rename(dest)
    except OSError:
        import shutil

        shutil.move(str(path), str(dest))
    log.warning("Tipo no soportado → revision_humana/%s", dest.name)


def tick(method: str) -> None:
    files = list_ready_files()
    if not files:
        return
    buckets = classify(files)
    log.info(
        "Lote: %d foto · %d video · %d 3D · %d otros",
        len(buckets["image"]),
        len(buckets["video"]),
        len(buckets["model"]),
        len(buckets["other"]),
    )
    for p in buckets["other"]:
        flag_other(p)

    # Imágenes: pipeline quirúrgico (Adobe/BiRefNet/Cloudinary)
    if buckets["image"]:
        rc = run_bg_batch(method)
        if rc != 0:
            log.error("process_assets_bg exit=%s (sigue el daemon)", rc)

    # Videos / 3D: si hay cola industrial la consume; si no, deja aviso
    if buckets["video"] or buckets["model"]:
        # Encolar nombres simples en processing_queue si el industrial lo usa
        # Fallback: mover a revision con nota "usar Multimedia GRABAR" si no hay cola.
        q = ROOT / "processing_queue.json"
        if q.exists():
            run_industrial_once()
        else:
            log.info(
                "Hay video/3D en hot_folder. Subilos por Multimedia (autoStudio) "
                "o generá processing_queue.json con listar_pendientes.py"
            )


def main() -> int:
    ap = argparse.ArgumentParser(description="Daemon estudio automático (hot_folder)")
    ap.add_argument("--interval", type=int, default=15, help="Segundos entre barridos")
    ap.add_argument(
        "--method",
        choices=["adobe", "birefnet", "cloudinary"],
        default=os.getenv("AUTO_STUDIO_BG_METHOD", "cloudinary"),
        help="Cutout: cloudinary (default stack) | adobe | birefnet",
    )
    ap.add_argument("--once", action="store_true", help="Un solo barrido y salir")
    args = ap.parse_args()

    ensure_dirs()
    log.info(
        "Auto Studio ON · hot_folder=%s · method=%s · interval=%ss",
        HOT,
        args.method,
        args.interval,
    )
    log.info("Soltá fotos / video Blender / .glb acá. No hace falta mirar.")

    if args.once:
        tick(args.method)
        return 0

    while True:
        try:
            tick(args.method)
        except KeyboardInterrupt:
            log.info("Daemon detenido")
            return 0
        except Exception as e:
            log.exception("Error en tick (continúa): %s", e)
        time.sleep(max(5, args.interval))


if __name__ == "__main__":
    raise SystemExit(main())
