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

CATEGORIA_OFICIAL = "Butterflies(lepidoptera) Diurne"
FAMILIA_EXACTA = "Ithomiidae"  # Cambia esto si en tu menú web se llama diferente

especies_ithomiidae = [
    {"codigo": "ITH-001", "genero": "Forbestra", "especie": "olivencia", "species_name": "Forbestra olivencia olivencia", "subfamilia": "Ithomiinae", "media_url": "forbestra-olivencia-olivencia-01.jpg"},
    {"codigo": "ITH-002", "genero": "Forbestra", "especie": "equicola", "species_name": "Forbestra equicola", "subfamilia": "Ithomiinae", "media_url": "forbestra-equicola-01.jpg"},
    {"codigo": "ITH-003", "genero": "Godyris", "especie": "zavaleta", "species_name": "Godyris zavaleta duilla", "subfamilia": "Ithomiinae", "media_url": "godyris-zavaleta-duilla-01.jpg"},
    {"codigo": "ITH-004", "genero": "Godyris", "especie": "crinippa", "species_name": "Godyris crinippa", "subfamilia": "Ithomiinae", "media_url": "godyris-crinippa-01.jpg"},
    {"codigo": "ITH-005", "genero": "Methona", "especie": "confusa", "species_name": "Methona confusa curvifascia", "subfamilia": "Ithomiinae", "media_url": "methona-confusa-curvifascia-01.jpg"},
    {"codigo": "ITH-006", "genero": "Dircenna", "especie": "loreta", "species_name": "Dircenna loreta", "subfamilia": "Ithomiinae", "media_url": "dircenna-loreta-01.jpg"},
    {"codigo": "ITH-007", "genero": "Dircenna", "especie": "dero", "species_name": "Dircenna dero euchytma", "subfamilia": "Ithomiinae", "media_url": "dircenna-dero-euchytma-01.jpg"},
    {"codigo": "ITH-008", "genero": "Dircenna", "especie": "dircenna", "species_name": "Dircenna dircenna", "subfamilia": "Ithomiinae", "media_url": "dircenna-dircenna-01.jpg"},
]

print(f"🚀 Registrando {len(especies_ithomiidae)} especímenes bajo la familia '{FAMILIA_EXACTA}'...")

for item in especies_ithomiidae:
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
        supabase.table('specimens').insert(record).execute()
        print(f"  [+] Registrado: {item['species_name']}")
    except Exception as e:
        print(f"  [!] Error al registrar {item['species_name']}: {e}")

print("\n✨ ¡Proceso completado!")
