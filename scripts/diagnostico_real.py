#!/usr/bin/env python3
"""
diagnostico_real.py — Imprime la estructura real de tablas Supabase.
NO sube nada. Solo lectura.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

from supabase import create_client

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
if not url or not key:
    sys.exit("Faltan Supabase URL/KEY en .env.local")

supabase = create_client(url, key)

tables = ["specimens", "taxonomy", "specimen_media", "species", "families", "genera"]

for table in tables:
    try:
        data = supabase.table(table).select("*").limit(1).execute()
        print(f"--- COLUMNAS EN {table.upper()} ---")
        if data.data:
            cols = list(data.data[0].keys())
            print(cols)
            # muestra 1 fila resumida (valores cortos)
            sample = {
                k: (str(v)[:80] + "…" if v is not None and len(str(v)) > 80 else v)
                for k, v in data.data[0].items()
            }
            print(f"ejemplo: {sample}")
        else:
            print("Tabla vacía (0 filas) — no se pueden inferir columnas por SELECT *")
    except Exception as e:
        print(f"Error accediendo a {table}: {e}")
    print()
