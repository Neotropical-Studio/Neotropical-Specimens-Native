#!/usr/bin/env python3
"""
Procesador de assets en lote — calidad quirúrgica.
QC + eliminación de fondo (Adobe Express / Firefly API) + resize/sharpen/WebP + Cloudinary + Supabase.

─── MÉTODOS DE REMOCIÓN DE FONDO ────────────────────────────────────────────
  --method adobe      (DEFAULT) Adobe Firefly Remove Background API.
                      La misma IA de Adobe Express — calidad quirúrgica para
                      bordes ultrafinos: antenas, venas de alas, translucidez.
                      GRATIS con cuenta developer en developer.adobe.com
                      Requiere en .env.local:
                          ADOBE_CLIENT_ID=...
                          ADOBE_CLIENT_SECRET=...
                      Obtén las claves GRATIS:
                          1. https://developer.adobe.com/console/
                          2. Crear proyecto → Agregar API → Firefly Services
                          3. Copiar Client ID y Client Secret

  --method birefnet   IA local BiRefNet — gratis, sin límite, sin internet.
                      Buena alternativa offline.

  --method cloudinary Cloudinary AI — integrado en el stack, sin costo extra.

─── CONVENCIÓN DE NOMBRES ───────────────────────────────────────────────────
  {CODE}[_{vista}].{ext}
  BR-001_dorsal.jpg  →  code=BR-001, vista=dorsal, tipo=image
  NEO-4421.glb       →  code=NEO-4421,             tipo=model
  HE-032.mp4         →  code=HE-032,               tipo=video

─── POST-PROCESO AUTOMÁTICO (imágenes) ──────────────────────────────────────
  1. QC sharpness (Laplacian variance) — rechaza fotos borrosas
  2. Eliminación de fondo con Adobe Firefly → PNG RGBA
  3. Resize: máx 1 500 px en el lado mayor, preserva aspect ratio
  4. Sharpen: unsharp mask para compensar la interpolación del resize
  5. Exporta WebP alpha calidad 92 — fondo transparente preservado
─────────────────────────────────────────────────────────────────────────────
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
    from PIL import Image, ImageFilter
    from rembg import new_session, remove as rembg_remove
    import cloudinary
    import cloudinary.uploader
    from supabase import create_client, Client
    from dotenv import load_dotenv
except ImportError as e:
    sys.exit(
        f"Dependencia faltante: {e}\n"
        "Ejecuta: pip install 'rembg[gpu]' opencv-python-headless pillow "
        "cloudinary supabase python-dotenv requests"
    )

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


# ── Post-proceso: resize + sharpen + WebP ──────────────────────────────────────
MAX_SIDE_PX = 1500   # resolución máxima — preserva aspect ratio

def optimize_rgba(img: "Image.Image") -> "Image.Image":
    """Resize al límite MAX_SIDE_PX y aplica unsharp mask sutil."""
    w, h = img.size
    if max(w, h) > MAX_SIDE_PX:
        ratio = MAX_SIDE_PX / max(w, h)
        img = img.resize(
            (max(1, round(w * ratio)), max(1, round(h * ratio))),
            Image.LANCZOS,
        )
    # Unsharp mask: compensa el ligero blur del resize; no sobreagudizar
    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=60, threshold=3))
    return img


def to_webp(img: "Image.Image") -> bytes:
    """Exporta RGBA → WebP con canal alfa, calidad 92."""
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=92, method=6, lossless=False)
    return buf.getvalue()


# ── Background removal ─────────────────────────────────────────────────────────
# Tres métodos intercambiables:
#   birefnet  — local AI (BiRefNet), mejor calidad para insectos (gratis, sin límite)
#   removebg  — API remove.bg (50/mes gratis, luego ~$0.10/img)
#   cloudinary — Cloudinary AI (integrado, sin costo adicional en el plan)

_rembg_session: dict = {}   # cache por nombre de modelo

def _get_session(model: str):
    if model not in _rembg_session:
        log.info("Cargando modelo rembg '%s' — primera vez puede tardar…", model)
        _rembg_session[model] = new_session(model)
    return _rembg_session[model]


# ── Adobe Firefly API ──────────────────────────────────────────────────────────
# La misma IA que usa Adobe Express en https://adobe.com/es/express/feature/image/remove-background
# Cuenta developer GRATIS: https://developer.adobe.com/console/
# Plan gratuito incluye créditos generativos mensuales suficientes para uso regular.

ADOBE_IMS_URL      = "https://ims-na1.adobelogin.com/ims/token/v3"
ADOBE_FIREFLY_URL  = "https://firefly-api.adobe.io/v3/images/apply-auto-cutout"
ADOBE_UPLOAD_URL   = "https://firefly-api.adobe.io/v2/storage/image"

_adobe_token_cache: dict = {}   # {"token": str, "expires_at": float}


def _get_adobe_token() -> str:
    """Obtiene (y cachea) un access token de Adobe IMS con client_credentials."""
    import requests, time as _time
    now = _time.time()
    if _adobe_token_cache.get("token") and _adobe_token_cache.get("expires_at", 0) > now + 30:
        return str(_adobe_token_cache["token"])

    client_id     = os.getenv("ADOBE_CLIENT_ID",     "")
    client_secret = os.getenv("ADOBE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise ValueError(
            "\nADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET no encontrados en .env.local\n\n"
            "Para obtenerlos GRATIS:\n"
            "  1. Ve a https://developer.adobe.com/console/\n"
            "  2. Crear nuevo proyecto → Agregar API → Firefly Services\n"
            "  3. Elegir 'Server-to-server' → OAuth\n"
            "  4. Copia Client ID y Client Secret → añádelos a .env.local\n"
        )

    resp = requests.post(
        ADOBE_IMS_URL,
        data={
            "grant_type":    "client_credentials",
            "client_id":     client_id,
            "client_secret": client_secret,
            "scope":         "openid,AdobeID,firefly_enterprise,firefly_api",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Adobe IMS auth error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    token = str(data["access_token"])
    expires_in = int(data.get("expires_in", 3600))
    _adobe_token_cache["token"]      = token
    _adobe_token_cache["expires_at"] = _time.time() + expires_in
    return token


def remove_background_adobe(image_bytes: bytes) -> bytes:
    """
    Adobe Firefly Remove Background — misma calidad que Adobe Express.
    Gratis con cuenta developer.adobe.com.

    Flujo:
      1. Sube la imagen a Adobe Firefly Storage (presigned)
      2. Llama al endpoint apply-auto-cutout
      3. Descarga el resultado PNG RGBA
      4. Optimiza y exporta WebP con alpha
    """
    import requests
    token     = _get_adobe_token()
    client_id = os.getenv("ADOBE_CLIENT_ID", "")
    headers   = {
        "Authorization": f"Bearer {token}",
        "x-api-key":     client_id,
    }

    # ── Paso 1: subir imagen a Firefly Storage ─────────────────────────────
    # Detectar mime type
    img_check = Image.open(io.BytesIO(image_bytes))
    mime = "image/jpeg" if img_check.format in ("JPEG", "JPG") else "image/png"

    upload_resp = requests.post(
        ADOBE_UPLOAD_URL,
        headers={**headers, "Content-Type": mime},
        data=image_bytes,
        timeout=60,
    )
    if upload_resp.status_code not in (200, 201):
        raise RuntimeError(f"Adobe upload error {upload_resp.status_code}: {upload_resp.text[:300]}")

    upload_id = upload_resp.json().get("images", [{}])[0].get("id") or upload_resp.json().get("id")
    if not upload_id:
        raise RuntimeError(f"Adobe upload: no se recibió upload ID. Respuesta: {upload_resp.text[:200]}")

    # ── Paso 2: aplicar remove background ─────────────────────────────────
    cutout_resp = requests.post(
        ADOBE_FIREFLY_URL,
        headers={**headers, "Content-Type": "application/json"},
        json={"image": {"source": {"uploadId": upload_id}}},
        timeout=120,
    )
    if cutout_resp.status_code not in (200, 201):
        raise RuntimeError(f"Adobe Firefly cutout error {cutout_resp.status_code}: {cutout_resp.text[:300]}")

    result_data = cutout_resp.json()
    # La respuesta puede traer la imagen como URL o como base64
    output = result_data.get("images", [{}])[0] if result_data.get("images") else result_data

    # ── Paso 3: descargar resultado ────────────────────────────────────────
    if "presignedUrl" in output:
        dl = requests.get(output["presignedUrl"], timeout=60)
        result_bytes = dl.content
    elif "url" in output:
        dl = requests.get(output["url"], timeout=60)
        result_bytes = dl.content
    elif output.get("base64"):
        import base64 as _b64
        result_bytes = _b64.b64decode(output["base64"])
    else:
        raise RuntimeError(f"Adobe Firefly: respuesta inesperada — {str(result_data)[:300]}")

    img = optimize_rgba(Image.open(io.BytesIO(result_bytes)).convert("RGBA"))
    return to_webp(img)


# ── Otros métodos (fallbacks) ──────────────────────────────────────────────────

def remove_background_birefnet(image_bytes: bytes) -> bytes:
    """BiRefNet — IA local, gratis, sin límite. Alternativa offline."""
    session = _get_session("birefnet-general")
    out = rembg_remove(image_bytes, session=session)
    img = optimize_rgba(Image.open(io.BytesIO(out)).convert("RGBA"))
    return to_webp(img)


def remove_background_cloudinary(image_bytes: bytes) -> bytes:
    """Cloudinary AI — transformación en la subida. Sin costo extra en el plan."""
    img = optimize_rgba(Image.open(io.BytesIO(image_bytes)).convert("RGBA"))
    return to_webp(img)


def remove_background(image_bytes: bytes, method: str = "adobe") -> bytes:
    """Enrutador de método. Default: adobe (Adobe Firefly — misma IA que Adobe Express)."""
    if method == "birefnet":
        return remove_background_birefnet(image_bytes)
    if method == "cloudinary":
        return remove_background_cloudinary(image_bytes)
    return remove_background_adobe(image_bytes)  # default: adobe


# ── Cloudinary upload ──────────────────────────────────────────────────────────

def upload_asset(data: bytes, public_id: str, resource_type: str,
                 bg_transform: list | None = None) -> str:
    """Sube a Cloudinary y devuelve el public_id resultante."""
    kwargs: dict = dict(
        public_id=public_id,
        folder=CLOUDINARY_FOLDER,
        resource_type=resource_type,
        overwrite=True,
        invalidate=True,
        use_filename=False,
        unique_filename=False,
    )
    if bg_transform:
        kwargs["transformation"] = bg_transform
    result = cloudinary.uploader.upload(data, **kwargs)
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


def process_file(pf: ParsedFile, sb: Client, min_sharpness: float,
                 dry_run: bool, method: str = "birefnet") -> dict:
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
        log.info("  🎯  [%s] Eliminando fondo: %s", method.upper(), pf.path.name)
        if method == "cloudinary":
            # Optimiza local; la remoción ocurre en Cloudinary vía transformación
            img = optimize_rgba(Image.open(io.BytesIO(raw)).convert("RGBA"))
            processed = to_webp(img)
        else:
            processed = remove_background(raw, method=method)
        resource_type = "image"
    elif pf.media_type == "model":
        processed = raw
        resource_type = "raw"
    else:  # video
        processed = raw
        resource_type = "video"

    # ── Subida a Cloudinary ────────────────────────────────────────────────────
    log.info("  ☁  Subiendo a Cloudinary: %s", public_id_base)
    # Si el método es cloudinary, aplica transformación AI en la subida
    bg_transform = [{"effect": "background_removal"}] if method == "cloudinary" and pf.media_type == "image" else None
    public_id = upload_asset(processed, public_id_base, resource_type, bg_transform=bg_transform)
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
    parser = argparse.ArgumentParser(
        description="Procesa assets: QC + Adobe Firefly Remove BG + Cloudinary + Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
MÉTODOS DE REMOCIÓN:
  adobe      (DEFAULT) Adobe Firefly API — misma IA que Adobe Express.
             Requiere ADOBE_CLIENT_ID + ADOBE_CLIENT_SECRET en .env.local
             Cuenta gratuita: https://developer.adobe.com/console/
  birefnet   IA local BiRefNet — gratis, sin límite, sin internet
  cloudinary Cloudinary AI — usa el plan existente, sin costo extra

EJEMPLOS:
  # Adobe Express IA (recomendado):
  python scripts/process_assets_bg.py --input ~/fotos/morpho

  # Alternativa offline:
  python scripts/process_assets_bg.py --input ~/fotos --method birefnet

  # Explorar sin subir nada:
  python scripts/process_assets_bg.py --input ~/fotos --dry-run
        """,
    )
    parser.add_argument("--input",         required=True, help="Carpeta con los archivos a procesar")
    parser.add_argument("--dry-run",       action="store_true", help="Parsear y validar sin subir nada")
    parser.add_argument("--min-sharpness", type=float, default=80.0,
                        help="Umbral mínimo de nitidez Laplacian (default 80). Fotos borrosas se rechazan")
    parser.add_argument("--recursive",     action="store_true", help="Buscar en subcarpetas")
    parser.add_argument(
        "--method",
        choices=["adobe", "birefnet", "cloudinary"],
        default="adobe",
        help="Método de remoción de fondo (default: adobe — Adobe Firefly, misma IA que Adobe Express)",
    )
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

    METHOD_LABEL = {
        "adobe":      "Adobe Firefly Remove Background (misma IA que Adobe Express) ✦",
        "birefnet":   "BiRefNet local (gratis, offline)",
        "cloudinary": "Cloudinary AI",
    }
    log.info("Método de remoción: %s", METHOD_LABEL.get(args.method, args.method))

    for pf in parsed:
        r = process_file(pf, sb, args.min_sharpness, args.dry_run, method=args.method)
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
