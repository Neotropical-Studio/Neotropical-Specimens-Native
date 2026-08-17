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
FAMILIA_OFICIAL = "Riodinidae"

# Lista de especímenes Riodinidae corregidos y estandarizados
datos_riodinidae = [
    {"genero": "Amarynthis", "especie": "meneria", "species_name": "Amarynthis meneria", "subfamilia": "Riodininae", "media_url": "amarynthis-meneria-01.jpg"},
    {"genero": "Ancyluris", "especie": "meliboeus", "species_name": "Ancyluris meliboeus (Hembra)", "subfamilia": "Riodininae", "media_url": "ancyluris-meliboeus-female-01.jpg"},
    {"genero": "Ancyluris", "especie": "aulestes", "species_name": "Ancyluris aulestes", "subfamilia": "Riodininae", "media_url": "ancyluris-aulestes-01.jpg"},
    {"genero": "Ancyluris", "especie": "endaemon", "species_name": "Ancyluris endaemon", "subfamilia": "Riodininae", "media_url": "ancyluris-endaemon-01.jpg"},
    {"genero": "Ancyluris", "especie": "etias", "species_name": "Ancyluris etias", "subfamilia": "Riodininae", "media_url": "ancyluris-etias-01.jpg"},
    {"genero": "Ancyluris", "especie": "formosissima", "species_name": "Ancyluris formosissima", "subfamilia": "Riodininae", "media_url": "ancyluris-formosissima-01.jpg"},
    {"genero": "Ancyluris", "especie": "mira", "species_name": "Ancyluris mira", "subfamilia": "Riodininae", "media_url": "ancyluris-mira-01.jpg"},
    {"genero": "Ancyluris", "especie": "miranda", "species_name": "Ancyluris miranda", "subfamilia": "Riodininae", "media_url": "ancyluris-miranda-01.jpg"},
    {"genero": "Brachyglenis", "especie": "esthema", "species_name": "Brachyglenis esthema", "subfamilia": "Riodininae", "media_url": "brachyglenis-esthema-01.jpg"},
    {"genero": "Caria", "especie": "trochilus", "species_name": "Caria trochilus", "subfamilia": "Riodininae", "media_url": "caria-trochilus-01.jpg"},
    {"genero": "Chorinea", "especie": "amazon", "species_name": "Chorinea amazon", "subfamilia": "Riodininae", "media_url": "chorinea-amazon-01.jpg"},
    {"genero": "Chorinea", "especie": "batesii", "species_name": "Chorinea batesii", "subfamilia": "Riodininae", "media_url": "chorinea-batesii-01.jpg"},
    {"genero": "Chorinea", "especie": "sylphina", "species_name": "Chorinea sylphina", "subfamilia": "Riodininae", "media_url": "chorinea-sylphina-01.jpg"},
    {"genero": "Cyrenia", "especie": "martia", "species_name": "Cyrenia martia", "subfamilia": "Riodininae", "media_url": "cyrenia-martia-01.jpg"},
    {"genero": "Exoplisia", "especie": "hypoglauca", "species_name": "Exoplisia hypoglauca (Ventral)", "subfamilia": "Riodininae", "media_url": "exoplisia-hypoglauca-ventral-01.jpg"},
    {"genero": "Exoplisia", "especie": "calypso", "species_name": "Exoplisia calypso", "subfamilia": "Riodininae", "media_url": "exoplisia-sp-01.jpg"},
    {"genero": "Helicopis", "especie": "cupido", "species_name": "Helicopis cupido", "subfamilia": "Helicopini", "media_url": "helicopis-cupido-01.jpg"},
    {"genero": "Helicopis", "especie": "gnidus", "species_name": "Helicopis gnidus (Loreto, PE)", "subfamilia": "Helicopini", "media_url": "helicopis-gnidus-loreto-01.jpg"},
    {"genero": "Lasaia", "especie": "agesilas", "species_name": "Lasaia agesilas", "subfamilia": "Riodininae", "media_url": "lasaia-agesilas-01.jpg"},
    {"genero": "Lasaia", "especie": "arsis", "species_name": "Lasaia arsis", "subfamilia": "Riodininae", "media_url": "lasaia-arsis-01.jpg"},
    {"genero": "Lasaia", "especie": "moeros", "species_name": "Lasaia moeros", "subfamilia": "Riodininae", "media_url": "lasaia-moeros-01.jpg"},
    {"genero": "Melanis", "especie": "xarifa", "species_name": "Melanis xarifa", "subfamilia": "Riodininae", "media_url": "melanis-xarifa-01.jpg"},
    {"genero": "Lyropteryx", "especie": "apollonia", "species_name": "Lyropteryx apollonia", "subfamilia": "Riodininae", "media_url": "lyropteryx-apollonia-01.jpg"},
    {"genero": "Mesosemia", "especie": "lorhama", "species_name": "Mesosemia lorhama", "subfamilia": "Riodininae", "media_url": "mesosemia-lorhama-01.jpg"},
    {"genero": "Emesis", "especie": "mandana", "species_name": "Emesis mandana", "subfamilia": "Riodininae", "media_url": "emesis-mandana-01.jpg"},
    {"genero": "Emesis", "especie": "lamia", "species_name": "Emesis lamia", "subfamilia": "Riodininae", "media_url": "emesis-lamia-01.jpg"},
    {"genero": "Monethe", "especie": "albertus", "species_name": "Monethe albertus (Ventral)", "subfamilia": "Riodininae", "media_url": "monethe-albertus-ventral-01.jpg"},
    {"genero": "Necyria", "especie": "bellona", "species_name": "Necyria bellona westwoodi", "subfamilia": "Riodininae", "media_url": "necyria-bellona-westwoodi-01.jpg"},
    {"genero": "Paracella", "especie": "amarynthina", "species_name": "Paracella amarynthina", "subfamilia": "Riodininae", "media_url": "paracella-amarynthina-01.jpg"},
    {"genero": "Rhetus", "especie": "arcius", "species_name": "Rhetus arcius", "subfamilia": "Riodininae", "media_url": "rhetus-arcius-01.jpg"},
    {"genero": "Rhetus", "especie": "dysonii", "species_name": "Rhetus dysonii", "subfamilia": "Riodininae", "media_url": "rhetus-dysonii-01.jpg"},
    {"genero": "Rhetus", "especie": "periander", "species_name": "Rhetus periander", "subfamilia": "Riodininae", "media_url": "rhetus-periander-01.jpg"},
    {"genero": "Siseme", "especie": "neurodes", "species_name": "Siseme neurodes", "subfamilia": "Riodininae", "media_url": "siseme-neurodes-01.jpg"},
    {"genero": "Siseme", "especie": "alectryo", "species_name": "Siseme alectryo", "subfamilia": "Riodininae", "media_url": "siseme-alectryo-01.jpg"},
    {"genero": "Siseme", "especie": "pallas", "species_name": "Siseme pallas heliotis", "subfamilia": "Riodininae", "media_url": "siseme-pallas-heliotis-01.jpg"},
    {"genero": "Stalachtis", "especie": "euterpe", "species_name": "Stalachtis euterpe latefasciata", "subfamilia": "Riodininae", "media_url": "stalachtis-euterpe-latefasciata-01.jpg"}
]

print(f"🚀 Subiendo {len(datos_riodinidae)} registros a la tabla 'specimens'...")

insertados = 0
for row in datos_riodinidae:
    record = {
        "categoria": CATEGORIA_OFICIAL,
        "familia": FAMILIA_OFICIAL,
        "subfamilia": row["subfamilia"],
        "genero": row["genero"],
        "especie": row["especie"],
        "species_name": row["species_name"],
        "media_url": row["media_url"],
        "rubro": "ESPECIMENES_SECOS",
        "region": "Neotropical",
        "status": "IN_STOCK"
    }
    
    try:
        supabase.table('specimens').insert(record).execute()
        insertados += 1
        print(f"  [+] Insertado: {row['species_name']}")
    except Exception as e:
        print(f"  [x] Error insertando {row['species_name']}: {e}")

print(f"\n✨ ¡Ingesta finalizada! Se insertaron {insertados} especímenes correctamente.")
