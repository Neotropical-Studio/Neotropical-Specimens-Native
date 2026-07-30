#!/usr/bin/env python3
"""
processor_industrial.py — GROK PIPELINE
Escanea hot_folder → JOIN specimens+taxonomy → Cloudinary Familia/Género
→ specimen_media → rename a procesados_finales

Esquema live (columnas reales):
  specimens: id, species_name, media_url, taxonomy_id, region_id, author
  taxonomy:  family_name, genus_name, species_name, subfamily_name, …
  specimen_media: specimen_id, media_url, public_id, media_type, display_order

USO:
  source scripts/.venv/bin/activate
  python scripts/processor_industrial.py
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

from cloudinary import config, uploader
from supabase import create_client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("Faltan Supabase URL/KEY en .env.local")
if not all([CLOUD_NAME, API_KEY, API_SECRET]):
    sys.exit("Faltan CLOUDINARY_* en .env.local")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
config(cloud_name=CLOUD_NAME, api_key=API_KEY, api_secret=API_SECRET)

HOT = ROOT / "hot_folder"
DONE = ROOT / "procesados_finales"
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")


def _nombre_base(filename: str) -> str:
    stem = filename.rsplit(".", 1)[0]
    stem = re.sub(r"(?i)^copia\s+de\s+", "", stem).strip()
    stem = stem.replace("_", " ")
    stem = re.sub(
        r"(?i)\s+(reverso|ventral|dorsal|lateral|male|female|-l)$",
        "",
        stem,
    ).strip()
    return re.sub(r"\s+", " ", stem)


def _token(nombre: str) -> str:
    skip = {
        "de", "del", "la", "el", "los", "las", "y",
        "reverso", "ventral", "dorsal", "lateral", "copia",
        "male", "female",
    }
    for p in re.split(r"[\s_]+", nombre):
        if p.lower() in skip or len(p) < 3:
            continue
        return p
    parts = re.split(r"[\s_]+", nombre)
    return parts[0] if parts else nombre


def _like_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


def _safe_seg(s: str) -> str:
    s = (s or "GENERAL").strip() or "GENERAL"
    return re.sub(r"[^\w\-]+", "_", s)


def _rename_out(src: Path, filename: str) -> None:
    os.makedirs(DONE, exist_ok=True)
    dest = DONE / filename
    if dest.exists():
        stem, suffix = Path(filename).stem, Path(filename).suffix
        n = 1
        while True:
            cand = DONE / f"{stem}_{n}{suffix}"
            if not cand.exists():
                dest = cand
                break
            n += 1
    try:
        os.rename(src, dest)
    except OSError:
        import shutil
        shutil.move(str(src), str(dest))


def _registrar_media(specimen_id: str, public_id: str, secure_url: str) -> None:
    """Solo columnas que existen en specimen_media live."""
    existing = (
        supabase.table("specimen_media")
        .select("id")
        .eq("public_id", public_id)
        .limit(1)
        .execute()
    )
    row = {
        "specimen_id": specimen_id,
        "public_id": public_id,
        "media_url": secure_url,
        "media_type": "photo_webp",
        "display_order": 0,
    }
    if existing.data:
        supabase.table("specimen_media").update(row).eq(
            "id", existing.data[0]["id"]
        ).execute()
    else:
        supabase.table("specimen_media").insert(row).execute()

    supabase.table("specimens").update({"media_url": secure_url}).eq(
        "id", specimen_id
    ).execute()


def procesar_todo() -> None:
    os.makedirs(HOT, exist_ok=True)
    os.makedirs(DONE, exist_ok=True)

    print("--- GROK PIPELINE ACTIVO: ESCANEANDO hot_folder ---")
    files = [
        f for f in os.listdir(HOT)
        if f.lower().endswith(IMAGE_EXT) and not f.startswith(".")
    ]
    print(f"Archivos: {len(files)}")
    if not files:
        print("hot_folder vacía.")
        return

    ok = skip = err = 0
    for filename in files:
        path = HOT / filename
        nombre_base = _nombre_base(filename)
        token = _token(nombre_base)
        print(f"\n[*] Procesando {nombre_base}... (token={token})")

        try:
            match = (
                supabase.table("specimens")
                .select("*, taxonomy(*)")
                .ilike("species_name", f"%{_like_escape(token)}%")
                .limit(20)
                .execute()
            )
        except Exception as e:
            print(f"[ERROR] lookup: {e}")
            err += 1
            continue

        if not match.data:
            print(f"[!] {nombre_base} NO ENCONTRADO EN BASE DE DATOS.")
            skip += 1
            continue

        # Preferir fila con taxonomy; mejor overlap de palabras
        nb = set(nombre_base.lower().split())

        def score(row: dict) -> tuple[int, int]:
            has_tax = 1 if row.get("taxonomy") else 0
            sn = set((row.get("species_name") or "").lower().split())
            return (has_tax, len(nb & sn))

        data = sorted(match.data, key=score, reverse=True)[0]
        tax = data.get("taxonomy") or {}
        if not isinstance(tax, dict):
            tax = {}

        familia = tax.get("family_name") or "GENERAL"
        genero = tax.get("genus_name") or token or "GENERAL"
        ruta = f"CATALOGUE_Butterflies/{_safe_seg(familia)}/{_safe_seg(genero)}"

        print(f"    specimen={data['id'][:8]}…  species={data.get('species_name')}")
        print(f"    taxonomía: {familia} / {genero} / sub={tax.get('subfamily_name')}")
        print(f"    Cloudinary: {ruta}")

        # Log de campos pedidos (aunque live specimens no los tenga todos)
        print(
            "    meta pedida → "
            f"n_cientifico={data.get('species_name')} | "
            f"familia={familia} | genero={genero} | "
            f"subfamilia={tax.get('subfamily_name')} | "
            f"precio={data.get('price')} | sexo={data.get('sex')} | "
            f"origen={data.get('origin')} | region={data.get('region')}"
        )

        try:
            public_id = re.sub(r"[^A-Za-z0-9_-]+", "_", nombre_base)[:80]
            res = uploader.upload(
                str(path),
                folder=ruta,
                public_id=public_id,
                background_removal="cloudinary_ai",
                overwrite=True,
                invalidate=True,
            )
            _registrar_media(str(data["id"]), res["public_id"], res["secure_url"])
            _rename_out(path, filename)
            print(f"[✓] {nombre_base} CLASIFICADO Y REGISTRADO.")
            print(f"    URL: {res['secure_url']}")
            ok += 1
        except Exception as e:
            print(f"[ERROR] {nombre_base}: {e}")
            err += 1

    print(f"\n--- FIN GROK PIPELINE ---  OK={ok}  skip={skip}  err={err}")


if __name__ == "__main__":
    procesar_todo()
