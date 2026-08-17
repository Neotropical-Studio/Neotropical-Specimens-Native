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

# Lista de especies de la familia Phylliidae
especies = [
    ("Phylliidae", "Phyllium giganteum", "Phyllium", "giganteum"),
    ("Phylliidae", "Phyllium bioculatum", "Phyllium", "bioculatum"),
    ("Phylliidae", "Phyllium philippinicum", "Phyllium", "philippinicum"),
    ("Phylliidae", "Chitoniscus brachysoma", "Chitoniscus", "brachysoma"),
    ("Phylliidae", "Nanophyllium pygmaeum", "Nanophyllium", "pygmaeum")
]

print(f"🔄 Registrando {len(especies)} especies bajo Phylliidae...")

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
        "region": "Global",
        "status": "IN_STOCK"
    }
    
    try:
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] {s_name} -> {fam}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Listo! Recarga tu navegador para verlos en la sección Phylliidae.")
