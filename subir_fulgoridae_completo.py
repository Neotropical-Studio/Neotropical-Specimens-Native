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

# Lista completa y corregida para asegurar que las faltantes estén incluidas
especies = [
    # Familia Fulgoridae
    ("Fulgoridae", "Aracynthus sanguineus", "Aracynthus", "sanguineus"),
    ("Fulgoridae", "Fulgora laternaria", "Fulgora", "laternaria"),
    ("Fulgoridae", "Cathedra serrata", "Cathedra", "serrata"),
    ("Fulgoridae", "Phrictus buchei", "Phrictus", "buchei"),
    ("Fulgoridae", "Retinus dilatatus", "Retinus", "dilatatus"),
    ("Fulgoridae", "Phenax variegata", "Phenax", "variegata"),
    ("Fulgoridae", "Amantia sp.", "Amantia", "sp."),
    
    # Familia Homoptera(Cicadidae)
    ("Homoptera(Cicadidae)", "Membracis lunata", "Membracis", "lunata"),
    ("Homoptera(Cicadidae)", "Membracis foliata", "Membracis", "foliata"),
    ("Homoptera(Cicadidae)", "Cicadidae gen. sp.", "Cicadidae", "gen. sp.")
]

print(f"🔄 Sincronizando {len(especies)} registros en Supabase...")

for fam, s_name, gen, esp in especies:
    # Generar el media_url basado en el nombre
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
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] {s_name} -> Familia: {fam}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso completado! Todas las especies, incluyendo las faltantes, están sincronizadas.")
