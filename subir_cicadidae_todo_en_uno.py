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

# Lista de especies (Categoría de la web: Insects (Arthropoda))
especies = [
    ("Cicadidae", "Cathedra serrata", "Cathedra", "serrata"),
    ("Cicadidae", "Phrictus buchei", "Phrictus", "buchei"),
    ("Cicadidae", "Retinus dilatatus", "Retinus", "dilatatus"),
    ("Cicadidae", "Membracis lunata", "Membracis", "lunata"),
    ("Cicadidae", "Membracis foliata", "Membracis", "foliata"),
    ("Cicadidae", "Cicadidae gen. sp.", "Cicadidae", "gen. sp."),
    ("Cicadidae", "Phenax variegata", "Phenax", "variegata")
]

print(f"🔄 Iniciando subida de {len(especies)} registros de Cicadidae/Hemiptera...")

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
        response = supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] Registrado: {s_name}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso de subida finalizado!")
