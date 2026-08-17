import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

# Lista de especies limpia y sin duplicados
especies = [
    ("Dynastidae", "Dynastes hercules", "Dynastes", "hercules"),
    ("Dynastidae", "Dynastes neptunus", "Dynastes", "neptunus"),
    ("Dynastidae", "Golofa aeacus", "Golofa", "aeacus"),
    ("Dynastidae", "Golofa claviger", "Golofa", "claviger"),
    ("Dynastidae", "Golofa spatha", "Golofa", "spatha"),
    ("Dynastidae", "Heterogomphus bourcieri", "Heterogomphus", "bourcieri"),
    ("Dynastidae", "Heterogomphus ulysses", "Heterogomphus", "ulysses"),
    ("Dynastidae", "Homophileurus waldenfelsi", "Homophileurus", "waldenfelsi"),
    ("Dynastidae", "Megaceras jason", "Megaceras", "jason"),
    ("Dynastidae", "Megasoma mars", "Megasoma", "mars"),
    ("Dynastidae", "Mitracephala humboldti", "Mitracephala", "humboldtii"),
    ("Dynastidae", "Phileurus didymus", "Phileurus", "didymus")
]

print(f"🔄 Iniciando subida de {len(especies)} especies de Dynastidae...")

for fam, s_name, gen, esp in especies:
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Beetles (Coleoptera)",
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
        print(f"  [✓] Registrado: {s_name}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso de subida de Dynastidae finalizado!")
