#!/usr/bin/env python3
"""
processor.py — Pipeline industrial de procesamiento de especímenes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FLUJO:
  archivo local → Cloudinary (Adobe Sensei/Firefly remove-bg) → URL limpia
               → Supabase tabla specimens / especimenes → log detallado

USO:
  # Un solo archivo:
  python scripts/processor.py BR-001_dorsal.jpg

  # Varios archivos:
  python scripts/processor.py BR-001_dorsal.jpg BR-002_ventral.png MO-015.jpg

  # Código de espécimen explícito (si el nombre no sigue la convención):
  python scripts/processor.py foto.jpg --code BR-001 --view dorsal

  # Solo subir, sin guardar en Supabase:
  python scripts/processor.py BR-001.jpg --no-db

  # Ver el resultado sin subir nada:
  python scripts/processor.py BR-001.jpg --dry-run

VARIABLES DE ENTORNO (.env.local en la raíz del proyecto):
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  NEXT_PUBLIC_SUPABASE_URL   (o SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY  (o SUPABASE_KEY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from pathlib import Path

# ── Cargar .env.local ─────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env.local")
    load_dotenv(ROOT / ".env")          # fallback
except ImportError:
    sys.exit("Falta python-dotenv.  Ejecuta: pip install python-dotenv")

# ── Dependencias externas ─────────────────────────────────────────────────────
try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
except ImportError:
    sys.exit("Falta cloudinary.  Ejecuta: pip install cloudinary")

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("Falta supabase-py.  Ejecuta: pip install supabase")

# ── Logging con colores ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("processor")

# ── Configurar Cloudinary ─────────────────────────────────────────────────────
CLOUD_NAME  = os.getenv("CLOUDINARY_CLOUD_NAME",  "")
API_KEY     = os.getenv("CLOUDINARY_API_KEY",     "")
API_SECRET  = os.getenv("CLOUDINARY_API_SECRET",  "")

if not all([CLOUD_NAME, API_KEY, API_SECRET]):
    sys.exit(
        "Faltan credenciales de Cloudinary en .env.local:\n"
        "  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    )

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET,
    secure=True,
)
log.info("Cloudinary configurado: cloud=%s", CLOUD_NAME)

# ── Configurar Supabase ───────────────────────────────────────────────────────
SUPABASE_URL = (
    os.getenv("NEXT_PUBLIC_SUPABASE_URL") or
    os.getenv("SUPABASE_URL", "")
)
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or
    os.getenv("SUPABASE_KEY", "")
)

# ── Constantes ────────────────────────────────────────────────────────────────
CLOUDINARY_FOLDER = "especimenes-secos/neotropical"
POLL_INTERVAL_S   = 3      # segundos entre polls del estado de Adobe
POLL_MAX_ATTEMPTS = 20     # máx 20 × 3s = 60s esperando a Adobe

VIEW_ALIASES: dict[str, str] = {
    "d": "dorsal",  "dorsal":  "dorsal",
    "v": "ventral", "ventral": "ventral",
    "l": "lateral", "lateral": "lateral",
    "m": "macro",   "macro":   "macro",
}

DISPLAY_ORDER: dict[str, int] = {
    "dorsal": 0, "ventral": 1, "lateral": 2, "macro": 3,
}

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp"}
MODEL_EXT = {".glb", ".gltf"}
VIDEO_EXT = {".mp4", ".mov"}

# ── Parsear código/vista desde el nombre del archivo ─────────────────────────

def parse_code_view(path: Path) -> tuple[str, str] | None:
    """
    Extrae (code, view) desde el nombre.
    Ejemplos:
      BR-001_dorsal.jpg  → ('BR-001', 'dorsal')
      BR-001.jpg         → ('BR-001', 'dorsal')   # default dorsal
      MO-015_v.png       → ('MO-015', 'ventral')
    """
    stem = path.stem
    m = re.match(r"^([A-Za-z]{2,4}-\d{3,4})(?:_([a-zA-Z]+))?$", stem)
    if not m:
        return None
    code     = m.group(1).upper()
    view_raw = (m.group(2) or "").lower()
    view     = VIEW_ALIASES.get(view_raw, "dorsal")
    return code, view

# ── Subida a Cloudinary con Adobe Sensei background removal ──────────────────

def upload_to_cloudinary(
    file_path: Path,
    code: str,
    view: str,
    dry_run: bool = False,
) -> dict:
    """
    Sube el archivo a Cloudinary activando Adobe Sensei/Firefly Remove Background.

    Cloudinary background_removal='cloudinary_ai' usa el motor Adobe Sensei:
    el mismo que impulsa Adobe Express Remove Background.

    Retorna un dict con:
      public_id, secure_url, bg_status, resource_type, bytes
    """
    ext = file_path.suffix.lower()

    if ext in MODEL_EXT:
        resource_type = "raw"
        apply_bg      = False
    elif ext in VIDEO_EXT:
        resource_type = "video"
        apply_bg      = False
    else:
        resource_type = "image"
        apply_bg      = True

    public_id = f"{code}_{view}"

    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    log.info("  Archivo:        %s", file_path.name)
    log.info("  Código:         %s", code)
    log.info("  Vista:          %s", view)
    log.info("  Tipo:           %s", resource_type)
    log.info("  Remove-BG:      %s", "Adobe Sensei/Firefly ✦" if apply_bg else "N/A")
    log.info("  Public ID:      %s/%s", CLOUDINARY_FOLDER, public_id)

    if dry_run:
        log.info("  [DRY-RUN] No se sube nada.")
        return {
            "public_id":    f"{CLOUDINARY_FOLDER}/{public_id}",
            "secure_url":   f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{CLOUDINARY_FOLDER}/{public_id}",
            "bg_status":    "dry_run",
            "resource_type": resource_type,
            "bytes":        file_path.stat().st_size,
        }

    # ── Parámetros de subida ──────────────────────────────────────────────────
    upload_params: dict = {
        "public_id":       public_id,
        "folder":          CLOUDINARY_FOLDER,
        "resource_type":   resource_type,
        "overwrite":       True,
        "invalidate":      True,
        "use_filename":    False,
        "unique_filename": False,
    }

    if apply_bg:
        # background_removal='cloudinary_ai' activa Adobe Sensei en la subida.
        # El procesamiento es ASÍNCRONO — la imagen llega primero sin recorte,
        # luego Cloudinary/Adobe la procesa y actualiza el asset.
        upload_params["background_removal"] = "cloudinary_ai"
        log.info("  ▶ Iniciando subida con Adobe Sensei Remove Background…")
    else:
        log.info("  ▶ Subiendo %s…", resource_type)

    t0     = time.monotonic()
    result = cloudinary.uploader.upload(str(file_path), **upload_params)
    elapsed = time.monotonic() - t0

    public_id_full = str(result["public_id"])
    secure_url     = str(result["secure_url"])
    file_bytes     = int(result.get("bytes", 0))

    log.info("  ✔ Subida OK  (%.1fs)  %d KB", elapsed, file_bytes // 1024)
    log.info("  Public ID:  %s", public_id_full)
    log.info("  URL:        %s", secure_url)

    # ── Polling del estado de Adobe Sensei ────────────────────────────────────
    bg_status = "not_applicable"
    if apply_bg:
        bg_status = _poll_adobe_status(public_id_full)

    return {
        "public_id":     public_id_full,
        "secure_url":    secure_url,
        "bg_status":     bg_status,
        "resource_type": resource_type,
        "bytes":         file_bytes,
    }


def _poll_adobe_status(public_id: str) -> str:
    """
    Espera a que Adobe Sensei termine de procesar el fondo.

    La respuesta de cloudinary.api.resource() incluye:
      info.background_removal.status:
        'pending'   — Adobe está procesando
        'complete'  — recorte exitoso
        'failed'    — falló el recorte

    Retorna el estado final como string.
    """
    log.info("  ⏳ Esperando a Adobe Sensei…")

    for attempt in range(1, POLL_MAX_ATTEMPTS + 1):
        time.sleep(POLL_INTERVAL_S)

        try:
            resource = cloudinary.api.resource(
                public_id,
                image_metadata=True,
                colors=False,
            )
        except Exception as e:
            log.warning("  [poll %d] Error al consultar recurso: %s", attempt, e)
            continue

        bg_info = (
            resource.get("info", {})
            .get("background_removal", {})
        )
        status = bg_info.get("status", "pending")

        if status == "complete":
            log.info(
                "  ✔ Adobe Sensei completado (intento %d / %ds)",
                attempt,
                attempt * POLL_INTERVAL_S,
            )
            log.info("  URL con fondo transparente: %s", resource.get("secure_url", ""))
            return "complete"

        if status == "failed":
            log.error(
                "  ✘ Adobe Sensei FALLÓ  —  error: %s",
                bg_info.get("error", "desconocido"),
            )
            return "failed"

        log.info(
            "  [poll %d/%d] Adobe Sensei: %s…",
            attempt, POLL_MAX_ATTEMPTS, status,
        )

    log.warning(
        "  ⚠ Timeout: Adobe Sensei no respondió en %ds. "
        "El recorte puede completarse después.",
        POLL_MAX_ATTEMPTS * POLL_INTERVAL_S,
    )
    return "timeout"


# ── Guardar en Supabase ───────────────────────────────────────────────────────

def save_to_supabase(
    sb: Client,
    code: str,
    view: str,
    upload_result: dict,
) -> None:
    """
    Registra el asset procesado en Supabase.

    Busca el espécimen por código (metadata->>code o specimen_code),
    luego hace upsert en specimen_media. Si el espécimen no existe,
    lo registra en specimens con los datos mínimos.
    """
    public_id  = upload_result["public_id"]
    secure_url = upload_result["secure_url"]
    bg_status  = upload_result["bg_status"]
    media_type = {
        "image": "photo_webp",
        "video": "video_mp4",
        "raw":   "model_3d_glb",
    }.get(upload_result["resource_type"], upload_result["resource_type"])

    # ── Buscar espécimen por código ───────────────────────────────────────────
    specimen_id: str | None = None

    # 1) metadata->>code (CSV ingested)
    r1 = (
        sb.table("specimens")
        .select("id")
        .eq("metadata->>code", code)
        .limit(1)
        .execute()
    )
    if r1.data:
        specimen_id = str(r1.data[0]["id"])
        log.info("  Espécimen encontrado por metadata.code: %s", specimen_id[:8])

    # 2) specimen_code (legacy)
    if not specimen_id:
        r2 = (
            sb.table("specimens")
            .select("id")
            .eq("specimen_code", code)
            .limit(1)
            .execute()
        )
        if r2.data:
            specimen_id = str(r2.data[0]["id"])
            log.info("  Espécimen encontrado por specimen_code: %s", specimen_id[:8])

    # 3) Crear espécimen mínimo si no existe
    if not specimen_id:
        log.warning("  Espécimen %s no existe — creando registro mínimo…", code)
        ins = (
            sb.table("specimens")
            .insert({
                "specimen_code": code,
                "metadata": {
                    "code":     code,
                    "auto_created": True,
                    "bg_status":    bg_status,
                },
            })
            .execute()
        )
        if ins.data:
            specimen_id = str(ins.data[0]["id"])
            log.info("  Espécimen creado: %s", specimen_id[:8])
        else:
            log.error("  No se pudo crear espécimen %s: %s", code, ins)
            return

    # ── Upsert en specimen_media ──────────────────────────────────────────────
    row = {
        "specimen_id":   specimen_id,
        "public_id":     public_id,
        "media_url":     secure_url,
        "media_type":    media_type,
        "view":          view,
        "display_order": DISPLAY_ORDER.get(view, 9),
    }

    upsert_result = (
        sb.table("specimen_media")
        .upsert(row, on_conflict="public_id")
        .execute()
    )

    if upsert_result.data:
        log.info(
            "  ✔ Supabase OK — specimen_media registrado  [bg: %s]",
            bg_status.upper(),
        )
    else:
        log.error("  ✘ Supabase upsert falló: %s", upsert_result)

    # ── Actualizar metadata del espécimen con estado del recorte Adobe ────────
    (
        sb.table("specimens")
        .update({"metadata": {
            "code":      code,
            "bg_status": bg_status,
            "last_processed": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }})
        .eq("id", specimen_id)
        .execute()
    )
    log.info("  ✔ metadata del espécimen actualizada")


# ── API pública para importación desde vigilante_especimenes.py ───────────────

def procesar_activo(ruta: "str | Path") -> bool:
    """
    Interfaz simple para el vigilante.
    Recibe la ruta del archivo, detecta código/vista del nombre,
    sube a Cloudinary (Adobe Sensei remove-bg) y registra en Supabase.
    Devuelve True si todo fue exitoso.

    Uso desde vigilante_especimenes.py:
        from processor import procesar_activo
        procesar_activo('/ruta/a/BR-001_dorsal.jpg')
    """
    path = Path(ruta)
    # Construir cliente Supabase en cada llamada (thread-safe, sin estado global)
    sb: Client | None = None
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            log.warning("Supabase no disponible: %s — se sube solo a Cloudinary.", e)

    return process(path, code=None, view=None, sb=sb, dry_run=False)


# ── Procesar un archivo ───────────────────────────────────────────────────────

def process(
    file_path: Path,
    code: str | None,
    view: str | None,
    sb: Client | None,
    dry_run: bool,
) -> bool:
    """Procesa un solo archivo: sube + Adobe + Supabase. Devuelve True si OK."""
    if not file_path.exists():
        log.error("Archivo no encontrado: %s", file_path)
        return False

    # Resolver código/vista
    if not code or not view:
        parsed = parse_code_view(file_path)
        if not parsed:
            log.error(
                "No se pudo extraer código del nombre: %s\n"
                "Usa --code y --view para especificarlo manualmente.",
                file_path.name,
            )
            return False
        code, view = parsed

    # Subir a Cloudinary con Adobe Sensei
    try:
        upload_result = upload_to_cloudinary(file_path, code, view, dry_run)
    except Exception as e:
        log.exception("Error en la subida a Cloudinary: %s", e)
        return False

    # Guardar en Supabase
    if sb and not dry_run:
        try:
            save_to_supabase(sb, code, view, upload_result)
        except Exception as e:
            log.exception("Error al guardar en Supabase: %s", e)
            return False
    elif dry_run:
        log.info("  [DRY-RUN] Supabase omitido.")
    else:
        log.info("  [--no-db] Supabase omitido.")

    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return True


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sube especímenes a Cloudinary (Adobe Sensei Remove BG) y registra en Supabase.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EJEMPLOS:
  python scripts/processor.py BR-001_dorsal.jpg
  python scripts/processor.py BR-001_dorsal.jpg BR-002_ventral.png MO-015.jpg
  python scripts/processor.py foto.jpg --code BR-001 --view ventral
  python scripts/processor.py BR-001.jpg --dry-run
  python scripts/processor.py BR-001.jpg --no-db
        """,
    )
    parser.add_argument(
        "files",
        nargs="+",
        help="Archivos a procesar (uno o varios)",
    )
    parser.add_argument(
        "--code",
        default=None,
        help="Código del espécimen (e.g. BR-001). Se detecta del nombre si no se especifica.",
    )
    parser.add_argument(
        "--view",
        choices=list(VIEW_ALIASES.keys()),
        default=None,
        help="Vista (dorsal/ventral/lateral/macro). Se detecta del nombre si no se especifica.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular sin subir a Cloudinary ni escribir en Supabase.",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="Subir a Cloudinary pero no registrar en Supabase.",
    )
    args = parser.parse_args()

    # Normalizar vista
    view_resolved: str | None = None
    if args.view:
        view_resolved = VIEW_ALIASES.get(args.view, args.view)

    # Conectar Supabase
    sb: Client | None = None
    if not args.dry_run and not args.no_db:
        if not SUPABASE_URL or not SUPABASE_KEY:
            log.warning(
                "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no encontrados. "
                "Solo se sube a Cloudinary (equivalente a --no-db)."
            )
        else:
            sb = create_client(SUPABASE_URL, SUPABASE_KEY)
            log.info("Supabase conectado: %s", SUPABASE_URL[:40] + "…")

    # Procesar cada archivo
    total = ok = errors = 0
    for file_str in args.files:
        total += 1
        file_path = Path(file_str)
        success = process(
            file_path,
            code=args.code.upper() if args.code else None,
            view=view_resolved,
            sb=sb,
            dry_run=args.dry_run,
        )
        if success:
            ok += 1
        else:
            errors += 1

    # Resumen final
    print(f"\n{'━' * 50}")
    print(f"  Procesados: {total}  |  ✔ OK: {ok}  |  ✘ Errores: {errors}")
    print(f"{'━' * 50}\n")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
