import pandas as pd
import os
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInR5cCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Ruta exacta donde tienes tus archivos en el Escritorio
ruta_carpeta = "/Users/housinsectsoffperu/Desktop/lista butterflies en cvs or xlsx"

archivos_encontrados = 0
total_nuevos = 0

for root, dirs, files in os.walk(ruta_carpeta):
    for file in files:
        if file.startswith(".") or not (file.endswith(".csv") or file.endswith(".xlsx")):
            continue
            
        file_path = os.path.join(root, file)
        archivos_encontrados += 1
        print(f"\n--- Procesando [{archivos_encontrados}]: {file} ---")
        
        try:
            if file.endswith(".csv"):
                try:
                    df = pd.read_csv(file_path, encoding='utf-8')
                except:
                    df = pd.read_csv(file_path, encoding='latin1')
            else:
                df = pd.read_excel(file_path)
            
            # Detectar columna de nombre científico
            columna_nombre = None
            palabras_clave = ["scientific", "científ", "species", "especie", "taxa", "nombre", "name"]
            
            for col in df.columns:
                col_lower = str(col).lower()
                if "común" in col_lower or "common" in col_lower:
                    continue
                if any(palabra in col_lower for palabra in palabras_clave):
                    columna_nombre = col
                    break
            
            if not columna_nombre:
                print(f"⚠️ No se detectó columna en {file}. Columnas: {list(df.columns)}")
                continue
            
            print(f"Columna detectada: '{columna_nombre}'")
            
            insertados = 0
            for index, row in df.iterrows():
                val = row[columna_nombre]
                if pd.notna(val):
                    specimen_data = {"species_name": str(val).strip()}
                    try:
                        supabase.table("species").insert(specimen_data).execute()
                        insertados += 1
                        total_nuevos += 1
                    except Exception:
                        pass
            print(f"✓ Nuevos registros agregados de este archivo: {insertados}")
            
        except Exception as e:
            print(f"Error en {file}: {e}")

print(f"\n--- ¡Proceso finalizado! Total archivos leídos: {archivos_encontrados}. Nuevos registros totales insertados: {total_nuevos} ---")
