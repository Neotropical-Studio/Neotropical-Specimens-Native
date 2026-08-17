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

# Lista completa de especies asignadas a Homoptera(Cicadidae)
especies = [
    ("Homoptera(Cicadidae)", "Cathedra serrata", "Cathedra", "serrata"),
    ("Homoptera(Cicadidae)", "Phrictus buchei", "Phrictus", "buchei"),
    ("Homoptera(Cicadidae)", "Retinus dilatatus", "Retinus", "dilatatus"),
    ("Homoptera(Cicadidae)", "Membracis lunata", "Membracis", "lunata"),
    ("Homoptera(Cicadidae)", "Membracis foliata", "Membracis", "foliata"),
    ("Homoptera(Cicadidae)", "Cicadidae gen. sp.", "Cicadidae", "gen. sp."),
    ("Homoptera(Cicadidae)", "Phenax variegata", "Phenax", "variegata"),
    ("Homoptera(Cicadidae)", "Amantia sp.", "Amantia", "sp."),
    ("Homoptera(Cicadidae)", "Aracynthus sanguineus", "Aracynthus", "sanguineus"),
    ("Homoptera(Cicadidae)", "Fulgora laternaria", "Fulgora", "laternaria")
]

print(f"🔄 Registrando {len(especies)} especies bajo Homoptera(Cicadidae)...")

for fam, s_name, gen, esp in especies:
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
        print(f"  [✓] {s_name} -> {fam}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Listo! Todos los registros han sido actualizados en Homoptera.")
