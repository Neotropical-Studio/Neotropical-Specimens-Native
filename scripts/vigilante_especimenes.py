#!/usr/bin/env python3
"""
scripts/vigilante_especimenes.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vigilante + migrador masivo: carpeta local → Cloudinary → Supabase.

MODOS
  --scan  ./ESPECIMENES           Procesa en lote archivos existentes (os.walk)
  --watch ./ESPECIMENES_NUEVOS    Modo vigilante en vivo (watchdog)
  --dry-run                       Simula sin escribir en Cloudinary ni Supabase
  --reset-checkpoint              Borra .checkpoint.json y empieza desde cero
  --limit N                       (solo --scan) para después de N archivos

JERARQUÍA DE CARPETAS ESPERADA
  [prefijos arbitrarios] / REGION … / RUBRO / FAMILIA / GENERO / ESPECIE / archivo.jpg
  La región se detecta dinámicamente (primer segmento que empieza con "REGION"
  o "REGIÓN"); el resto se extrae por posición relativa.  No hay rutas
  hardcodeadas — el script es 100 % reutilizable para cualquier colección.

CADENA OBLIGATORIA DE IDs (ningún nivel puede quedar suelto)
  region → family → [subfamily] → genus → species → [subspecies]
       → taxonomy → specimen → specimen_media

TABLAS OBJETIVO (esquema live en Supabase)
  global_regions, families, subfamilies, genera, species, subspecies,
  taxonomy, specimens, specimen_media

VARIABLES DE ENTORNO (cargar desde .env.local en la raíz del proyecto)
  CLOUDINARY_CLOUD_NAME   CLOUDINARY_API_KEY   CLOUDINARY_API_SECRET
  NEXT_PUBLIC_SUPABASE_URL                     SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── third-party ──────────────────────────────────────────────────────────────
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError
from supabase import create_client, Client

# watchdog es opcional: solo se importa en modo --watch
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    _WATCHDOG_OK = True
except ImportError:
    _WATCHDOG_OK = False

# ─────────────────────────────────────────────────────────────────────────────
# 0.  PATHS / ENV
# ─────────────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")

CHECKPOINT_FILE = ROOT / ".checkpoint.json"
PROCESADOS_LOG  = ROOT / "procesados.log"
ERRORES_LOG     = ROOT / "errores.log"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp"}
VIDEO_EXT = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
SUPPORTED_EXT = IMAGE_EXT | VIDEO_EXT

# ─────────────────────────────────────────────────────────────────────────────
# 1.  LOGGING  (consola + procesados.log + errores.log)
# ─────────────────────────────────────────────────────────────────────────────
def _setup_logging() -> tuple[logging.Logger, logging.Logger]:
    fmt     = "%(asctime)s  %(levelname)-8s  %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    main = logging.getLogger("vigilante")
    main.setLevel(logging.DEBUG)
    main.propagate = False

    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter(fmt, datefmt))
    main.addHandler(ch)

    fh = logging.FileHandler(ERRORES_LOG, mode="a", encoding="utf-8")
    fh.setLevel(logging.WARNING)
    fh.setFormatter(logging.Formatter(fmt, datefmt))
    main.addHandler(fh)

    ok_log = logging.getLogger("procesados")
    ok_log.setLevel(logging.INFO)
    ok_log.propagate = False
    sh = logging.FileHandler(PROCESADOS_LOG, mode="a", encoding="utf-8")
    sh.setFormatter(logging.Formatter("%(asctime)s  %(message)s", datefmt))
    ok_log.addHandler(sh)

    return main, ok_log


log, log_ok = _setup_logging()

# ─────────────────────────────────────────────────────────────────────────────
# 2.  CHECKPOINT  (.checkpoint.json — persiste public_ids ya procesados)
# ─────────────────────────────────────────────────────────────────────────────
class Checkpoint:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._done: set[str] = set()
        self._load()

    def _load(self) -> None:
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._done = set(data.get("done", []))
                log.info("Checkpoint: %d archivos ya procesados.", len(self._done))
            except Exception as exc:
                log.warning("Checkpoint ilegible (%s) — arrancando desde cero.", exc)

    def save(self) -> None:
        self._path.write_text(
            json.dumps(
                {"done": sorted(self._done),
                 "updated_at": datetime.now(timezone.utc).isoformat()},
                ensure_ascii=False, indent=2,
            ),
            encoding="utf-8",
        )

    def already_done(self, key: str) -> bool:
        return key in self._done

    def mark_done(self, key: str) -> None:
        self._done.add(key)
        if len(self._done) % 50 == 0:   # flush each 50 to limit data loss on crash
            self.save()

# ─────────────────────────────────────────────────────────────────────────────
# 3.  RATE LIMITERS
# ─────────────────────────────────────────────────────────────────────────────
class _RateLimiter:
    """Token-bucket simple: garantiza mínimo `interval` segundos entre llamadas."""
    def __init__(self, calls_per_minute: float) -> None:
        self._interval = 60.0 / max(calls_per_minute, 0.01)
        self._last = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self._last
        if elapsed < self._interval:
            time.sleep(self._interval - elapsed)
        self._last = time.monotonic()


_openai_rl  = _RateLimiter(calls_per_minute=50)   # GPT-4o: 60 RPM — margen de seguridad
_supabase_rl = _RateLimiter(calls_per_minute=200)  # Supabase REST: sin límite duro, pero educado

# ─────────────────────────────────────────────────────────────────────────────
# 4.  EXTRACCIÓN POSICIONAL DE METADATOS DE RUTA
#     No hardcodea ningún nombre de carpeta — detecta REGION dinámicamente y
#     asigna RUBRO/FAMILIA/GENERO/ESPECIE por posición relativa.
# ─────────────────────────────────────────────────────────────────────────────
_REGION_RE = re.compile(r"^regi[oó]n[\s_\-]", re.IGNORECASE)


def extraer_metadatos_de_ruta(ruta_archivo: str) -> dict[str, str | None]:
    """
    Ejemplo:
      "Colecciones/REGION Central South America/Mariposas Nocturnas/BRASSOLIDAE/Caligo/memnon/foto.jpg"
      → region  = "REGION Central South America"
        rubro   = "Mariposas Nocturnas"
        familia = "BRASSOLIDAE"
        genero  = "Caligo"
        especie = "memnon"
    """
    partes = [p for p in Path(ruta_archivo).parts if p not in (".", "/", "\\")]

    # Detectar índice de la parte REGION
    region_idx: int | None = None
    for i, p in enumerate(partes):
        if _REGION_RE.match(p):
            region_idx = i
            break
    if region_idx is None:
        region_idx = 0  # fallback: primera carpeta = región

    off = region_idx
    return {
        "region":  partes[off]         if off     < len(partes) else None,
        "rubro":   partes[off + 1]     if off + 1 < len(partes) else None,
        "familia": partes[off + 2]     if off + 2 < len(partes) else None,
        "genero":  partes[off + 3]     if off + 3 < len(partes) else None,
        "especie": partes[off + 4]     if off + 4 < len(partes) else None,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 5.  GPT-4o — ENRIQUECIMIENTO TAXONÓMICO
#     La IA devuelve orden, subfamilia, GPS y descripción.
#     La ruta SIEMPRE gana sobre la IA para familia y género: el usuario
#     ya organizó sus propias carpetas.
# ─────────────────────────────────────────────────────────────────────────────
_PROMPT = """\
Eres un taxónomo experto en entomología neotropical.
Analiza el nombre del archivo y la ruta de carpeta del espécimen.
Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto extra):

{{
  "orden":             "<nombre del orden, ej: Lepidoptera>",
  "familia":           "<Nymphalidae, Brassolidae… o null si no reconoces>",
  "subfamilia":        "<Morphinae… o null>",
  "genero":            "<Morpho, Caligo… o null>",
  "especie":           "<helenor, memnon… en minúsculas, o null>",
  "subespecie":        "<tingomarensis… o null>",
  "nombre_cientifico": "<binomial o trinomial completo>",
  "descripcion":       "<descripción técnica breve en español, máx 2 oraciones>",
  "colores":           ["<color_primario>", "<color_secundario>"],
  "latitud":           <decimal o null>,
  "longitud":          <decimal o null>,
  "altitud_m":         <metros o null>,
  "rubro_categoria":   "<Mariposas Diurnas|Mariposas Nocturnas|Coleópteros|Artrópodos|Otro>",
  "confianza":         <0.0–1.0>
}}

Archivo: {filename}
Ruta:    {folder_path}
"""


@dataclass
class TaxonInfo:
    orden: str
    familia: str
    subfamilia: str | None
    genero: str
    especie: str
    subespecie: str | None
    nombre_cientifico: str
    descripcion: str
    colores: list[str]
    latitud: float | None
    longitud: float | None
    altitud_m: float | None
    rubro_categoria: str
    confianza: float
    raw: dict = field(default_factory=dict)


def enrich_with_gpt4o(
    oai: OpenAI,
    filename: str,
    folder_path: str,
    path_meta: dict[str, str | None],
    retries: int = 4,
) -> TaxonInfo:
    """
    Llama a GPT-4o.  La ruta tiene prioridad sobre la IA para familia/género:
    nunca sobreescribimos lo que el usuario ya organizó manualmente en carpetas.
    """
    prompt = _PROMPT.format(filename=filename, folder_path=folder_path)
    raw: dict = {}
    last_exc: Exception | None = None

    for attempt in range(1, retries + 1):
        _openai_rl.wait()
        try:
            resp = oai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            raw = json.loads(resp.choices[0].message.content or "{}")
            break
        except RateLimitError:
            wait = 2 ** attempt
            log.warning("OpenAI rate limit — reintentando en %ds (intento %d/%d).", wait, attempt, retries)
            time.sleep(wait)
            last_exc = Exception("RateLimitError")
        except Exception as exc:
            last_exc = exc
            log.warning("OpenAI error (%s) — reintentando...", exc)
            time.sleep(2 ** attempt)
    else:
        raise RuntimeError(f"GPT-4o falló tras {retries} intentos: {last_exc}") from last_exc

    # La ruta tiene precedencia para familia y género
    familia = (path_meta.get("familia") or raw.get("familia") or "Incertae sedis").strip().title()
    genero  = (path_meta.get("genero")  or raw.get("genero")  or "").strip().title()
    especie = (path_meta.get("especie") or raw.get("especie") or "").strip().lower()

    return TaxonInfo(
        orden            = (raw.get("orden") or "Insecta incertae sedis").strip().title(),
        familia          = familia,
        subfamilia       = (raw.get("subfamilia") or None),
        genero           = genero,
        especie          = especie,
        subespecie       = (raw.get("subespecie") or None),
        nombre_cientifico= (raw.get("nombre_cientifico") or f"{genero} {especie}").strip(),
        descripcion      = (raw.get("descripcion") or "").strip(),
        colores          = raw.get("colores") or [],
        latitud          = raw.get("latitud"),
        longitud         = raw.get("longitud"),
        altitud_m        = raw.get("altitud_m"),
        rubro_categoria  = (raw.get("rubro_categoria") or path_meta.get("rubro") or "Otro"),
        confianza        = float(raw.get("confianza", 0.5)),
        raw              = raw,
    )

# ─────────────────────────────────────────────────────────────────────────────
# 6.  SUPABASE — CADENA SECUENCIAL DE UPSERTS
#     Cada función exige el ID del padre ya resuelto.
#     Caché en memoria por corrida para no repetir consultas.
# ─────────────────────────────────────────────────────────────────────────────
_cache: dict[str, dict[str, str]] = {
    "regions":    {},   # region_name → id
    "families":   {},   # family_name → id
    "subfamilies":{},   # f"{family_id}:{subfamily_name}" → id
    "genera":     {},   # genus_name → id
    "species":    {},   # f"{genus_id}:{species_name}" → id
}


def _upsert(sb: Client, table: str, row: dict, on_conflict: str) -> str:
    """Upsert genérico con rate-limit y retorno del UUID."""
    _supabase_rl.wait()
    res = sb.table(table).upsert(row, on_conflict=on_conflict).select("id").execute()
    if not res.data:
        raise RuntimeError(f"upsert {table} no devolvió id. row={row}")
    return res.data[0]["id"]


# ── Paso 0: Región ───────────────────────────────────────────────────────────
def resolve_region(sb: Client, region_name: str) -> str:
    if region_name in _cache["regions"]:
        return _cache["regions"][region_name]
    rid = _upsert(sb, "global_regions", {"region_name": region_name}, "region_name")
    _cache["regions"][region_name] = rid
    return rid


# ── Paso 1: Familia ──────────────────────────────────────────────────────────
def resolve_family(sb: Client, family_name: str) -> str:
    if family_name in _cache["families"]:
        return _cache["families"][family_name]
    fid = _upsert(sb, "families", {"family_name": family_name}, "family_name")
    _cache["families"][family_name] = fid
    return fid


# ── Paso 2: Subfamilia (opcional) ────────────────────────────────────────────
def resolve_subfamily(sb: Client, subfamily_name: str, family_id: str) -> str:
    key = f"{family_id}:{subfamily_name}"
    if key in _cache["subfamilies"]:
        return _cache["subfamilies"][key]
    sid = _upsert(
        sb, "subfamilies",
        {"subfamily_name": subfamily_name, "family_id": family_id},
        "subfamily_name",
    )
    _cache["subfamilies"][key] = sid
    return sid


# ── Paso 3: Género ───────────────────────────────────────────────────────────
def resolve_genus(
    sb: Client,
    genus_name: str,
    *,
    subfamily_id: str | None,
    family_id: str,
) -> str:
    if not genus_name:
        raise ValueError("Género vacío — no se puede insertar espécimen sin género.")
    if genus_name in _cache["genera"]:
        return _cache["genera"][genus_name]

    # genera exige al menos uno de subfamily_id / family_id (CHECK de migración 0006)
    row: dict = {"genus_name": genus_name}
    if subfamily_id:
        row["subfamily_id"] = subfamily_id
    else:
        row["family_id"] = family_id

    gid = _upsert(sb, "genera", row, "genus_name")
    _cache["genera"][genus_name] = gid
    return gid


# ── Paso 4: Especie ──────────────────────────────────────────────────────────
def resolve_species(
    sb: Client,
    species_name: str,
    genus_id: str,
    region_id: str,
) -> str:
    if not species_name:
        raise ValueError("Especie vacía — no se puede insertar espécimen sin epíteto específico.")
    key = f"{genus_id}:{species_name}"
    if key in _cache["species"]:
        return _cache["species"][key]
    sid = _upsert(
        sb, "species",
        {"genus_id": genus_id, "species_name": species_name, "region_id": region_id},
        "genus_id,species_name",
    )
    _cache["species"][key] = sid
    return sid


# ── Paso 5: Subespecie (opcional) ────────────────────────────────────────────
def resolve_subspecies(sb: Client, subspecies_name: str, species_id: str) -> str:
    return _upsert(
        sb, "subspecies",
        {"species_id": species_id, "subspecies_name": subspecies_name},
        "species_id,subspecies_name",
    )


# ── Paso 6: Fila de taxonomía (tabla denormalizada) ──────────────────────────
def resolve_taxonomy_row(
    sb: Client,
    info: TaxonInfo,
    species_id: str,
    classification_type: str,          # 'species' | 'subspecies'
) -> str:
    rank_hierarchy = " > ".join(filter(None, [
        info.familia,
        info.subfamilia,
        info.genero,
        info.nombre_cientifico,
    ]))
    return _upsert(
        sb, "taxonomy",
        {
            "species_id":          species_id,
            "species_name":        info.nombre_cientifico,
            "genus_name":          info.genero,
            "subfamily_name":      info.subfamilia,
            "family_name":         info.familia,
            "order_name":          info.orden,
            "classification_type": classification_type,
            "rank_hierarchy":      rank_hierarchy,
        },
        "species_name",
    )


# ── Paso 7: Espécimen ────────────────────────────────────────────────────────
def resolve_specimen(
    sb: Client,
    scientific_name: str,
    taxonomy_id: str,
    region_id: str,
    cover_url: str,
) -> str:
    return _upsert(
        sb, "specimens",
        {
            "species_name": scientific_name,
            "taxonomy_id":  taxonomy_id,
            "region_id":    region_id,
            "media_url":    cover_url,
        },
        "media_url",
    )


# ── Paso 8: Multimedia ───────────────────────────────────────────────────────
def upsert_media(
    sb: Client,
    specimen_id: str,
    media_url: str,
    public_id: str,
    media_type: str,
    display_order: int = 0,
) -> None:
    _supabase_rl.wait()
    sb.table("specimen_media").upsert(
        {
            "specimen_id":   specimen_id,
            "media_type":    media_type,
            "media_url":     media_url,
            "public_id":     public_id,
            "display_order": display_order,
        },
        on_conflict="media_url",
    ).execute()


# ─────────────────────────────────────────────────────────────────────────────
# 7.  CLOUDINARY — SUBIR ARCHIVO LOCAL
# ─────────────────────────────────────────────────────────────────────────────
def upload_to_cloudinary(
    local_path: str,
    path_meta: dict[str, str | None],
) -> tuple[str, str]:
    """
    Sube el archivo a Cloudinary bajo:
      {region}/{rubro}/{familia}/{genero}/{especie}/
    Devuelve (public_id, secure_url).
    """
    folder_parts = [
        path_meta.get("region")  or "SIN_REGION",
        path_meta.get("rubro")   or "SIN_RUBRO",
        path_meta.get("familia") or "SIN_FAMILIA",
        path_meta.get("genero")  or "SIN_GENERO",
        path_meta.get("especie") or "SIN_ESPECIE",
    ]
    target_folder = "/".join(folder_parts)

    result = cloudinary.uploader.upload(
        local_path,
        folder=target_folder,
        resource_type="auto",
        use_asset_folder_as_public_id_prefix=True,
        overwrite=False,        # evita resubir si ya existe
        unique_filename=True,
    )
    return result["public_id"], result["secure_url"]

# ─────────────────────────────────────────────────────────────────────────────
# 8.  PIPELINE PRINCIPAL (un archivo)
# ─────────────────────────────────────────────────────────────────────────────
def process_file(
    local_path: str,
    oai: OpenAI,
    sb: Client,
    checkpoint: Checkpoint,
    dry_run: bool = False,
) -> bool:
    """
    Ejecuta la cadena completa para un archivo:
      1. Extrae metadatos de ruta
      2. Sube a Cloudinary
      3. Enriquece con GPT-4o
      4. Resuelve cadena de IDs: región→familia→género→especie→taxonomía
      5. Upsert specimen + specimen_media
      6. Checkpoint
    Devuelve True si éxito, False si error (sin propagar la excepción).
    """
    path = Path(local_path)
    if path.suffix.lower() not in SUPPORTED_EXT:
        return True    # No es imagen/video — se ignora sin error

    key = str(path.resolve())
    if checkpoint.already_done(key):
        return True    # Ya procesado

    filename = path.name
    folder_path = str(path.parent)

    log.info("→ %s", local_path)

    if dry_run:
        path_meta = extraer_metadatos_de_ruta(local_path)
        log.info(
            "  DRY-RUN  region=%s  rubro=%s  familia=%s  genero=%s  especie=%s",
            path_meta["region"], path_meta["rubro"],
            path_meta["familia"], path_meta["genero"], path_meta["especie"],
        )
        return True

    try:
        # ── 1. Metadatos de ruta ──────────────────────────────────────────
        path_meta = extraer_metadatos_de_ruta(local_path)

        # ── 2. Subir a Cloudinary ─────────────────────────────────────────
        public_id, secure_url = upload_to_cloudinary(local_path, path_meta)
        log.debug("  Cloudinary: %s", public_id)

        # ── 3. Enriquecer con GPT-4o ──────────────────────────────────────
        info = enrich_with_gpt4o(oai, filename, folder_path, path_meta)
        if info.confianza < 0.35:
            log.warning(
                "  Confianza baja (%.2f) para '%s' — insertando igual.", info.confianza, filename
            )

        # ── 4. Cadena de IDs (secuencial, sin saltar ningún paso) ─────────
        region_id = resolve_region(sb, path_meta["region"] or info.nombre_cientifico)

        family_id    = resolve_family(sb, info.familia)
        subfamily_id = resolve_subfamily(sb, info.subfamilia, family_id) if info.subfamilia else None
        genus_id     = resolve_genus(sb, info.genero, subfamily_id=subfamily_id, family_id=family_id)
        species_id   = resolve_species(sb, info.especie, genus_id, region_id)

        if info.subespecie:
            resolve_subspecies(sb, info.subespecie, species_id)

        classification = "subspecies" if info.subespecie else "species"
        taxonomy_id = resolve_taxonomy_row(sb, info, species_id, classification)

        # ── 5. Espécimen ──────────────────────────────────────────────────
        specimen_id = resolve_specimen(
            sb,
            scientific_name=info.nombre_cientifico,
            taxonomy_id=taxonomy_id,
            region_id=region_id,
            cover_url=secure_url,
        )

        # ── 6. Multimedia ─────────────────────────────────────────────────
        media_type = "video" if path.suffix.lower() in VIDEO_EXT else "image"
        upsert_media(sb, specimen_id, secure_url, public_id, media_type, display_order=0)

        # ── Checkpoint + log ──────────────────────────────────────────────
        checkpoint.mark_done(key)
        log_ok.info(
            "OK  specimen_id=%s  taxon=%s  public_id=%s  confianza=%.2f",
            specimen_id, info.nombre_cientifico, public_id, info.confianza,
        )
        log.info(
            "  ✔  %s  →  %s  [familia=%s  genero=%s]",
            filename, info.nombre_cientifico, info.familia, info.genero,
        )
        return True

    except Exception as exc:
        log.error("  ✘  %s  —  %s: %s", local_path, type(exc).__name__, exc, exc_info=True)
        return False

# ─────────────────────────────────────────────────────────────────────────────
# 9.  MODO --scan (os.walk sobre carpeta local)
# ─────────────────────────────────────────────────────────────────────────────
def run_scan(
    root_dir: str,
    oai: OpenAI,
    sb: Client,
    checkpoint: Checkpoint,
    dry_run: bool,
    limit: int | None,
) -> None:
    log.info("=== MODO SCAN: %s ===", root_dir)
    ok = errors = skipped = 0

    for dirpath, _dirs, files in os.walk(root_dir):
        for fname in sorted(files):
            if limit is not None and ok + errors >= limit:
                log.info("Límite de %d archivos alcanzado.", limit)
                checkpoint.save()
                return

            full = os.path.join(dirpath, fname)
            if Path(full).suffix.lower() not in SUPPORTED_EXT:
                continue

            if checkpoint.already_done(str(Path(full).resolve())):
                skipped += 1
                continue

            success = process_file(full, oai, sb, checkpoint, dry_run)
            if success:
                ok += 1
            else:
                errors += 1

    checkpoint.save()
    log.info("=== Scan completo — OK: %d  Errores: %d  Saltados: %d ===", ok, errors, skipped)
    if errors:
        log.warning("Revisa %s para el detalle de errores.", ERRORES_LOG)

# ─────────────────────────────────────────────────────────────────────────────
# 10. MODO --watch (watchdog — detecta archivos nuevos en tiempo real)
# ─────────────────────────────────────────────────────────────────────────────
class _SpecimenHandler(FileSystemEventHandler):  # type: ignore[misc]
    def __init__(
        self,
        oai: OpenAI,
        sb: Client,
        checkpoint: Checkpoint,
        dry_run: bool,
    ) -> None:
        super().__init__()
        self._oai = oai
        self._sb  = sb
        self._ck  = checkpoint
        self._dry = dry_run

    def on_created(self, event) -> None:  # type: ignore[override]
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() not in SUPPORTED_EXT:
            return

        # Pequeña espera para que el archivo termine de copiarse
        time.sleep(1.5)
        if not path.exists():
            return

        log.info("Nuevo archivo detectado: %s", event.src_path)
        process_file(event.src_path, self._oai, self._sb, self._ck, self._dry)
        self._ck.save()


def run_watch(
    watch_dir: str,
    oai: OpenAI,
    sb: Client,
    checkpoint: Checkpoint,
    dry_run: bool,
) -> None:
    if not _WATCHDOG_OK:
        log.error("watchdog no está instalado. Ejecuta: pip install watchdog")
        sys.exit(1)

    log.info("=== MODO VIGILANTE activo en: %s ===", watch_dir)
    log.info("Suelta imágenes en esa carpeta. Ctrl+C para detener.")

    handler  = _SpecimenHandler(oai, sb, checkpoint, dry_run)
    observer = Observer()
    observer.schedule(handler, watch_dir, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("Deteniendo vigilante...")
        observer.stop()
    observer.join()
    checkpoint.save()

# ─────────────────────────────────────────────────────────────────────────────
# 11. MAIN
# ─────────────────────────────────────────────────────────────────────────────
def _require_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        log.error("Variable de entorno requerida '%s' no definida en .env.local.", name)
        sys.exit(1)
    return val


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Vigilante / migrador de especímenes → Cloudinary → Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--scan",  metavar="DIRECTORIO", help="Procesa lote existente con os.walk")
    group.add_argument("--watch", metavar="DIRECTORIO", help="Modo vigilante en vivo (watchdog)")
    parser.add_argument("--dry-run",          action="store_true", help="Simula sin escribir en ningún servicio")
    parser.add_argument("--limit",            type=int,  default=None, help="Procesar solo los primeros N archivos")
    parser.add_argument("--reset-checkpoint", action="store_true", help="Borra .checkpoint.json y empieza desde cero")
    args = parser.parse_args()

    # Credenciales
    cloudinary.config(
        cloud_name = _require_env("CLOUDINARY_CLOUD_NAME"),
        api_key    = _require_env("CLOUDINARY_API_KEY"),
        api_secret = _require_env("CLOUDINARY_API_SECRET"),
        secure     = True,
    )
    sb  = create_client(_require_env("NEXT_PUBLIC_SUPABASE_URL"), _require_env("SUPABASE_SERVICE_ROLE_KEY"))
    oai = OpenAI(api_key=_require_env("OPENAI_API_KEY"))

    # Checkpoint
    if args.reset_checkpoint and CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        log.info("Checkpoint borrado.")
    checkpoint = Checkpoint(CHECKPOINT_FILE)

    log.info(
        "Iniciando  dry-run=%s  limit=%s  checkpoint=%d ya procesados",
        args.dry_run, args.limit, len(checkpoint._done),
    )

    if args.scan:
        if not Path(args.scan).is_dir():
            log.error("'%s' no es un directorio válido.", args.scan)
            sys.exit(1)
        run_scan(args.scan, oai, sb, checkpoint, args.dry_run, args.limit)

    elif args.watch:
        Path(args.watch).mkdir(parents=True, exist_ok=True)
        run_watch(args.watch, oai, sb, checkpoint, args.dry_run)


if __name__ == "__main__":
    main()
