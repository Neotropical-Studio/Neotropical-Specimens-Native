import os
import csv
from supabase import create_client

# 1. Cargar credenciales oficiales desde .env.local
supabase_url = None
supabase_key = None

for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    parts = line.strip().split('=', 1)
                    k = parts[0].strip()
                    v = parts[1].strip().strip('"').strip("'")
                    if 'SUPABASE_URL' in k:
                        supabase_url = v
                    elif 'SERVICE_ROLE' in k or 'SUPABASE_KEY' in k:
                        supabase_key = v
                        if 'SERVICE_ROLE' in k:
                            break

if not supabase_url or not supabase_key:
    print("Error: No se encontraron las credenciales en el entorno.")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

# 2. Crear el archivo CSV localmente de forma limpia
csv_content = """familia,genero,species_name,localidad
Scorpion,Scorpion,Scorpion sp.,Colección General
Spirostreptida,Archispirostreptus,Archispirostreptus gigas,Colección General
Scolopendromorpha,Scolopendra,Scolopendra gigantea,Colección General"""

with open('nuevos_especimenes.csv', 'w', encoding='utf-8') as f:
    f.write(csv_content.strip())

# 3. Leer el CSV e insertar fila por fila en Supabase
with open('nuevos_especimenes.csv', mode='r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    count = 0
    for row in reader:
        try:
            supabase.table('specimens').insert(row).execute()
            count += 1
            print(f"✓ Subido con éxito ({count}): {row['species_name']}")
        except Exception as e:
            print(f"✗ Error al subir {row['species_name']}: {e}")

print("¡Proceso de subida completado con éxito!")
