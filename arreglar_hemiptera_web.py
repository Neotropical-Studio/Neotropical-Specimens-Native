import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales")
    exit(1)

supabase = create_client(url, key)

# Forzamos la familia como "Hemiptera" para que coincida con la vista de tu web
especies = [
    ("Hemiptera", "Belostoma gigantea", "Belostoma", "gigantea"),
    ("Hemiptera", "Quesada gigas", "Quesada", "gigas"),
    ("Hemiptera", "Carineta fasciculata", "Carineta", "fasciculata"),
    ("Hemiptera", "Anisoscelis foliaceus", "Anisoscelis", "foliaceus"),
    ("Hemiptera", "Edessa rufomarginata", "Edessa", "rufomarginata"),
    ("Hemiptera", "Zelus nugax", "Zelus", "nugax"),
    ("Hemiptera", "Dysdercus peruvianus", "Dysdercus", "peruvianus"),
    ("Hemiptera", "Belostoma foveolatum", "Belostoma", "foveolatum")
]

print(f"🔄 Actualizando {len(especies)} registros para la vista de Hemiptera...")

for fam, s_name, gen, esp in especies:
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Insects (Arthropoda)",
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
        print(f"  [✓] {s_name} sincronizado en {fam}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Listo! Recarga tu navegador para verlos en la sección Hemiptera.")
