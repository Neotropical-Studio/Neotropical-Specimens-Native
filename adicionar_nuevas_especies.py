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

# Lista de adiciones
especies = [
    ("Blattodea", "Megaloblatta longipennis", "Megaloblatta", "longipennis"),
    ("Blattodea", "Periplaneta gigantea", "Periplaneta", "gigantea"),
    ("Hemiptera", "Belostoma giganteus", "Belostoma", "giganteus")
]

print(f"🔄 Adicionando {len(especies)} especies al catálogo...")

for fam, s_name, gen, esp in especies:
    # Generar el media_url (slug)
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Insects (Arthropoda)",
        "familia": fam,  # Familia ajustada para que coincida con la ruta web
        "genero": gen,
        "especies": esp,
        "species_name": s_name,
        "media_url": slug,
        "rubro": "ESPECIMENES_SECOS",
        "region": "Peru",
        "status": "IN_STOCK"
    }
    
    try:
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] {s_name} -> Categoría/Familia: {fam}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso completado! Recarga tu navegador para ver las adiciones.")
