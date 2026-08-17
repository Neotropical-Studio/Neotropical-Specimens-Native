import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

especies = [
    ("Rutelidae", "Lagochile trigona mancocapaci", "Lagochile", "trigona mancocapaci"),
    ("Rutelidae", "Macraspis andicola", "Macraspis", "andicola"),
    ("Rutelidae", "Macraspis bicincta", "Macraspis", "bicincta"),
    ("Rutelidae", "Macraspis festiva", "Macraspis", "festiva"),
    ("Rutelidae", "Macraspis martinezi auzereli", "Macraspis", "martinezi auzereli"),
    ("Rutelidae", "Macraspis morio", "Macraspis", "morio"),
    ("Rutelidae", "Macraspis olivieri", "Macraspis", "olivieri"),
    ("Rutelidae", "Macraspis pantachloris", "Macraspis", "pantachloris"),
    ("Rutelidae", "Macraspis peruana", "Macraspis", "peruana"),
    ("Rutelidae", "Macraspis peruviana", "Macraspis", "peruviana"),
    ("Rutelidae", "Macraspis xanthosticta", "Macraspis", "xanthosticta"),
    ("Rutelidae", "Pseudothyridium bouchardi", "Pseudothyridium", "bouchardi"),
    ("Rutelidae", "Mesomerodon spinipenne", "Mesomerodon", "spinipenne")
]

print(f"🔄 Iniciando subida de {len(especies)} especies de Rutelinae...")

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

print("\n✨ ¡Proceso de subida de Rutelinae finalizado!")
