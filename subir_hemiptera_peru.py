import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales")
    exit(1)

supabase = create_client(url, key)

# Lista de especies (Hemiptera) presentes en Perú bajo sus familias correspondientes
especies = [
    ("Cicadidae", "Quesada gigas", "Quesada", "gigas"),
    ("Cicadidae", "Carineta fasciculata", "Carineta", "fasciculata"),
    ("Coreidae", "Anisoscelis foliaceus", "Anisoscelis", "foliaceus"),
    ("Pentatomidae", "Edessa rufomarginata", "Edessa", "rufomarginata"),
    ("Reduviidae", "Zelus nugax", "Zelus", "nugax"),
    ("Pyrrhocoridae", "Dysdercus peruvianus", "Dysdercus", "peruvianus"),
    ("Belostomatidae", "Belostoma foveolatum", "Belostoma", "foveolatum")
]

print(f"🔄 Registrando {len(especies)} especies de Hemiptera (Perú)...")

for fam, s_name, gen, esp in especies:
    # Generar el media_url
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Insects (Arthropoda)",
        "familia": fam,  # Aquí va la familia específica
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
        print(f"  [✓] {s_name} -> Familia: {fam}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso completado! Tus hemípteros peruanos ya están en el catálogo.")
