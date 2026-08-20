import os
import csv
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales")
    exit()

supabase = create_client(url, key)

CATEGORIA_OFICIAL = "Moths (Butterflies Nocturne)"
FAMILIA_EXACTA = "Castnia"

# Diccionario para agrupar y evitar registros duplicados por especie
especies_unicas = {}

with open('castnia_catalogo.csv', mode='r', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    for row in reader:
        nombre_sp = row['species_name'].strip()
        if nombre_sp not in especies_unicas:
            especies_unicas[nombre_sp] = {
                "genero": row['genero'].strip(),
                "especie": row['especie'].strip(),
                "locality": row['locality'].strip()
            }

print(f"🚀 Sincronizando {len(especies_unicas)} especies únicas con el esquema exacto de Supabase...")

for species_name, item in especies_unicas.items():
    slug = species_name.lower().replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": CATEGORIA_OFICIAL,
        "familia": FAMILIA_EXACTA,
        "subfamilia": "Castniinae",
        "genero": item["genero"],
        "especie": item["especie"],
        "species_name": species_name,
        "media_url": slug,
        "rubro": "ESPECIMENES_SECOS",
        "region": item["locality"] if item["locality"] else "Neotropical",
        "status": "IN_STOCK"
    }
    
    try:
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] Guardado correctamente: {species_name}")
    except Exception as e:
        print(f"  [!] Error al subir {species_name}: {e}")

print("\n✨ ¡Catálogo sincronizado exitosamente!")
