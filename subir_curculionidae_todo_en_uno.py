import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

# Datos integrados (sin necesidad de archivo CSV externo)
especies = [
    ("Curculionidae", "Cryptorhynchus lapathi", "Cryptorhynchus", "lapathi"),
    ("Curculionidae", "Lixus angustatus", "Lixus", "angustatus"),
    ("Curculionidae", "Dendroctonus frontalis", "Dendroctonus", "frontalis"),
    ("Curculionidae", "Hylobius abietis", "Hylobius", "abietis"),
    ("Curculionidae", "Curculio nucum", "Curculio", "nucum"),
    ("Curculionidae", "Cosmopolites sordidus", "Cosmopolites", "sordidus"),
    ("Curculionidae", "Rhynchophorus palmarum", "Rhynchophorus", "palmarum"),
    ("Curculionidae", "Gonipterus scutellatus", "Gonipterus", "scutellatus"),
    ("Curculionidae", "Listroderes argentinensis", "Listroderes", "argentinensis"),
    ("Curculionidae", "Listroderes costirostris", "Listroderes", "costirostris"),
    ("Curculionidae", "Rhynchophorus ferrugineus", "Rhynchophorus", "ferrugineus"),
    ("Curculionidae", "Hypothenemus hampei", "Hypothenemus", "hampei"),
    ("Curculionidae", "Anthonomus grandis", "Anthonomus", "grandis"),
    ("Curculionidae", "Anthonomus eugenii", "Anthonomus", "eugenii"),
    ("Curculionidae", "Homalinotus nodipennis", "Homalinotus", "nodipennis"),
    ("Curculionidae", "Rhinostomus barbirostris", "Rhinostomus", "barbirostris"),
    ("Curculionidae", "Metamasius sp.", "Metamasius", "sp.")
]

print(f"🔄 Iniciando subida de {len(especies)} especies...")

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

print("\n✨ ¡Proceso finalizado!")
