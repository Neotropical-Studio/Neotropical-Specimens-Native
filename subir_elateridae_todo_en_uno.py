import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

# Lista de especies de Elateridae
especies = [
    ("Elateridae", "Chalcolepidius porcatus pardalis", "Chalcolepidius", "porcatus pardalis"),
    ("Elateridae", "Chalcolepidius porcatus", "Chalcolepidius", "porcatus"),
    ("Elateridae", "Chalcolepidius virens", "Chalcolepidius", "virens"),
    ("Elateridae", "Pyrophorus noctilucus", "Pyrophorus", "noctilucus"),
    ("Elateridae", "Semiotus imperialis", "Semiotus", "imperialis"),
    ("Elateridae", "Semiotus intermedius", "Semiotus", "intermedius"),
    ("Elateridae", "Semiotus angulatus", "Semiotus", "angulatus"),
    ("Elateridae", "Semiotus distinctus", "Semiotus", "distinctus"),
    ("Elateridae", "Semiotus ligneus", "Semiotus", "ligneus"),
    ("Elateridae", "Semiotus sanguinicollis", "Semiotus", "sanguinicollis")
]

print(f"🔄 Iniciando subida de {len(especies)} especies de Elateridae...")

for fam, s_name, gen, esp in especies:
    # Generar slug para media_url
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

print("\n✨ ¡Proceso de subida de Elateridae finalizado!")
