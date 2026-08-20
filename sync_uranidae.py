import os
import csv
import traceback
from dotenv import load_dotenv
from supabase import create_client

# 1. Crear el CSV directamente
csv_content = """familia,species_name,genero,especie,locality
Uranidae,Sematura diana,Sematura,diana,Neotropical
Uranidae,Sematura mania empedocles,Sematura,mania empedocles,Neotropical
Uranidae,Sematura mania luna,Sematura,mania luna,Neotropical
Uranidae,Sematura mania lunus,Sematura,mania lunus,Neotropical
Uranidae,Urania fulgens,Urania,fulgens,Neotropical
Uranidae,Urania leilus,Urania,leilus,Neotropical
Uranidae,Urania ripheus,Urania,ripheus,Neotropical"""

with open('uranidae_catalogo.csv', 'w', encoding='utf-8') as f:
    f.write(csv_content)

print("📄 Archivo uranidae_catalogo.csv preparado.")

# 2. Cargar variables de entorno
load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales de Supabase en el archivo .env / .env.local")
    exit(1)

supabase = create_client(url, key)
CATEGORIA_OFICIAL = "Moths (Butterflies Nocturne)"

# 3. Procesar y subir
with open('uranidae_catalogo.csv', mode='r', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    counter = 0
    for row in reader:
        species_name = row['species_name'].strip()
        slug = species_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
        
        record = {
            "categoria": CATEGORIA_OFICIAL,
            "familia": row['familia'].strip(),
            "subfamilia": "Uraniinae",
            "genero": row['genero'].strip(),
            "especie": row['especie'].strip(),
            "species_name": species_name,
            "media_url": slug,
            "rubro": "ESPECIMENES_SECOS",
            "region": row['locality'].strip(),
            "status": "IN_STOCK"
        }
        
        try:
            res = supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
            print(f"  [✓] Registrado: {species_name}")
            counter += 1
        except Exception as e:
            print(f"  [!] Falló upsert en {species_name}, reintentando insert directo...")
            try:
                res = supabase.table('specimens').insert(record).execute()
                print(f"  [✓] Insertado: {species_name}")
                counter += 1
            except Exception as e2:
                print(f"  ❌ Error definitivo al procesar {species_name}:")
                print(f"     Detalle del error: {e2}\n")

print(f"✨ Proceso terminado ({counter}/7 registradas).")
