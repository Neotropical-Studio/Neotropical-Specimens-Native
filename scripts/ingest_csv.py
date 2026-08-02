#!/usr/bin/env python3
"""
scripts/ingest_csv.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Asistente de Ingesta CSV → Supabase.

USO
  python scripts/ingest_csv.py --csv carga_neotropical.csv
  python scripts/ingest_csv.py --csv carga_neotropical.csv --dry-run
  python scripts/ingest_csv.py --csv carga_neotropical.csv --validate-only

FORMATO ESTÁNDAR DE CARGA  (ver CSV_STANDARD.md para la especificación completa)
  code, nombre_cientifico, nombre_comun, familia, orden,
  region, calidad, sexo, precio
  — Acepta también variantes en inglés (family, order, sex, price…)

TABLAS OBJETIVO  (esquema live normalizado)
  global_regions  families  subfamilies  genera  species  subspecies
  taxonomy        specimens  specimen_media

MAPEO DE CAMPOS SIN TABLA PROPIA
  ┌───────────────────┬────────────────────────────────────────────────────┐
  │ Campo CSV         │ Destino en BD                                      │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ code              │ specimens.metadata->>'code'  (clave de idempotencia)│
  │ orden             │ taxonomy.order_name  (texto — no existe tabla orders)│
  │ calidad           │ specimens.metadata->>'calidad'                     │
  │ sexo              │ specimens.metadata->>'sexo'                        │
  │ precio            │ specimens.metadata->>'precio'                      │
  │ nombre_comun      │ specimens.metadata->>'nombre_comun'                │
  └───────────────────┴────────────────────────────────────────────────────┘

GARANTÍA DE UNICIDAD DE FAMILIA
  families usa ON CONFLICT (family_name) DO UPDATE — Brassolidae solo
  existirá UNA VEZ sin importar cuántas veces corras el script.

VARIABLES DE ENTORNO  (.env.local)
  NEXT_PUBLIC_SUPABASE_URL   SUPABASE_SERVICE_ROLE_KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# ─────────────────────────────────────────────────────────────────────────────
# 0.  PATHS / ENV
# ─────────────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")

INGESTA_LOG = ROOT / "ingesta.log"
ERRORES_LOG = ROOT / "ingesta_errores.log"
REGION_DEFAULT = "Neotropical"

# ─────────────────────────────────────────────────────────────────────────────
# 1.  LOGGING
# ─────────────────────────────────────────────────────────────────────────────
def _setup_logging() -> tuple[logging.Logger, logging.Logger]:
    fmt     = "%(asctime)s  %(levelname)-8s  %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    main = logging.getLogger("ingest")
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

    ok_log = logging.getLogger("ingesta_ok")
    ok_log.setLevel(logging.INFO)
    ok_log.propagate = False
    oh = logging.FileHandler(INGESTA_LOG, mode="a", encoding="utf-8")
    oh.setFormatter(logging.Formatter("%(asctime)s  %(message)s", datefmt))
    ok_log.addHandler(oh)

    return main, ok_log


log, log_ok = _setup_logging()

# ─────────────────────────────────────────────────────────────────────────────
# 2.  PARSERS DE CAMPOS ESPECIALES
# ─────────────────────────────────────────────────────────────────────────────

# ── Nombre científico ────────────────────────────────────────────────────────
_SSP_UNCERTAIN  = re.compile(r"^ssp\.?$", re.IGNORECASE)
# Notas entre paréntesis: "(Ecuador)", "(=Ituna lamaris)", "(error de catalogo)"…
_PAREN_NOTE_RE  = re.compile(r"\s*\([^)]*\)")
# Individal paren group capture (for parse_paren_content)
_PAREN_CAPTURE_RE = re.compile(r"\s*\(([^)]*)\)")
# Marcadores de forma/híbrido dentro del nombre (NO parte del epíteto subespecífico).
# No trailing \b → "f." termina en punto (non-word char), \b fallaría ahí.
# \bX\b añadido para el operador de cruce taxonómico "× / X" (ej. "comnena X humboldti").
_QUALIFIER_RE   = re.compile(
    r"\b(f\.\s*|hybrid\b|forma?\s+|Form\b|\bX\b)", re.IGNORECASE
)
# Notación híbrida con barra: "erato/melpomene?" → preservar solo el primero
_HYBRID_SLASH_RE = re.compile(r"/[^\s,;]+\??")
# Nombres que empiezan con "HYBRID #N ..." — entrada de híbrido explícita
_HYBRID_FULL_RE  = re.compile(r"^HYBRID\s*#?\s*\d*\s+(.+)", re.IGNORECASE)
# Palabras que en paréntesis son notas de variante/color, NO epítetos taxonómicos
_NON_TAXON_WORDS = frozenset({
    "blue","orange","red","green","yellow","white","black","brown","purple",
    "violet","golden","silver",
    "dwarf","small","large","giant","minor","dark","light","pale","female","male",
})


def strip_parentheticals(nc: str) -> str:
    """
    Elimina notas entre paréntesis del nombre científico para almacenamiento.
    El nombre original (con paréntesis) se guarda en metadata.nombre_cientifico_original.

    "Danaus plexippus nigrippus (Ecuador)"    → "Danaus plexippus nigrippus"
    "Lycorea ilione lamaris (=Ituna lamaris)" → "Lycorea ilione lamaris"
    "Caligo atreus agesilaus"                 → "Caligo atreus agesilaus"  (sin cambio)
    """
    return _PAREN_NOTE_RE.sub("", nc).strip()


def parse_paren_content(nc_raw: str) -> tuple[str, str | None, str | None]:
    """
    Analiza los paréntesis del nombre científico y los clasifica en tres categorías,
    devolviendo (nc_sin_parens, ssp_hint | None, form_note | None).

    Reglas por contenido del paréntesis:
    · Empieza con "f.", "forma", "hybrid" → form_note
    · Empieza con "="                    → sinónimo → strip, no form_note
    · Palabra única minúscula no-color   → ssp_hint (ej. "selenaris" es subespecie real)
    · MAYÚSCULAS o color word            → form_note (ej. DWARF, SMALL FEMALE, blue)
    · Una sola palabra con inicial mayúscula (Ecuador, Peru) → proveniencia → strip

    Ejemplos:
      "Morpho sulkowskyi (selenaris)"     → ("Morpho sulkowskyi",    "selenaris", None)
      "Morpho aega (f. bisanthe)"         → ("Morpho aega",           None,       "f. bisanthe")
      "Morpho rhetenor cacica (DWARF)"    → ("Morpho rhetenor cacica",None,        "DWARF")
      "Morpho cisseis gahua (blue)"       → ("Morpho cisseis gahua",  None,        "blue")
      "Morpho achilles phokylides (Ecuador)" → ("Morpho achilles phokylides", None, None)
      "Lycorea ilione lamaris (=Ituna)"   → ("Lycorea ilione lamaris",None,        None)
    """
    form_parts: list[str] = []
    ssp_hint:   str | None = None

    def handle(m: re.Match) -> str:
        nonlocal ssp_hint
        content = m.group(1).strip()
        if not content:
            return ""

        # Synonym: skip
        if content.startswith("="):
            return ""

        # Form / hybrid qualifier
        if re.match(r"^(f\.\s*|forma?\s+|hybrid\b)", content, re.IGNORECASE):
            form_parts.append(content)
            return ""

        words = content.split()
        if len(words) == 1:
            word = words[0]
            # 2-3 alpha-char abbreviation → country code (CR, EC, C.R., Arg…) → strip
            word_alpha = re.sub(r"[^a-zA-Z]", "", word)
            if word.isupper() and len(word_alpha) <= 3:
                return ""
            # All-uppercase single word → variant note (DWARF, etc.)
            if word.isupper():
                form_parts.append(word)
                return ""
            # Color / non-taxon word (any case)
            if word.lower() in _NON_TAXON_WORDS:
                form_parts.append(word)
                return ""
            # Single capitalized word → provenance (Ecuador, Peru, Brazil…) → strip
            if word[0].isupper():
                return ""
            # Single all-lowercase word → subspecies hint
            if re.match(r"^[a-z][a-z-]+$", word):
                ssp_hint = word
                return ""
        else:
            # Multi-word ALL-UPPERCASE → variant note (SMALL FEMALE, OUT OF STOCK…)
            if content == content.upper():
                form_parts.append(content)
                return ""

        # Default: strip without recording
        return ""

    nc_clean = _PAREN_CAPTURE_RE.sub(handle, nc_raw).strip()
    form_note = "; ".join(form_parts) if form_parts else None
    return nc_clean, ssp_hint, form_note


def parse_scientific_name(nc: str) -> tuple[str, str, str | None, str | None]:
    """
    Parsea un nombre científico limpio (ya sin paréntesis) en
    (género, especie, subespecie | None, form_note | None).

    · Notación híbrida con barra: "erato/melpomene?" → se queda con "erato"
    · "f. simplex", "Form #7", "hybrid" → extraídos como form_note,
      NO van a taxonomy.species_name (van a specimens.metadata).
    · "ssp?" como tercer token → subespecie = None
    · "?" al final de cualquier token → se descarta

    Ejemplos:
      "Heliconius erato"                          → ("Heliconius","erato", None,       None)
      "Heliconius erato microclea"                → ("Heliconius","erato","microclea", None)
      "Heliconius erato microclea f. microfluens" → ("Heliconius","erato","microclea","f. microfluens")
      "Heliconius erato hybrid f. simplex"        → ("Heliconius","erato", None,      "hybrid f. simplex")
      "Heliconius erato/melpomene? Form #7"       → ("Heliconius","erato", None,      "Form #7")
      "Heliconius erato ssp? f. andremona"        → ("Heliconius","erato", None,      "f. andremona")
    """
    # 1. Eliminar notación híbrida con barra: "erato/melpomene?" → "erato"
    clean = _HYBRID_SLASH_RE.sub("", nc).strip()

    form_note: str | None = None

    # 2. Detectar nombre de híbrido explícito: "HYBRID #N Species1 X Species2"
    hybrid_match = _HYBRID_FULL_RE.match(clean)
    if hybrid_match:
        form_note = clean  # guardar el nombre completo del híbrido como form_note
        rest = hybrid_match.group(1)
        # Extraer el primer padre (antes del operador X)
        x_split = re.split(r"\s+X\s+", rest, maxsplit=1, flags=re.IGNORECASE)
        clean = x_split[0].strip()

    # 3. Separar el marcador de forma (f., hybrid, Form #N, X) del nombre canónico
    if not hybrid_match:
        qual_match = _QUALIFIER_RE.search(clean)
        if qual_match:
            form_note = clean[qual_match.start():].strip() or None
            clean = clean[:qual_match.start()].strip()

    # 4. Tokenizar y filtrar artefactos de notación
    raw_tokens = [t.rstrip("?").strip() for t in clean.split() if t.strip()]
    raw_tokens = [t for t in raw_tokens if t]
    # Eliminar letras mayúsculas aisladas (subgénero huérfano: "Junonia I(Precis) lavinia" → "I")
    raw_tokens = [t for t in raw_tokens if not (len(t) == 1 and t.isupper())]

    genus   = raw_tokens[0].title()  if len(raw_tokens) >= 1 else ""
    species = raw_tokens[1].lower()  if len(raw_tokens) >= 2 else ""

    # Palabras de catálogo que aparecen como tercer token pero NO son subespecies
    _CATALOG_WORDS = frozenset({"mix", "only", "set", "lot", "pair", "ssp"})

    # 5. Subespecie: solo si el token[2] comienza con letra (no con "-", "#", dígito, etc.)
    if len(raw_tokens) >= 3 and raw_tokens[2][:1].isalpha():
        raw_ssp = raw_tokens[2].lower()
        # Palabras de catálogo que NO son subespecies
        if raw_ssp in _CATALOG_WORDS:
            form_note = (form_note + "; " + raw_tokens[2]) if form_note else raw_tokens[2]
            raw_ssp = None
        # Sufijo de color/forma unido con guión: "gahua-blue" → ssp="gahua", form="blue"
        elif "-" in raw_ssp:
            base, suffix = raw_ssp.split("-", 1)
            if suffix in _NON_TAXON_WORDS or suffix.isupper():
                form_note = (form_note + "; " + suffix) if form_note else suffix
                raw_ssp = base
    elif len(raw_tokens) >= 3:
        # Token no taxonómico en posición de subespecie: "-Verso Aberration #1-#6"
        aberration_note = " ".join(raw_tokens[2:])
        form_note = (form_note + "; " + aberration_note) if form_note else aberration_note
        raw_ssp = None
    else:
        raw_ssp = None

    subspecies = None if (raw_ssp is None or _SSP_UNCERTAIN.match(raw_ssp)) else raw_ssp

    return genus, species, subspecies, form_note


# ── GPS ──────────────────────────────────────────────────────────────────────
_GPS_SEP_RE = re.compile(r"[,\s]+")

def parse_gps(gps: str) -> tuple[float | None, float | None]:
    """
    Parsea coordenadas en cualquiera de estos formatos:
      "-3.7491 -73.2538"    (espacio como separador)
      "-3.7491,-73.2538"    (coma como separador)
      "-3.7491, -73.2538"   (coma + espacio)
    Devuelve (latitud, longitud) validados en rango, o (None, None).
    """
    tokens = [t for t in _GPS_SEP_RE.split(gps.strip()) if t]
    if len(tokens) >= 2:
        try:
            lat, lon = float(tokens[0]), float(tokens[1])
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
        except ValueError:
            pass
    return None, None


# ── Sexo ─────────────────────────────────────────────────────────────────────
# DB check: sex_code in ('M','F','U','P','G','H','R','A')
_SEXO_RE = re.compile(r"^(\d+)\s*(.*)", re.IGNORECASE)

# Palabras completas (inglés/español) → código de BD
_SEXO_WORDS: dict[str, str] = {
    "male": "M", "macho": "M",
    "female": "F", "hembra": "F",
    "pair": "P", "par": "P",
    "unknown": "U", "desconocido": "U",
}

def parse_sexo(sexo: str) -> tuple[str, int]:
    """
    Devuelve (sex_code, cantidad).

    Patrones del CSV — v1 y v2:
      P           → ('P', 1)   par montado
      3P          → ('P', 3)
      M/F         → ('P', 1)   barra como separador M+F
      3M/F        → ('P', 3)
      M or F      → ('P', 1)   "or" como separador M+F
      3 M or F    → ('P', 3)   número + espacio + M or F
      M           → ('M', 1)
      F           → ('F', 1)
      3M          → ('M', 3)
      3pcs        → ('U', 3)   sin sexo especificado
      3 pcs       → ('U', 3)   ídem con espacio
    """
    raw = sexo.strip()

    # Palabras completas (Male, Female, Pair…) — antes de cualquier otra lógica
    if raw.lower() in _SEXO_WORDS:
        return _SEXO_WORDS[raw.lower()], 1

    # Normalizar: "or" → "/",  espacios extra → un solo espacio
    s = re.sub(r"\s+or\s+", "/", raw, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s)

    # Extraer cantidad numérica inicial (con o sin espacio antes del resto)
    m = _SEXO_RE.match(s)
    qty  = int(m.group(1)) if m else 1
    rest = (m.group(2) if m else s).upper().strip()

    if rest in ("P",):
        return "P", qty
    if "/" in rest:                      # M/F, F/M
        return "P", qty
    if rest == "M":
        return "M", qty
    if rest == "F":
        return "F", qty
    if re.fullmatch(r"PCS?\.?", rest):   # pcs, pc, pcs.
        return "U", qty
    return "U", qty                      # fallback seguro


# ── Calidad ───────────────────────────────────────────────────────────────────
# DB check: quality_grade in ('A.1','A1-','A2','A2.','B3','A3','VGA','UNRATED')
_CALIDAD_MAP: dict[str, str] = {
    "A1":    "A.1",
    "A+":    "A.1",
    "A.1":   "A.1",
    "A1-":   "A1-",
    "A-":    "A1-",
    "A2":    "A2",
    "A2-":   "A2.",
    "A2.":   "A2.",
    "B":     "B3",
    "B3":    "B3",
    "A3":    "A3",
    "VGA":   "VGA",
}

# "OUT OF STOCK" o abreviado "OUT" al final de la calidad (e.g. "A1/A1- OUT")
_OUT_OF_STOCK_RE = re.compile(r"\bOUT(?:\s+OF\s+STOCK)?\b", re.IGNORECASE)

def parse_calidad(calidad: str) -> tuple[str, bool]:
    """
    Mapea el código de calidad del CSV al valor permitido por el CHECK de la BD.
    Devuelve (quality_grade, is_out_of_stock).

    'A1 OUT OF STOCK' → ('A.1', True)
    'A1/A1-'          → ('A.1', False)  toma el mejor grado del compuesto
    'A!'              → ('A.1', False)  typo/OCR de 'A1' — '!' → '1'
    """
    raw = calidad.strip()
    # "M=A1, F=A1/A1-" per-sex quality → take the first grade, strip "X=" prefixes
    raw = re.sub(r"[A-Z]=\s*", "", raw).split(",")[0].strip()
    # Typos/OCR: "!" y "|" → "1"
    raw = re.sub(r"[!|](?=[^a-zA-Z]|$)", "1", raw)
    # "A1/A1-++" → strip "++" augmentation suffix
    raw = re.sub(r"\+\+", "", raw).strip()
    # "A1- to VGA2" → keep only the first grade before " to "
    raw = re.sub(r"\s+to\s+.*", "", raw, flags=re.IGNORECASE).strip()
    out_of_stock = bool(_OUT_OF_STOCK_RE.search(raw))
    clean = _OUT_OF_STOCK_RE.sub("", raw).strip()
    # Tomar el primer segmento antes de "/" o espacio
    part = re.split(r"[/ ]", clean.upper())[0].strip()
    return _CALIDAD_MAP.get(part, "UNRATED"), out_of_stock


# ─────────────────────────────────────────────────────────────────────────────
# 3.  MAPEO DE COLUMNAS  (acepta nombres en español E inglés)
# ─────────────────────────────────────────────────────────────────────────────
_COL_MAP: dict[str, list[str]] = {
    "code":                ["code", "codigo", "código", "catalog_code"],
    "nombre_cientifico":   ["nombre_cientifico", "nombre científico", "scientific_name", "nombre"],
    "nombre_comun":        ["nombre_comun", "nombre común", "common_name"],
    "familia":             ["familia", "family"],
    "subfamilia":          ["subfamilia", "subfamily"],
    "genero":              ["genero", "género", "genus"],    # override explícito de género
    "orden":               ["orden", "order"],
    "region":              ["region", "región", "pais", "país", "country"],
    "localidad_especifica":["localidad_especifica", "localidad", "locality", "location_detail",
                            "location"],
    "gps":                 ["gps", "coordenadas", "coordinates", "lat_lon", "latlon"],
    "calidad":             ["calidad", "quality", "quality_grade", "grade"],
    "sexo":                ["sexo", "sex", "sex_code"],
    "precio":              ["precio", "price", "price_amount"],
    "size_range":          ["size_range", "tamaño", "tamano", "wingspan", "size", "envergadura"],
    "compliance_status":   ["compliance_status", "cites", "status_cites"],
    "phenotype_tag":       ["phenotype_tag", "fenotipo", "variante"],
    "media_url":           ["media_url", "imagen_url", "image_url", "cloudinary_url"],
    "public_id":           ["public_id", "cloudinary_id"],
    "descripcion":         ["descripcion", "descripción", "description"],
}


def _build_col_index(headers: list[str]) -> dict[str, str | None]:
    lowered = {h.strip().lower(): h for h in headers}
    return {
        canonical: next((lowered[a] for a in aliases if a in lowered), None)
        for canonical, aliases in _COL_MAP.items()
    }


_NULL_VALUES = {"null", "n/a", "na", "none", "-", ""}

def _get(row: dict, col_index: dict[str, str | None], key: str, default: str = "") -> str:
    col = col_index.get(key)
    if col is None:
        return default
    val = (row.get(col) or "").strip()
    return default if val.lower() in _NULL_VALUES else val


# ─────────────────────────────────────────────────────────────────────────────
# 4.  MODELO DE FILA
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class SpecimenRow:
    linea:             int
    code:              str              # BR-001 — clave de idempotencia
    nombre_cientifico: str
    nombre_comun:      str
    familia:           str
    orden:             str
    subfamilia:        str | None
    region:            str
    # derivados del nombre científico
    genero:            str
    especie:           str
    subespecie:        str | None
    # campos de calidad y comercio
    calidad_raw:       str
    calidad_db:        str              # valor validado por CHECK de BD
    out_of_stock:      bool             # True si calidad contenía "OUT OF STOCK"
    sex_code:          str              # M / F / P / U
    cantidad:          int
    precio:            float
    compliance_status: str
    nombre_cientifico_raw: str           # original del CSV (con notas entre paréntesis)
    localidad_especifica:  str | None    # de la columna localidad_especifica
    localidad_gps_text:    str | None    # si gps contenía texto (no coordenadas), va aquí
    lat:                   float | None  # de la columna gps, si eran coordenadas reales
    lon:                   float | None
    form_note:         str | None           # "f. simplex", "Form #7", "hybrid …" → metadata
    size_range:        str | None           # "3.0 cm", "8-10.0 cm" → metadata
    phenotype_tag:     str | None
    media_url:         str | None
    public_id:         str | None
    descripcion:       str

    def validar(self) -> list[str]:
        errs: list[str] = []
        if not self.familia:
            errs.append("'familia' vacía")
        if not self.genero:
            errs.append(f"no se pudo extraer género de '{self.nombre_cientifico}'")
        if not self.especie:
            errs.append(f"no se pudo extraer especie de '{self.nombre_cientifico}'")
        return errs


def parse_row(linea: int, row: dict, col_index: dict[str, str | None]) -> SpecimenRow:
    g = lambda key, default="": _get(row, col_index, key, default)

    nc_raw = g("nombre_cientifico")

    # 1. Extraer contenido de paréntesis: ssp_hint + form_note + strip
    #    "(selenaris)" → ssp_hint    "(f. bisanthe)" → form_note_paren
    #    "(DWARF)"     → form_note   "(Ecuador)"     → solo strip
    nc_no_parens, ssp_hint, form_note_paren = parse_paren_content(nc_raw)

    # 2. Parsear la cadena limpia: detecta f./hybrid/Form #N inline
    genero_parsed, especie, subespecie_parsed, form_note_inline = parse_scientific_name(nc_no_parens)

    # 3. Unificar form_note (paren + inline)
    form_note_parts = [p for p in [form_note_paren, form_note_inline] if p]
    form_note = "; ".join(form_note_parts) if form_note_parts else None

    # 4. Subespecie: token inline tiene prioridad; si no hay, usar ssp_hint del paréntesis
    subespecie = subespecie_parsed if subespecie_parsed is not None else ssp_hint

    # 5. La columna `genero` tiene precedencia; quitarle sus propios paréntesis también
    genero_col = strip_parentheticals(g("genero")).title()
    genero = genero_col if genero_col else genero_parsed

    # 6. Nombre canónico para taxonomy.species_name (sin form_note ni notas)
    nc = " ".join(p for p in [genero, especie, subespecie] if p)

    # subfamilia: del CSV si existe, sino None
    subfamilia_raw = g("subfamilia")
    subfamilia = subfamilia_raw.title() if subfamilia_raw else None

    # GPS: intentar parsear como coordenadas; si falla, usar como texto de localidad
    gps_raw = g("gps")
    lat, lon, localidad_gps_text = None, None, None
    if gps_raw:
        lat, lon = parse_gps(gps_raw)
        if lat is None:
            # El campo gps contiene texto (ej. "Amazonas/Alto Huallaga"), no coordenadas.
            # Se trata como descripción de localidad.
            localidad_gps_text = gps_raw

    calidad_raw = g("calidad", "UNRATED")
    calidad_db, out_of_stock = parse_calidad(calidad_raw)
    sex_code, cantidad = parse_sexo(g("sexo", "U"))

    precio_str = g("precio", "0")
    try:
        precio = float(re.sub(r"[^\d.]", "", precio_str))
    except ValueError:
        precio = 0.0

    return SpecimenRow(
        linea             = linea,
        code              = g("code"),
        nombre_cientifico = nc,
        nombre_comun      = g("nombre_comun"),
        familia           = g("familia").title(),
        orden             = (g("orden") or "Lepidoptera").title(),
        subfamilia        = subfamilia,
        region            = g("region", REGION_DEFAULT),
        genero                = genero,
        especie               = especie,
        subespecie            = subespecie,
        nombre_cientifico_raw = nc_raw,
        calidad_raw           = calidad_raw,
        calidad_db            = calidad_db,
        out_of_stock          = out_of_stock,
        sex_code              = sex_code,
        cantidad              = cantidad,
        precio                = precio,
        compliance_status     = g("compliance_status", "NO CITES"),
        localidad_especifica  = g("localidad_especifica") or None,
        localidad_gps_text    = localidad_gps_text,
        lat                   = lat,
        lon                   = lon,
        form_note            = form_note,
        size_range           = g("size_range") or None,
        phenotype_tag        = g("phenotype_tag") or None,
        media_url            = g("media_url") or None,
        public_id            = g("public_id") or None,
        descripcion          = g("descripcion"),
    )

# ─────────────────────────────────────────────────────────────────────────────
# 5.  CACHÉ EN MEMORIA
# ─────────────────────────────────────────────────────────────────────────────
_cache: dict[str, dict[str, str]] = {
    "regions":    {},
    "families":   {},
    "subfamilies":{},
    "genera":     {},
    "species":    {},
}
_RL = 0.12   # ~480 req/min

def _upsert(sb: Client, table: str, row: dict, on_conflict: str) -> str:
    time.sleep(_RL)
    res = sb.table(table).upsert(row, on_conflict=on_conflict).select("id").execute()
    if not res.data:
        raise RuntimeError(f"upsert {table!r} sin id — fila={row}")
    return str(res.data[0]["id"])

# ─────────────────────────────────────────────────────────────────────────────
# 6.  CADENA DE IDs  (secuencial — ningún paso se salta)
# ─────────────────────────────────────────────────────────────────────────────

def resolve_region(sb: Client, region_name: str) -> str:
    if region_name in _cache["regions"]:
        return _cache["regions"][region_name]
    rid = _upsert(sb, "global_regions", {"region_name": region_name}, "region_name")
    _cache["regions"][region_name] = rid
    return rid


def resolve_family(sb: Client, family_name: str) -> str:
    """
    get_or_create para families.
    Brassolidae solo existirá UNA vez — ON CONFLICT (family_name) lo garantiza.
    """
    if family_name in _cache["families"]:
        return _cache["families"][family_name]
    fid = _upsert(sb, "families", {"family_name": family_name}, "family_name")
    _cache["families"][family_name] = fid
    return fid


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


def resolve_genus(sb: Client, genus_name: str, *, subfamily_id: str | None, family_id: str) -> str:
    if genus_name in _cache["genera"]:
        return _cache["genera"][genus_name]
    row: dict = {"genus_name": genus_name}
    row["subfamily_id" if subfamily_id else "family_id"] = subfamily_id or family_id
    gid = _upsert(sb, "genera", row, "genus_name")
    _cache["genera"][genus_name] = gid
    return gid


def resolve_species(sb: Client, species_name: str, genus_id: str, region_id: str) -> str:
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


def resolve_subspecies(sb: Client, subspecies_name: str, species_id: str) -> str:
    return _upsert(
        sb, "subspecies",
        {"species_id": species_id, "subspecies_name": subspecies_name},
        "species_id,subspecies_name",
    )


def resolve_taxonomy_row(sb: Client, r: SpecimenRow, species_id: str) -> str:
    classification = "subspecies" if r.subespecie else "species"
    rank_hierarchy = " > ".join(filter(None, [r.familia, r.subfamilia, r.genero, r.nombre_cientifico]))
    return _upsert(
        sb, "taxonomy",
        {
            "species_id":          species_id,
            "species_name":        r.nombre_cientifico,
            "genus_name":          r.genero,
            "subfamily_name":      r.subfamilia,
            "family_name":         r.familia,
            "order_name":          r.orden,
            "classification_type": classification,
            "rank_hierarchy":      rank_hierarchy,
        },
        "species_name",
    )


def resolve_specimen(sb: Client, r: SpecimenRow, taxonomy_id: str, region_id: str) -> str:
    """
    Inserta en esquema LIVE (columnas planas). Dedup por specimen_code.
    No usa specimens.metadata (columna ausente en producción actual).
    """
    sexo_val = f"{r.cantidad}{r.sex_code}" if r.cantidad > 1 else r.sex_code
    localidad = r.localidad_especifica or r.localidad_gps_text
    gps = f"{r.lat} {r.lon}" if r.lat is not None and r.lon is not None else None
    status = "OUT_OF_STOCK" if r.out_of_stock else "IN_STOCK"
    stock = 0 if r.out_of_stock else max(1, r.cantidad)

    # ── Dedup por código (columna plana) ──────────────────────────────────
    if r.code:
        time.sleep(_RL)
        try:
            existing = (
                sb.table("specimens")
                .select("id")
                .eq("specimen_code", r.code)
                .limit(1)
                .execute()
            )
            if existing.data:
                return str(existing.data[0]["id"])
        except Exception:
            pass

    core: dict = {
        "species_name": r.nombre_cientifico,
        "taxonomy_id": taxonomy_id,
        "region_id": region_id,
        "rubro": "ESPECIMENES_SECOS",
        "region": r.region,
        "categoria": "Butterflies(lepidoptera) Diurne",
        "familia": r.familia,
        "subfamilia": r.subfamilia,
        "genero": r.genero,
        "especie": r.especie,
        "subespecie": r.subespecie,
        "sexo": sexo_val,
        "calidad": r.calidad_db,
        "origen": r.region,
        "localidad": localidad,
        "gps": gps,
        "dimensiones": r.size_range,
        "precio_menor": r.precio,
        "status": status,
        "specimen_code": r.code,
        "stock": stock,
    }
    if r.media_url:
        core["media_url"] = r.media_url

    def _insert(payload: dict) -> str:
        time.sleep(_RL)
        res = sb.table("specimens").insert(payload).select("id").execute()
        if not res.data:
            raise RuntimeError(f"insert specimens sin id — code={r.code}")
        return str(res.data[0]["id"])

    try:
        return _insert(core)
    except Exception as exc:
        msg = str(exc)
        if "does not exist" in msg or "42703" in msg or "PGRST" in msg:
            # Solo quitar columnas que suelen faltar en live; conservar dimensiones/localidad
            slim = {
                k: v
                for k, v in core.items()
                if k not in ("specimen_code", "stock", "stock_status")
            }
            log.warning(
                "Insert full falló (%s). Reintento slim. code=%s",
                msg[:120],
                r.code,
            )
            try:
                return _insert(slim)
            except Exception:
                minimal = {
                    "species_name": r.nombre_cientifico,
                    "taxonomy_id": taxonomy_id,
                    "region_id": region_id,
                    "familia": r.familia,
                    "genero": r.genero,
                    "especie": r.especie,
                    "precio_menor": r.precio,
                    "status": status,
                }
                return _insert(minimal)
        raise



def upsert_media(sb: Client, specimen_id: str, r: SpecimenRow) -> None:
    if not r.media_url:
        return
    time.sleep(_RL)
    sb.table("specimen_media").upsert(
        {
            "specimen_id":   specimen_id,
            "media_type":    "image",
            "media_url":     r.media_url,
            "public_id":     r.public_id,
            "display_order": 0,
        },
        on_conflict="media_url",
    ).execute()

# ─────────────────────────────────────────────────────────────────────────────
# 7.  PROCESAMIENTO DE UNA FILA
# ─────────────────────────────────────────────────────────────────────────────

def process_row(sb: Client, r: SpecimenRow, dry_run: bool) -> bool:
    errs = r.validar()
    if errs:
        log.error("Línea %d — validación: %s", r.linea, "; ".join(errs))
        return False

    if dry_run:
        sex_label = f"{r.cantidad}x {r.sex_code}" if r.cantidad > 1 else r.sex_code
        oos_label = "  ⚠ OUT OF STOCK" if r.out_of_stock else ""
        gps_label = f"  GPS=({r.lat},{r.lon})" if r.lat is not None else ""
        loc = r.localidad_especifica or r.localidad_gps_text
        loc_label = f"  localidad={loc}" if loc else ""
        nc_note   = f"  [original: {r.nombre_cientifico_raw}]" if r.nombre_cientifico_raw != r.nombre_cientifico else ""
        form_label = f"  form={r.form_note}" if r.form_note else ""
        log.info(
            "  DRY-RUN  [%s] %s  familia=%s  subfamilia=%s  región=%s  calidad=%s  sexo=%s  precio=%.2f%s%s%s%s%s",
            r.code, r.nombre_cientifico, r.familia, r.subfamilia or "-", r.region,
            r.calidad_db, sex_label, r.precio, oos_label, gps_label, loc_label, nc_note, form_label,
        )
        return True

    try:
        region_id   = resolve_region(sb, r.region)
        family_id   = resolve_family(sb, r.familia)
        subfamily_id = resolve_subfamily(sb, r.subfamilia, family_id) if r.subfamilia else None
        genus_id    = resolve_genus(sb, r.genero, subfamily_id=subfamily_id, family_id=family_id)
        species_id  = resolve_species(sb, r.especie, genus_id, region_id)
        if r.subespecie:
            resolve_subspecies(sb, r.subespecie, species_id)
        taxonomy_id = resolve_taxonomy_row(sb, r, species_id)
        specimen_id = resolve_specimen(sb, r, taxonomy_id, region_id)
        upsert_media(sb, specimen_id, r)

        print(f"  Procesado: {r.nombre_cientifico} [{r.code}] en región {r.region} con éxito")
        log_ok.info("OK  L%d  [%s]  specimen_id=%s  taxon=%s", r.linea, r.code, specimen_id, r.nombre_cientifico)
        return True

    except Exception as exc:
        log.error("Línea %d [%s] (%s) — %s: %s", r.linea, r.code, r.nombre_cientifico, type(exc).__name__, exc, exc_info=True)
        return False

# ─────────────────────────────────────────────────────────────────────────────
# 8.  VALIDACIÓN PREVIA  (--validate-only)
# ─────────────────────────────────────────────────────────────────────────────

def validate_csv(csv_path: Path) -> bool:
    log.info("=== Validación: %s ===", csv_path)
    errors = warnings = 0

    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames or [])
        col_index = _build_col_index(headers)

        # Columnas obligatorias
        missing = [c for c in ["familia", "nombre_cientifico"] if col_index[c] is None]
        if missing:
            log.error("Columnas obligatorias no encontradas: %s\nCabecera detectada: %s", missing, headers)
            return False

        # Columnas recomendadas
        for c in ["code", "orden", "region", "calidad", "sexo", "precio"]:
            if col_index[c] is None:
                log.warning("Columna recomendada '%s' no encontrada — se usará valor por defecto.", c)
                warnings += 1

        # Validar filas
        families_seen: set[str] = set()
        for linea, row in enumerate(reader, start=2):
            r = parse_row(linea, row, col_index)
            for e in r.validar():
                log.warning("  Línea %d: %s", linea, e)
                errors += 1
            families_seen.add(r.familia)

    log.info("Familias únicas en el CSV: %s", sorted(families_seen))
    if errors:
        log.error("Validación: %d error(es), %d advertencia(s). Corrígelos antes de ingestar.", errors, warnings)
        return False
    log.info("Validación OK — %d advertencia(s). CSV listo.", warnings)
    return True

# ─────────────────────────────────────────────────────────────────────────────
# 9.  CONTEO DE FAMILIAS POST-INGESTA
# ─────────────────────────────────────────────────────────────────────────────

def verificar_conteo_familias(sb: Client, familia_esperada: str) -> None:
    """
    Confirma que la familia solo existe UNA VEZ en la tabla families.
    Responde al requisito: 'confirma que el conteo de familias sigue siendo 1'.
    """
    time.sleep(_RL)
    res = sb.table("families").select("id, family_name").eq("family_name", familia_esperada).execute()
    count = len(res.data)
    if count == 1:
        log.info("✔ Conteo de familias: '%s' aparece exactamente 1 vez en la BD (id=%s).", familia_esperada, res.data[0]["id"])
    elif count == 0:
        log.warning("⚠ '%s' no encontrada en families — ¿la ingesta se ejecutó en modo dry-run?", familia_esperada)
    else:
        log.error("✘ '%s' aparece %d veces en families — hay duplicados. IDs: %s", familia_esperada, count, [r["id"] for r in res.data])

# ─────────────────────────────────────────────────────────────────────────────
# 10. INGESTA PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

def run_ingesta(sb: Client, csv_path: Path, dry_run: bool, limit: int | None) -> None:
    log.info("=== INGESTA: %s  dry-run=%s ===", csv_path, dry_run)
    ok = errors = 0
    familias_cargadas: set[str] = set()

    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            log.error("CSV vacío o sin cabecera.")
            sys.exit(1)
        col_index = _build_col_index(list(reader.fieldnames))

        for linea, row in enumerate(reader, start=2):
            if limit is not None and ok + errors >= limit:
                log.info("Límite de %d filas alcanzado.", limit)
                break
            r = parse_row(linea, row, col_index)
            if process_row(sb, r, dry_run):
                ok += 1
                familias_cargadas.add(r.familia)
            else:
                errors += 1

    log.info("\n=== Resumen ===")
    log.info("  ✔ Procesados:  %d", ok)
    log.info("  ✘ Errores:     %d  (ver %s)", errors, ERRORES_LOG)
    log.info("  Familias en este lote: %s", sorted(familias_cargadas))

    if not dry_run:
        for fam in familias_cargadas:
            verificar_conteo_familias(sb, fam)

    if errors:
        sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 11. MAIN
# ─────────────────────────────────────────────────────────────────────────────

def _require_env(name: str) -> str:
    val = os.getenv(name)
    if not val:
        log.error("Variable '%s' no definida en .env.local.", name)
        sys.exit(1)
    return val


def main() -> None:
    parser = argparse.ArgumentParser(description="Asistente de Ingesta CSV → Supabase")
    parser.add_argument("--csv",           required=True,       help="Ruta al .csv")
    parser.add_argument("--dry-run",       action="store_true", help="Simula sin escribir")
    parser.add_argument("--validate-only", action="store_true", help="Solo valida el CSV")
    parser.add_argument("--limit",         type=int, default=None, help="Procesar solo las primeras N filas")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        log.error("Archivo no encontrado: %s", csv_path)
        sys.exit(1)

    if args.validate_only:
        sys.exit(0 if validate_csv(csv_path) else 1)

    sb = create_client(
        _require_env("NEXT_PUBLIC_SUPABASE_URL"),
        _require_env("SUPABASE_SERVICE_ROLE_KEY"),
    )
    run_ingesta(sb, csv_path, args.dry_run, args.limit)


if __name__ == "__main__":
    main()
