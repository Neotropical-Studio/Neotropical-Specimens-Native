import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales")
    exit(1)

supabase = create_client(url, key)

# Lista procesada de Fulgoridae con sus datos de tamaño y precio
especies = [
    ("Fulgoridae", "Amantia sp.", "Amantia", "sp.", "6-7.0 cm", "$12.00"),
    ("Fulgoridae", "Aracynthus sanguineus", "Aracynthus", "sanguineus", "5-6.0 cm", "$18.00"),
    ("Fulgoridae", "Fulgora laternaria", "Fulgora", "laternaria", "13-14.0 cm", "$19.00")
]

print(f"🔄 Iniciando subida de {len(especies)} registros de Fulgoridae...")

for fam, s_name, gen, esp, size, price in especies:
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Insects (Arthropoda)",
        "familia": fam,
        "genero": gen,
        "especie": esp,
        "species_name": s_name,
        "media_url": slug,
        "rubro": "ESPECIMENES_SECOS",
        "region": "Peru",
        "status": "IN_STOCK"
    }
    
    try:
        response = supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] Registrado: {s_name} ({size} - {price})")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso de subida de Fulgoridae finalizado!")
