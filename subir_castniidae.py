import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales en los archivos .env")
    exit()

supabase = create_client(url, key)

# Nombres exactos mapeados desde el Frontend de la web
CATEGORIA_OFICIAL = "Moths (Butterflies Nocturne)"
FAMILIA_EXACTA = "Castnia"

especies_castniidae = [
    {"genero": "Castnia", "especie": "amycus", "species_name": "Castnia amycus", "subfamilia": "Castniinae", "media_url": "castnia-amycus-01.jpg"},
    {"genero": "Castnia", "especie": "cronida", "species_name": "Castnia cronida", "subfamilia": "Castniinae", "media_url": "castnia-cronida-01.jpg"},
    {"genero": "Castnia", "especie": "daedalus", "species_name": "Castnia daedalus", "subfamilia": "Castniinae", "media_url": "castnia-daedalus-01.jpg"},
    {"genero": "Castnia", "especie": "diva", "species_name": "Castnia diva", "subfamilia": "Castniinae", "media_url": "castnia-diva-01.jpg"},
    {"genero": "Castnia", "especie": "evaltheodes", "species_name": "Castnia evaltheodes", "subfamilia": "Castniinae", "media_url": "castnia-evaltheodes-01.jpg"},
    {"genero": "Castnia", "especie": "heliconioides", "species_name": "Castnia heliconioides", "subfamilia": "Castniinae", "media_url": "castnia-heliconioides-01.jpg"},
    {"genero": "Castnia", "especie": "huebneri", "species_name": "Castnia huebneri", "subfamilia": "Castniinae", "media_url": "castnia-huebneri-01.jpg"},
    {"genero": "Castnia", "especie": "inca", "species_name": "Castnia inca", "subfamilia": "Castniinae", "media_url": "castnia-inca-01.jpg"},
    {"genero": "Castnia", "especie": "marcus", "species_name": "Castnia marcus", "subfamilia": "Castniinae", "media_url": "castnia-marcus-01.jpg"},
    {"genero": "Castnia", "especie": "papilionaris", "species_name": "Castnia papilionaris", "subfamilia": "Castniinae", "media_url": "castnia-papilionaris-01.jpg"},
    {"genero": "Castnia", "especie": "pelasgus", "species_name": "Castnia pelasgus", "subfamilia": "Castniinae", "media_url": "castnia-pelasgus-01.jpg"},
    {"genero": "Castnia", "especie": "psittacus", "species_name": "Castnia psittacus", "subfamilia": "Castniinae", "media_url": "castnia-psittacus-01.jpg"},
    {"genero": "Castnia", "especie": "rutila", "species_name": "Castnia rutila", "subfamilia": "Castniinae", "media_url": "castnia-rutila-01.jpg"},
    {"genero": "Castnia", "especie": "sp.", "species_name": "Castnia sp.", "subfamilia": "Castniinae", "media_url": "castnia-sp-01.jpg"},
    {"genero": "Castnia", "especie": "therapon", "species_name": "Castnia therapon", "subfamilia": "Castniinae", "media_url": "castnia-therapon-01.jpg"},
    {"genero": "Castnia", "especie": "uruguayana", "species_name": "Castnia uruguayana", "subfamilia": "Castniinae", "media_url": "castnia-uruguayana-01.jpg"},
    {"genero": "Castnius", "especie": "asteropoide", "species_name": "Castnius asteropoide", "subfamilia": "Castniinae", "media_url": "castnius-asteropoide-01.jpg"}
]

print(f"🚀 Sincronizando {len(especies_castniidae)} especímenes bajo Categoría '{CATEGORIA_OFICIAL}' y Familia '{FAMILIA_EXACTA}'...")

for item in especies_castniidae:
    record = {
        "categoria": CATEGORIA_OFICIAL,
        "familia": FAMILIA_EXACTA,
        "subfamilia": item["subfamilia"],
        "genero": item["genero"],
        "especie": item["especie"],
        "species_name": item["species_name"],
        "media_url": item["media_url"],
        "rubro": "ESPECIMENES_SECOS",
        "region": "Neotropical",
        "status": "IN_STOCK"
    }
    
    try:
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] Actualizado: {item['species_name']}")
    except Exception as e:
        print(f"  [!] Error al actualizar {item['species_name']}: {e}")

print("\n✨ ¡Sincronización completada!")
