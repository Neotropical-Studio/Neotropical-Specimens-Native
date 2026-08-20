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
FAMILIA_EXACTA = "Nymphalidae Actinote-Adelphas -Dyname"

# 1. Actualizar registros existentes de Agrias o Adelpha
print("🔄 Corrigiendo nombre de familia en especímenes existentes...")

try:
    # Actualizar Adelpha
    res1 = supabase.table('specimens').update({
        'familia': FAMILIA_EXACTA,
        'categoria': CATEGORIA_OFICIAL
    }).ilike('genero', 'Adelpha').execute()
    print(f"  [+] Registros de Adelpha actualizados: {len(res1.data or [])}")

    # Actualizar Agrias
    res2 = supabase.table('specimens').update({
        'familia': FAMILIA_EXACTA,
        'categoria': CATEGORIA_OFICIAL
    }).ilike('genero', 'Agrias').execute()
    print(f"  [+] Registros de Agrias actualizados: {len(res2.data or [])}")

except Exception as e:
    print(f"  [!] Aviso al actualizar: {e}")

# 2. Lista completa para asegurar inserción si faltan registros
datos_nymphalidae = [
    # AGRIAS
    {"genero": "Agrias", "especie": "hewitsonius", "species_name": "Agrias hewitsonius stuarti", "subfamilia": "Charaxinae", "media_url": "agrias-hewitsonius-stuarti-01.jpg"},
    {"genero": "Agrias", "especie": "hewitsonius", "species_name": "Agrias hewitsonius stuarti (Hembra)", "subfamilia": "Charaxinae", "media_url": "agrias-hewitsonius-stuarti-female-01.jpg"},
    {"genero": "Agrias", "especie": "hewitsonius", "species_name": "Agrias hewitsonius stuarti (Macho)", "subfamilia": "Charaxinae", "media_url": "agrias-hewitsonius-stuarti-male-01.jpg"},
    {"genero": "Agrias", "especie": "hewitsonius", "species_name": "Agrias hewitsonius beatifica (Hembra)", "subfamilia": "Charaxinae", "media_url": "agrias-hewitsonius-beatifica-female-01.jpg"},
    {"genero": "Agrias", "especie": "beata", "species_name": "Agrias beata stuarti (Macho)", "subfamilia": "Charaxinae", "media_url": "agrias-beata-stuarti-male-01.jpg"},
    {"genero": "Agrias", "especie": "beata", "species_name": "Agrias beata stuarti", "subfamilia": "Charaxinae", "media_url": "agrias-beata-stuarti-01.jpg"},

    # ADELPHA
    {"genero": "Adelpha", "especie": "aethalia", "species_name": "Adelpha aethalia", "subfamilia": "Limenitidinae", "media_url": "adelpha-aethalia-01.jpg"},
    {"genero": "Adelpha", "especie": "attica", "species_name": "Adelpha attica lesbia", "subfamilia": "Limenitidinae", "media_url": "adelpha-attica-lesbia-01.jpg"},
    {"genero": "Adelpha", "especie": "boreas", "species_name": "Adelpha boreas boreas", "subfamilia": "Limenitidinae", "media_url": "adelpha-boreas-boreas-01.jpg"},
    {"genero": "Adelpha", "especie": "cocala", "species_name": "Adelpha cocala cocala", "subfamilia": "Limenitidinae", "media_url": "adelpha-cocala-cocala-01.jpg"},
    {"genero": "Adelpha", "especie": "cytherea", "species_name": "Adelpha cytherea", "subfamilia": "Limenitidinae", "media_url": "adelpha-cytherea-01.jpg"},
    {"genero": "Adelpha", "especie": "delinita", "species_name": "Adelpha delinita", "subfamilia": "Limenitidinae", "media_url": "adelpha-delinita-01.jpg"},
    {"genero": "Adelpha", "especie": "delvita", "species_name": "Adelpha delvita", "subfamilia": "Limenitidinae", "media_url": "adelpha-delvita-01.jpg"},
    {"genero": "Adelpha", "especie": "erotia", "species_name": "Adelpha erotia f. erotia", "subfamilia": "Limenitidinae", "media_url": "adelpha-erotia-f-erotia-01.jpg"},
    {"genero": "Adelpha", "especie": "erotia", "species_name": "Adelpha erotia f. lerna", "subfamilia": "Limenitidinae", "media_url": "adelpha-erotia-f-lerna-01.jpg"},
    {"genero": "Adelpha", "especie": "iphiclus", "species_name": "Adelpha iphiclus", "subfamilia": "Limenitidinae", "media_url": "adelpha-iphiclus-01.jpg"},
    {"genero": "Adelpha", "especie": "irma", "species_name": "Adelpha irma nadja", "subfamilia": "Limenitidinae", "media_url": "adelpha-irma-nadja-01.jpg"},
    {"genero": "Adelpha", "especie": "ixia", "species_name": "Adelpha ixia", "subfamilia": "Limenitidinae", "media_url": "adelpha-ixia-01.jpg"},
    {"genero": "Adelpha", "especie": "ixia", "species_name": "Adelpha ixia f. fundania", "subfamilia": "Limenitidinae", "media_url": "adelpha-ixia-f-fundania-01.jpg"},
    {"genero": "Adelpha", "especie": "jordani", "species_name": "Adelpha jordani jordani", "subfamilia": "Limenitidinae", "media_url": "adelpha-jordani-jordani-01.jpg"},
    {"genero": "Adelpha", "especie": "lara", "species_name": "Adelpha lara", "subfamilia": "Limenitidinae", "media_url": "adelpha-lara-01.jpg"},
    {"genero": "Adelpha", "especie": "lara", "species_name": "Adelpha lara lara", "subfamilia": "Limenitidinae", "media_url": "adelpha-lara-lara-01.jpg"},
    {"genero": "Adelpha", "especie": "melona", "species_name": "Adelpha melona", "subfamilia": "Limenitidinae", "media_url": "adelpha-melona-01.jpg"},
    {"genero": "Adelpha", "especie": "mesentina", "species_name": "Adelpha mesentina", "subfamilia": "Limenitidinae", "media_url": "adelpha-mesentina-01.jpg"},
    {"genero": "Adelpha", "especie": "mythra", "species_name": "Adelpha mythra", "subfamilia": "Limenitidinae", "media_url": "adelpha-mythra-01.jpg"},
    {"genero": "Adelpha", "especie": "phylaca", "species_name": "Adelpha phylaca", "subfamilia": "Limenitidinae", "media_url": "adelpha-phylaca-01.jpg"},
    {"genero": "Adelpha", "especie": "phylaca", "species_name": "Adelpha phylaca f. phylaca", "subfamilia": "Limenitidinae", "media_url": "adelpha-phylaca-f-phylaca-01.jpg"},
    {"genero": "Adelpha", "especie": "phylaca", "species_name": "Adelpha phylaca f. frusina", "subfamilia": "Limenitidinae", "media_url": "adelpha-phylaca-f-frusina-01.jpg"},
    {"genero": "Adelpha", "especie": "saundersii", "species_name": "Adelpha saundersii", "subfamilia": "Limenitidinae", "media_url": "adelpha-saundersii-01.jpg"},
    {"genero": "Adelpha", "especie": "saundersii", "species_name": "Adelpha saundersii saundersii (Macho)", "subfamilia": "Limenitidinae", "media_url": "adelpha-saundersii-saundersii-male-01.jpg"},
    {"genero": "Adelpha", "especie": "serpa", "species_name": "Adelpha serpa celerio", "subfamilia": "Limenitidinae", "media_url": "adelpha-serpa-celerio-01.jpg"},
    {"genero": "Adelpha", "especie": "serpa", "species_name": "Adelpha serpa godmani", "subfamilia": "Limenitidinae", "media_url": "adelpha-serpa-godmani-01.jpg"},
    {"genero": "Adelpha", "especie": "sichaeus", "species_name": "Adelpha sichaeus", "subfamilia": "Limenitidinae", "media_url": "adelpha-sichaeus-01.jpg"},
    {"genero": "Adelpha", "especie": "thoasa", "species_name": "Adelpha thoasa thoasa", "subfamilia": "Limenitidinae", "media_url": "adelpha-thoasa-thoasa-01.jpg"},
    {"genero": "Adelpha", "especie": "ximena", "species_name": "Adelpha ximena", "subfamilia": "Limenitidinae", "media_url": "adelpha-ximena-01.jpg"},
    {"genero": "Adelpha", "especie": "zea", "species_name": "Adelpha zea", "subfamilia": "Limenitidinae", "media_url": "adelpha-zea-01.jpg"}
]

# Verificar si ya existen registrados
existing = supabase.table('specimens').select('species_name').eq('familia', FAMILIA_EXACTA).execute()
existing_names = set(r['species_name'] for r in (existing.data or []))

insertados = 0
for row in datos_nymphalidae:
    if row['species_name'] in existing_names:
        continue
    
    record = {
        "categoria": CATEGORIA_OFICIAL,
        "familia": FAMILIA_EXACTA,
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

print(f"\n✨ ¡Completado! Ahora los registros pertenecen a la familia exactas '{FAMILIA_EXACTA}'.")
