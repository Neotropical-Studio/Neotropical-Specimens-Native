#!/usr/bin/env python3
"""
processor_industrial.py — Tubería según Documento de Especificaciones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGLAS DE INTEGRIDAD (sin fotos sueltas):
  1. Validar que el specimen_id existe en `specimens` ANTES de subir.
  2. Cloudinary public_id = specimen_id (UUID). Nunca nombres libres.
  3. Si no hay match → flag de revisión humana (NO inventar caos de nombres).
     Opcional: --create-pending crea registro PENDING para revisión.
  4. Tras Adobe Sensei → upsert specimen_media + media_url del specimen.
  5. os.rename → procesados_finales/ (hot_folder limpia).

CONVENCIÓN DE ARCHIVO:
  {specimen_uuid}.png
  {specimen_uuid}_dorsal.jpg
  {specimen_uuid}_ventral.webp

  También acepta búsqueda por species_name (primer token) SOLO si hay
  exactamente un match con taxonomy; usa ese specimens.id como public_id.

USO:
  source scripts/.venv/bin/activate
  python scripts/processor_industrial.py
  python scripts/processor_industrial.py --create-pending   # crea PENDING si no hay match
  python scripts/processor_industrial.py --dry-run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import uuid
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
REVISION = ROOT / "revision_humana"  # flag humano: no se sube
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
UUID_RE = re.compile(
    r"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"
    r"(?:_(.+))?$"
)


def _like_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


def _safe_seg(s: str) -> str:
    s = (s or "GENERAL").strip() or "GENERAL"
    return re.sub(r"[^\w\-]+", "_", s)


def _parse_stem(filename: str) -> tuple[str | None, str | None, str]:
    """
    Retorna (specimen_uuid | None, view | None, nombre_limpio).
    """
    stem = filename.rsplit(".", 1)[0]
    stem = re.sub(r"(?i)^copia\s+de\s+", "", stem).strip()
    m = UUID_RE.match(stem)
    if m:
        return m.group(1).lower(), (m.group(2) or "dorsal").lower(), stem

    nombre = stem.replace("_", " ")
    nombre = re.sub(
        r"(?i)\s+(reverso|ventral|dorsal|lateral|male|female|-l)$",
        "",
        nombre,
    ).strip()
    nombre = re.sub(r"\s+", " ", nombre)
    return None, None, nombre


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


def validar_specimen_por_id(specimen_id: str) -> dict | None:
    """Espec §3 Validación: el ID debe existir en specimens."""
    try:
        uuid.UUID(specimen_id)
    except ValueError:
        return None
    r = (
        supabase.table("specimens")
        .select("id, species_name, taxonomy_id, taxonomy(*)")
        .eq("id", specimen_id)
        .limit(1)
        .execute()
    )
    return r.data[0] if r.data else None


def buscar_specimen_por_nombre(nombre: str) -> dict | None:
    """
    Lookup por species_name. Solo acepta match único con taxonomy
    para no crear caos de nombres ambiguos.
    """
    token = _token(nombre)
    r = (
        supabase.table("specimens")
        .select("id, species_name, taxonomy_id, taxonomy(*)")
        .ilike("species_name", f"%{_like_escape(token)}%")
        .limit(25)
        .execute()
    )
    rows = r.data or []
    if not rows:
        return None

    nb = set(nombre.lower().split())

    def score(row: dict) -> tuple[int, int]:
        has_tax = 1 if row.get("taxonomy") else 0
        sn = set((row.get("species_name") or "").lower().split())
        return (has_tax, len(nb & sn))

    rows.sort(key=score, reverse=True)
    best = rows[0]
    # Ambigüedad: varios con mismo score alto → revisión humana
    top = [x for x in rows if score(x) == score(best)]
    if len(top) > 1 and score(best)[1] < 2:
        return None
    return best


def crear_registro_pending(nombre: str) -> dict:
    """
    Flujo 'Creación de Registro' (§3): specimen PENDING sin taxonomía forzada.
    Requiere revisión humana posterior (taxonomy_id puede ser null).
    """
    # taxonomy mínima UNKNOWN/UNKNOWN si hace falta FK NOT NULL en el futuro
    tax = (
        supabase.table("taxonomy")
        .select("id")
        .eq("species_name", nombre)
        .limit(1)
        .execute()
    )
    if tax.data:
        taxonomy_id = tax.data[0]["id"]
    else:
        tok = _token(nombre)
        ins_t = (
            supabase.table("taxonomy")
            .insert({
                "species_name": nombre,
                "genus_name": tok,
                "family_name": "UNKNOWN",
                "classification_type": "pending_review",
            })
            .execute()
        )
        if not ins_t.data:
            raise RuntimeError("No se pudo crear taxonomy PENDING")
        taxonomy_id = ins_t.data[0]["id"]

    row: dict = {
        "species_name": nombre,
        "taxonomy_id": taxonomy_id,
    }
    # stock_status solo si la columna ya existe (migración 0008)
    try:
        row["stock_status"] = "PENDING"
        ins = supabase.table("specimens").insert(row).execute()
    except Exception:
        row.pop("stock_status", None)
        ins = supabase.table("specimens").insert(row).execute()

    if not ins.data:
        raise RuntimeError("No se pudo crear specimen PENDING")
    sid = ins.data[0]["id"]
    return validar_specimen_por_id(str(sid)) or ins.data[0]


def flag_revision(path: Path, motivo: str) -> None:
    """Flag de error para revisión humana — no sube a Cloudinary."""
    REVISION.mkdir(parents=True, exist_ok=True)
    dest = REVISION / path.name
    if dest.exists():
        stem, suffix = path.stem, path.suffix
        n = 1
        while True:
            cand = REVISION / f"{stem}_{n}{suffix}"
            if not cand.exists():
                dest = cand
                break
            n += 1
    try:
        os.rename(path, dest)
    except OSError:
        import shutil
        shutil.move(str(path), str(dest))
    log_path = REVISION / "revision_log.txt"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(f"{path.name}\t{motivo}\n")
    print(f"[FLAG] → revision_humana/{dest.name}  ({motivo})")


def registrar_media(
    specimen_id: str,
    secure_url: str,
    view: str | None,
    cloud_public_id: str | None = None,
) -> None:
    """specimen_media + media_url. Preferir public_id = specimen_id (§3)."""
    public_id = cloud_public_id or specimen_id
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
        "media_type": "image",
        "display_order": 0 if (view or "dorsal") == "dorsal" else 1,
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


def _rename_done(path: Path) -> None:
    DONE.mkdir(parents=True, exist_ok=True)
    dest = DONE / path.name
    if dest.exists():
        stem, suffix = path.stem, path.suffix
        n = 1
        while True:
            cand = DONE / f"{stem}_{n}{suffix}"
            if not cand.exists():
                dest = cand
                break
            n += 1
    try:
        os.rename(path, dest)
    except OSError:
        import shutil
        shutil.move(str(path), str(dest))


def procesar_archivo(
    path: Path,
    *,
    create_pending: bool,
    dry_run: bool,
) -> str:
    specimen_uuid, view, nombre = _parse_stem(path.name)

    # ── 1. Resolver / validar specimen_id ─────────────────────────────────────
    specimen: dict | None = None
    if specimen_uuid:
        specimen = validar_specimen_por_id(specimen_uuid)
        if not specimen:
            flag_revision(path, f"UUID {specimen_uuid} no existe en specimens")
            return "flag"
    else:
        specimen = buscar_specimen_por_nombre(nombre)
        if not specimen:
            if create_pending:
                if dry_run:
                    print(f"[DRY] crearía PENDING para '{nombre}'")
                    return "dry"
                specimen = crear_registro_pending(nombre)
                print(f"[PENDING] Registro creado: {specimen['id']}  ({nombre})")
            else:
                flag_revision(
                    path,
                    f"Sin match en specimens para '{nombre}'. "
                    "Usa {uuid}.png o --create-pending",
                )
                return "flag"

    specimen_id = str(specimen["id"])
    tax = specimen.get("taxonomy") or {}
    if not isinstance(tax, dict):
        tax = {}
    familia = tax.get("family_name") or "GENERAL"
    genero = tax.get("genus_name") or "GENERAL"
    ruta = f"CATALOGUE_Butterflies/{_safe_seg(familia)}/{_safe_seg(genero)}"

    print(f"[*] {path.name}")
    print(f"    specimen_id = {specimen_id}  (public_id Cloudinary)")
    print(f"    species     = {specimen.get('species_name')}")
    print(f"    taxonomía   = {familia} / {genero}")
    print(f"    folder      = {ruta}")

    if dry_run:
        print("[DRY] No se sube ni mueve.")
        return "dry"

    # ── 2. Cloudinary: public_id = specimen_id EXACTO (sin fotos sueltas) ─────
    # No usamos folder= porque Cloudinary lo antepone al public_id.
    # Organización por tags/context; el ID canónico es el UUID del specimen.
    res = uploader.upload(
        str(path),
        public_id=specimen_id,
        background_removal="cloudinary_ai",
        overwrite=True,
        invalidate=True,
        tags=[
            "catalogue_butterflies",
            _safe_seg(familia),
            _safe_seg(genero),
        ],
        context={
            "family": familia,
            "genus": genero,
            "species": specimen.get("species_name") or "",
            "logical_path": ruta,
        },
    )
    # Verificar integridad: el public_id devuelto debe ser el UUID
    returned_id = str(res.get("public_id", ""))
    if returned_id != specimen_id and not returned_id.endswith(specimen_id):
        print(
            f"[WARN] public_id Cloudinary='{returned_id}' "
            f"≠ specimen_id='{specimen_id}' — se guarda el retornado"
        )
    secure_url = res["secure_url"]
    cloud_pid = returned_id if returned_id else specimen_id

    # ── 3. specimen_media ─────────────────────────────────────────────────────
    registrar_media(specimen_id, secure_url, view, cloud_public_id=cloud_pid)

    # ── 4. Limpiar hot_folder ─────────────────────────────────────────────────
    _rename_done(path)
    print(f"[✓] REGISTRADO  {secure_url}")
    return "ok"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tubería industrial según especificación de inventario",
    )
    parser.add_argument(
        "--create-pending",
        action="store_true",
        help="Si no hay match, crea specimen+taxonomy PENDING (revisión humana)",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    HOT.mkdir(parents=True, exist_ok=True)
    DONE.mkdir(parents=True, exist_ok=True)

    print("--- TUBERÍA ESPECIFICACIÓN: ESCANEANDO hot_folder ---")
    files = sorted(
        f for f in os.listdir(HOT)
        if f.lower().endswith(IMAGE_EXT) and not f.startswith(".")
    )
    print(f"Archivos: {len(files)}")
    if not files:
        print("hot_folder vacía.")
        print("Convención: {specimen_uuid}.png  |  {specimen_uuid}_dorsal.jpg")
        return

    counts = {"ok": 0, "flag": 0, "dry": 0, "err": 0}
    for name in files:
        path = HOT / name
        try:
            result = procesar_archivo(
                path,
                create_pending=args.create_pending,
                dry_run=args.dry_run,
            )
            counts[result] = counts.get(result, 0) + 1
        except Exception as e:
            print(f"[ERROR] {name}: {e}")
            counts["err"] += 1

    print(
        f"\n--- FIN ---  OK={counts['ok']}  "
        f"FLAG={counts['flag']}  DRY={counts['dry']}  ERR={counts['err']}"
    )
    print(f"Revisión humana: {REVISION}/")


if __name__ == "__main__":
    main()
