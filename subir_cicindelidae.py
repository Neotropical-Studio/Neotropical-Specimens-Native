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
    exit(1)

supabase = create_client(url, key)

CATEGORIA_OFICIAL = "Beetles (Coleoptera)"

with open('cicindelidae_catalogo.csv', mode='r', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    counter = 0
    for row in reader:
        species_name = row['species_name'].strip()
        slug = species_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
        
        record = {
            "categoria": CATEGORIA_OFICIAL,
            "familia": row['familia'].strip(),
            "subfamilia": row['subfamilia'].strip(),
            "genero": row['genero'].strip(),
            "especie": species_name.split(' ')[1] if len(species_name.split(' ')) > 1 else "sp.",
            "species_name": species_name,
            "media_url": slug,
            "rubro": "ESPECIMENES_SECOS",
            "region": row['locality'].strip(),
            "status": "IN_STOCK"
        }
        
        try:
            supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
            print(f"  [✓] Registrado: {species_name}")
            counter += 1
        except Exception as e:
            print(f"  ❌ Error en {species_name}: {e}")

print(f"\n✨ ¡Se sincronizaron {counter} registros de Cicindelidae!")
