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
FAMILIA_EXACTA = "Lycaenidae"

especies_lycaenidae = [
    {"genero": "Evenus", "especie": "regalis", "species_name": "Evenus regalis", "subfamilia": "Theclinae", "media_url": "evenus-regalis-01.jpg"},
    {"genero": "Arcas", "especie": "ducalis", "species_name": "Arcas ducalis", "subfamilia": "Theclinae", "media_url": "arcas-ducalis-01.jpg"},
    {"genero": "Theritas", "especie": "mavors", "species_name": "Theritas mavors", "subfamilia": "Theclinae", "media_url": "theritas-mavors-01.jpg"},
    {"genero": "Rekoa", "especie": "palegon", "species_name": "Rekoa palegon", "subfamilia": "Theclinae", "media_url": "rekoa-palegon-01.jpg"},
    {"genero": "Arawacus", "especie": "aethesa", "species_name": "Arawacus aethesa", "subfamilia": "Theclinae", "media_url": "arawacus-aethesa-01.jpg"},
    {"genero": "Panthiades", "especie": "aeolus", "species_name": "Panthiades aeolus", "subfamilia": "Theclinae", "media_url": "panthiades-aeolus-01.jpg"},
    {"genero": "Pseudolycaena", "especie": "marsyas", "species_name": "Pseudolycaena marsyas", "subfamilia": "Theclinae", "media_url": "pseudolycaena-marsyas-01.jpg"},
    {"genero": "Eumaeus", "especie": "minyas", "species_name": "Eumaeus minyas", "subfamilia": "Theclinae", "media_url": "eumaeus-minyas-01.jpg"},
    {"genero": "Hemiargus", "especie": "haimo", "species_name": "Hemiargus haimo", "subfamilia": "Polyommatinae", "media_url": "hemiargus-haimo-01.jpg"},
    {"genero": "Strymon", "especie": "mulucha", "species_name": "Strymon mulucha", "subfamilia": "Theclinae", "media_url": "strymon-mulucha-01.jpg"}
]

print(f"🚀 Registrando {len(especies_lycaenidae)} especímenes bajo la familia '{FAMILIA_EXACTA}'...")

for item in especies_lycaenidae:
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
