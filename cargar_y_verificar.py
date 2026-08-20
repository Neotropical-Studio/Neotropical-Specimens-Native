import os
import re
import pandas as pd
from supabase import create_client

# 1. Intentar obtener la URL y la API KEY desde tu archivo .env.local o .env
url = None
key = None

for env_filename in [".env.local", ".env"]:
    if os.path.exists(env_filename):
        with open(env_filename, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("#") or not line:
                    continue
                if "SUPABASE_URL" in line or "NEXT_PUBLIC_SUPABASE_URL" in line:
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                if "SERVICE_ROLE" in line:
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                elif not key and ("SUPABASE_ANON_KEY" in line or "NEXT_PUBLIC_SUPABASE_ANON_KEY" in line):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")

# Valores de respaldo si no se encuentran en los archivos .env
if not url:
    url = "https://pcoqtffxcemcmsjagkdo.supabase.co"

print(f"🔑 URL detectada: {url}")
if key:
    print(f"🔑 API Key encontrada en configuración local (inicia con: {key[:10]}...)")
else:
    print("⚠️ No se encontró la API Key en .env.local. Por favor verifica tus credenciales.")
    exit(1)

supabase = create_client(url, key)

# 2. Probar conexión
try:
    res = supabase.table("species").select("*", count="exact").limit(1).execute()
    print(f"✅ Conexión exitosa a Supabase. Registros actuales en la tabla: {res.count}")
except Exception as e:
    print(f"❌ Error de conexión: {e}")
    exit(1)

# 3. Procesar e insertar archivos desde la carpeta ./data
ruta_carpeta = "./data"
nuevos_insertados = 0
ya_existian = 0

for root, dirs, files in os.walk(ruta_carpeta):
    for file in files:
        if not (file.endswith(".csv") or file.endswith(".xlsx")):
            continue
            
        file_path = os.path.join(root, file)
        print(f"\n📂 Procesando: {file}")
        
        try:
            if file.endswith(".csv"):
                try:
                    df = pd.read_csv(file_path, encoding='utf-8')
                except:
                    df = pd.read_csv(file_path, encoding='latin1')
            else:
                df = pd.read_excel(file_path)
            
            # Buscar columna de nombre
            columna_nombre = None
            for col in df.columns:
                col_lower = str(col).lower()
                if any(p in col_lower for p in ["scientific", "científ", "species", "especie", "taxa", "nombre", "name"]):
                    if "común" not in col_lower and "common" not in col_lower:
                        columna_nombre = col
                        break
            
            if not columna_nombre:
                print(f"   ⚠️ No se detectó columna válida en {file}")
                continue
                
            for index, row in df.iterrows():
                val = row[columna_nombre]
                if pd.notna(val) and str(val).strip():
                    nombre = str(val).strip()
                    try:
                        supabase.table("species").insert({"species_name": nombre}).execute()
                        nuevos_insertados += 1
                        print(f"   ✓ Registrado nuevo: {nombre}")
                    except Exception as err:
                        if "23505" in str(err) or "duplicate" in str(err).lower():
                            ya_existian += 1
                        else:
                            print(f"   ❌ Error al insertar '{nombre}': {err}")
                            
        except Exception as e:
            print(f"❌ Error en archivo {file}: {e}")

print(f"\n==========================================")
print(f"🎉 PROCESO COMPLETADO")
print(f"✨ Nuevas especies registradas: {nuevos_insertados}")
print(f"ℹ️ Especies que ya existían previamente: {ya_existian}")
print(f"==========================================")
