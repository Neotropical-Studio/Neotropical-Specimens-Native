import pandas as pd
import os
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInR5cCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

archivos_encontrados = 0

# Recorremos recursivamente toda la estructura de carpetas desde la raíz
for root, dirs, files in os.walk("."):
    # Evitamos buscar dentro de carpetas del sistema de git o node_modules si las hubiera
    if ".git" in root or "node_modules" in root or ".next" in root:
        continue
        
    for file in files:
        if file.startswith(".") or file.endswith(".py") or file.endswith(".ts") or file.endswith(".json") or file.endswith(".js"):
            continue
            
        file_path = os.path.join(root, file)
        
        if file.endswith(".csv") or file.endswith(".xlsx"):
            archivos_encontrados += 1
            print(f"\n--- Procesando archivo [{archivos_encontrados}]: {file_path} ---")
            try:
                if file.endswith(".csv"):
                    try:
                        df = pd.read_csv(file_path, encoding='utf-8')
                    except:
                        df = pd.read_csv(file_path, encoding='latin1')
                else:
                    df = pd.read_excel(file_path)
                
                # Buscamos de forma flexible la columna del nombre científico
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
                    print(f"⚠️ No se detectó columna válida en {file}. Columnas: {list(df.columns)}")
                    continue
                
                print(f"Usando columna detectada: '{columna_nombre}'")
                
                insertados = 0
                for index, row in df.iterrows():
                    val = row[columna_nombre]
                    if pd.notna(val):
                        specimen_data = {"species_name": str(val).strip()}
                        try:
                            supabase.table("species").insert(specimen_data).execute()
                            insertados += 1
                        except Exception:
                            # Duplicado ignorado automáticamente por la base de datos
                            pass
                print(f"✓ Registros nuevos insertados de este archivo: {insertados}")
                
            except Exception as e:
                print(f"Error procesando {file_path}: {e}")

print(f"\n--- ¡Importación masiva finalizada! Total de archivos analizados: {archivos_encontrados} ---")
