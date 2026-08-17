import pandas as pd
import os
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInR5cCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Usamos la carpeta data local del proyecto que sí tiene los 32 archivos
ruta_carpeta = "./data"

total_intentos = 0
total_exitosos = 0

for root, dirs, files in os.walk(ruta_carpeta):
    for file in files:
        if not (file.endswith(".csv") or file.endswith(".xlsx")):
            continue
            
        file_path = os.path.join(root, file)
        print(f"\n📂 Leyendo: {file}")
        
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
            for col in df.columns:
                col_lower = str(col).lower()
                if any(p in col_lower for p in ["scientific", "científ", "species", "especie", "taxa", "nombre", "name"]):
                    if "común" not in col_lower and "common" not in col_lower:
                        columna_nombre = col
                        break
            
            if not columna_nombre:
                print(f"⚠️ No se encontró columna de nombre en {file}")
                continue
                
            print(f"   Columna usada: '{columna_nombre}' (Total filas: {len(df)})")
            
            # Probamos insertar las primeras 5 filas para verificar conexión y errores
            for index, row in df.head(5).iterrows():
                val = row[columna_nombre]
                if pd.notna(val):
                    total_intentos += 1
                    specimen_data = {"species_name": str(val).strip()}
                    try:
                        res = supabase.table("species").insert(specimen_data).execute()
                        total_exitosos += 1
                        print(f"   ✓ Insertado: {val}")
                    except Exception as err:
                        print(f"   ℹ️ Ya existía o duplicado: {val}")
                        
        except Exception as e:
            print(f"❌ Error leyendo archivo {file}: {e}")

print(f"\n--- Prueba finalizada. Intentos: {total_intentos}, Nuevos o procesados con éxito: {total_exitosos} ---")
