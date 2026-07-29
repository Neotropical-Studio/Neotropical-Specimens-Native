#!/usr/bin/env python3
"""
Procesador de assets en lote: eliminación de fondo + subida a Cloudinary + registro en Supabase.

Uso:
    python scripts/process_assets_bg.py --input /ruta/carpeta/fotos [--dry-run] [--min-sharpness 80]

Convención de nombres de archivo:
    {CODE}[_{vista}].{ext}

    Vista (sufijo opcional):
        _d / _dorsal   → dorsal (default si no hay sufijo)
        _v / _ventral  → ventral
        _l / _lateral  → lateral
        _m / _macro    → macro

    Extensiones aceptadas:
        .jpg / .jpeg / .png / .tiff / .bmp / .webp  → foto (rembg → WebP sin fondo)
        .glb / .gltf                                 → modelo 3D (subida directa)
        .mp4 / .mov                                  → video (subida directa)

    Ejemplo: BR-001_dorsal.jpg  →  code=BR-001, vista=dorsal, tipo=image
             NEO-4421.glb       →  code=NEO-4421, tipo=model
             HE-032.mp4         →  code=HE-032, tipo=video

Dependencias extras (añadir a requirements-migrate.txt):
    rembg==2.0.65
    opencv-python-headless==4.10.0.84
"""
from __future__ import annotations

import argparse
import io
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import NamedTuple

# ── External deps ──────────────────────────────────────────────────────────────
try:
    import cv2
    import numpy as np
    from PIL import Image
    from rembg import new_session, remove as rembg_remove
    import cloudinary
    import cloudinary.uploader
    from supabase import create_client, Client
    from dotenv import load_dotenv
except ImportError as e:
    sys.exit(f"Dependencia faltante: {e}\nEjecuta: pip install rembg opencv-python-headless pillow cloudinary supabase python-dotenv")

# ── Config ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("process_assets")

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

IMAGE_EXT   = {".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".webp"}
MODEL_EXT   = {".glb", ".gltf"}
VIDEO_EXT   = {".mp4", ".mov"}

CLOUDINARY_FOLDER = "especimenes-secos/neotropical"
RATE_LIMIT_S      = 0.15   # ~400 req/min

# ── QC: sharpness via Laplacian variance ───────────────────────────────────────

def sharpness_score(image_bytes: bytes) -> float:
    """Laplacian variance — >80 aceptable, >150 nítido."""
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    return float(cv2.Laplacian(img, cv2.CV_64F).var())


def qc_label(score: float) -> str:
    if score >= 150:
        return "A1"
    if score >= 80:
        return "A-"
    return "X"


# ── Filename parser ─────────────────────────────────────────────────────────────

VIEW_ALIASES = {
    "d": "dorsal", "dorsal": "dorsal",
    "v": "ventral", "ventral": "ventral",
    "l": "lateral", "lateral": "lateral",
    "m": "macro",   "macro": "macro",
}

class ParsedFile(NamedTuple):
    code:      str
    view:      str          # dorsal / ventral / lateral / macro
    media_type: str         # image / model / video
    path:      Path


def parse_filename(p: Path) -> ParsedFile | None:
    ext = p.suffix.lower()
    if ext in IMAGE_EXT:
        media_type = "image"
    elif ext in MODEL_EXT:
        media_type = "model"
    elif ext in VIDEO_EXT:
        media_type = "video"
    else:
        return None

    stem = p.stem  # e.g. "BR-001_dorsal"
    m = re.match(r"^([A-Za-z]{2,4}-\d{3,4})(?:_([a-z]+))?$", stem, re.IGNORECASE)
    if not m:
        log.warning("  Nombre no reconocido: %s  (esperado: CODE[_view])", p.name)
        return None

    code = m.group(1).upper()
    view_raw = (m.group(2) or "").lower()
    view = VIEW_ALIASES.get(view_raw, "dorsal")

    return ParsedFile(code=code, view=view, media_type=media_type, path=p)


# ── Background removal ─────────────────────────────────────────────────────────

_rembg_session = None

def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        log.info("Cargando modelo rembg (u2net) — primera vez ~30 s…")
        _rembg_session = new_session("u2net")
    return _rembg_session


def remove_background(image_bytes: bytes) -> bytes:
    """Devuelve bytes WebP con fondo transparente."""
    out_bytes = rembg_remove(image_bytes, session=get_rembg_session())
    img = Image.open(io.BytesIO(out_bytes)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=90, method=6)
    return buf.getvalue()


# ── Cloudinary upload ──────────────────────────────────────────────────────────

def upload_asset(data: bytes, public_id: str, resource_type: str) -> str:
    """Sube a Cloudinary y devuelve el public_id resultante."""
    result = cloudinary.uploader.upload(
        data,
        public_id=public_id,
        folder=CLOUDINARY_FOLDER,
        resource_type=resource_type,
        overwrite=True,
        invalidate=True,
        use_filename=False,
        unique_filename=False,
    )
    return str(result["public_id"])


# ── Supabase helpers ───────────────────────────────────────────────────────────

def get_specimen_id(sb: Client, code: str) -> str | None:
    res = (
        sb.table("specimens")
        .select("id")
        .eq("metadata->>code", code)
        .limit(1)
        .execute()
    )
    if res.data:
        return str(res.data[0]["id"])
    # Fallback: specimen_code column (legacy)
    res2 = (
        sb.table("specimens")
        .select("id")
        .eq("specimen_code", code)
        .limit(1)
        .execute()
    )
    return str(res2.data[0]["id"]) if res2.data else None


def upsert_media(sb: Client, specimen_id: str, public_id: str,
                 media_type: str, view: str, display_order: int) -> None:
    sb.table("specimen_media").upsert(
        {
            "specimen_id":   specimen_id,
            "media_type":    media_type,
            "media_url":     f"https://res.cloudinary.com/{os.getenv('CLOUDINARY_CLOUD_NAME')}/image/upload/{public_id}",
            "public_id":     public_id,
            "display_order": display_order,
        },
        on_conflict="public_id",
    ).execute()


# ── Main pipeline ──────────────────────────────────────────────────────────────

DISPLAY_ORDER = {"dorsal": 0, "ventral": 1, "lateral": 2, "macro": 3}


def process_file(pf: ParsedFile, sb: Client, min_sharpness: float, dry_run: bool) -> dict:
    result = {
        "file":  pf.path.name,
        "code":  pf.code,
        "view":  pf.view,
        "type":  pf.media_type,
        "qc":    None,
        "status": None,
        "public_id": None,
    }

    raw = pf.path.read_bytes()

    # ── QC para imágenes ───────────────────────────────────────────────────────
    if pf.media_type == "image":
        score = sharpness_score(raw)
        label = qc_label(score)
        result["qc"] = {"score": round(score, 1), "label": label}
        if score < min_sharpness:
            result["status"] = f"RECHAZADO_QC  score={score:.1f} < {min_sharpness}"
            log.warning("  ⚠  %s  QC=%s  score=%.1f  → OMITIDO", pf.path.name, label, score)
            return result

    # ── Lookup de espécimen ────────────────────────────────────────────────────
    specimen_id = get_specimen_id(sb, pf.code) if not dry_run else f"DRY_{pf.code}"
    if not dry_run and not specimen_id:
        result["status"] = "ERROR_SPECIMEN_NO_ENCONTRADO"
        log.error("  ✘  %s  → Espécimen %s no existe en Supabase", pf.path.name, pf.code)
        return result

    public_id_base = f"{pf.code}_{pf.view}"

    if dry_run:
        qc_info = f"  QC={result['qc']['label']}" if result["qc"] else ""
        log.info("  DRY  %s  →  %s / %s%s", pf.path.name, pf.media_type, pf.view, qc_info)
        result["status"] = "DRY_RUN_OK"
        return result

    # ── Procesamiento según tipo ───────────────────────────────────────────────
    if pf.media_type == "image":
        log.info("  🎯  Eliminando fondo: %s", pf.path.name)
        processed = remove_background(raw)
        resource_type = "image"
    elif pf.media_type == "model":
        processed = raw
        resource_type = "raw"
    else:  # video
        processed = raw
        resource_type = "video"

    # ── Subida a Cloudinary ────────────────────────────────────────────────────
    log.info("  ☁  Subiendo a Cloudinary: %s", public_id_base)
    public_id = upload_asset(processed, public_id_base, resource_type)
    time.sleep(RATE_LIMIT_S)

    # ── Registro en Supabase ───────────────────────────────────────────────────
    order = DISPLAY_ORDER.get(pf.view, 9)
    upsert_media(sb, specimen_id, public_id, pf.media_type, pf.view, order)
    time.sleep(RATE_LIMIT_S)

    result["public_id"] = public_id
    result["status"] = "OK"
    log.info("  ✔  %s  →  %s", pf.path.name, public_id)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Procesa assets de especímenes: QC + rembg + Cloudinary + Supabase")
    parser.add_argument("--input",         required=True, help="Carpeta con los archivos a procesar")
    parser.add_argument("--dry-run",       action="store_true", help="Parsear y validar sin subir nada")
    parser.add_argument("--min-sharpness", type=float, default=80.0,
                        help="Umbral mínimo de nitidez Laplacian (default 80). Fotos por debajo se rechazan")
    parser.add_argument("--recursive",     action="store_true", help="Buscar en subcarpetas")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_dir():
        sys.exit(f"Carpeta no encontrada: {input_path}")

    # Conectar Supabase (solo si no es dry-run)
    sb: Client | None = None
    if not args.dry_run:
        if not SUPABASE_URL or not SUPABASE_KEY:
            sys.exit("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local")
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Recopilar archivos
    glob_fn = input_path.rglob if args.recursive else input_path.glob
    all_files = sorted(glob_fn("*.*"))
    parsed = [pf for f in all_files if (pf := parse_filename(f)) is not None]

    log.info("Archivos detectados: %d  /  reconocidos: %d", len(all_files), len(parsed))
    if not parsed:
        log.warning("Ningún archivo con el formato {CODE}[_{vista}].ext. Revisa los nombres.")
        return

    results = []
    ok = rejected = errors = 0

    for pf in parsed:
        r = process_file(pf, sb, args.min_sharpness, args.dry_run)
        results.append(r)
        if r["status"] == "OK" or r["status"] == "DRY_RUN_OK":
            ok += 1
        elif "RECHAZADO" in (r["status"] or ""):
            rejected += 1
        else:
            errors += 1

    # Informe final
    report_path = input_path / "informe_procesamiento.json"
    report_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"  ✔ Procesados exitosamente:  {ok}")
    print(f"  ⚠ Rechazados por QC:        {rejected}")
    print(f"  ✘ Errores:                   {errors}")
    print(f"  Informe guardado en:         {report_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
