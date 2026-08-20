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

CATEGORIA_OFICIAL = "Moths(lepidoptera) Nocturne"
FAMILIA_EXACTA = "Arctiidae"

especies_arctiidae = [
    {"genero": "Belemnia", "especie": "splendens", "species_name": "Belemnia splendens", "subfamilia": "Pericopinae", "media_url": "belemnia-splendens-01.jpg"},
    {"genero": "Chetone", "especie": "hystrio", "species_name": "Chetone hystrio", "subfamilia": "Pericopinae", "media_url": "chetone-hystrio-01.jpg"},
    {"genero": "Chetone", "especie": "ithrana", "species_name": "Chetone ithrana", "subfamilia": "Pericopinae", "media_url": "chetone-ithrana-01.jpg"},
    {"genero": "Chetone", "especie": "phyleis", "species_name": "Chetone phyleis", "subfamilia": "Pericopinae", "media_url": "chetone-phyleis-01.jpg"},
    {"genero": "Chetone", "especie": "plagifera", "species_name": "Chetone plagifera", "subfamilia": "Pericopinae", "media_url": "chetone-plagifera-01.jpg"},
    {"genero": "Dysschema", "especie": "larvata", "species_name": "Dysschema larvata", "subfamilia": "Pericopinae", "media_url": "dysschema-larvata-01.jpg"},
    {"genero": "Dysschema", "especie": "tricolor", "species_name": "Dysschema tricolor", "subfamilia": "Pericopinae", "media_url": "dysschema-tricolor-01.jpg"},
    {"genero": "Erateina", "especie": "julia", "species_name": "Erateina julia", "subfamilia": "Larentiinae", "media_url": "erateina-julia-01.jpg"},
    {"genero": "Histioea", "especie": "amazonica", "species_name": "Histioea amazonica", "subfamilia": "Ctenuchinae", "media_url": "histioea-amazonica-01.jpg"},
    {"genero": "Histioea", "especie": "magistrae", "species_name": "Histioea magistrae", "subfamilia": "Ctenuchinae", "media_url": "histioea-magistrae-01.jpg"},
    {"genero": "Histioea", "especie": "proserpina", "species_name": "Histioea proserpina", "subfamilia": "Ctenuchinae", "media_url": "histioea-proserpina-01.jpg"},
    {"genero": "Hypocrita", "especie": "aletta", "species_name": "Hypocrita aletta", "subfamilia": "Pericopinae", "media_url": "hypocrita-aletta-01.jpg"},
    {"genero": "Hypocrita", "especie": "bicolora", "species_name": "Hypocrita bicolora", "subfamilia": "Pericopinae", "media_url": "hypocrita-bicolora-01.jpg"},
    {"genero": "Hypocrita", "especie": "confluens", "species_name": "Hypocrita confluens", "subfamilia": "Pericopinae", "media_url": "hypocrita-confluens-01.jpg"},
    {"genero": "Hypocrita", "especie": "drucei", "species_name": "Hypocrita drucei", "subfamilia": "Pericopinae", "media_url": "hypocrita-drucei-01.jpg"},
    {"genero": "Hypocrita", "especie": "eulalia", "species_name": "Hypocrita eulalia", "subfamilia": "Pericopinae", "media_url": "hypocrita-eulalia-01.jpg"},
    {"genero": "Hypocrita", "especie": "plagifera", "species_name": "Hypocrita plagifera", "subfamilia": "Pericopinae", "media_url": "hypocrita-plagifera-01.jpg"},
    {"genero": "Hypocrita", "especie": "sp.", "species_name": "Hypocrita sp.", "subfamilia": "Pericopinae", "media_url": "hypocrita-sp-01.jpg"},
    {"genero": "Hypocrita", "especie": "temperata", "species_name": "Hypocrita temperata", "subfamilia": "Pericopinae", "media_url": "hypocrita-temperata-01.jpg"},
    {"genero": "Milionia", "especie": "drucei", "species_name": "Milionia drucei", "subfamilia": "Ennominae", "media_url": "milionia-drucei-01.jpg"},
    {"genero": "Notophyson", "especie": "heliconides", "species_name": "Notophyson heliconides", "subfamilia": "Pericopinae", "media_url": "notophyson-heliconides-01.jpg"}
]

print(f"🚀 Registrando {len(especies_arctiidae)} especímenes nocturnos bajo la familia '{FAMILIA_EXACTA}'...")

for item in especies_arctiidae:
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
