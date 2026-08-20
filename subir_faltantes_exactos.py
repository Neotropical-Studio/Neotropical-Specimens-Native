import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: Faltan credenciales")
    exit(1)

supabase = create_client(url, key)

# Los registros exactos solicitados
registros = [
    {"familia": "Blattodea", "s_name": "Megaloblatta longipennis", "gen": "Megaloblatta", "esp": "longipennis"},
    {"familia": "Blattodea", "s_name": "Periplaneta gigantea", "gen": "Periplaneta", "esp": "gigantea"},
    {"familia": "Hemiptera", "s_name": "Belostoma giganteus", "gen": "Belostoma", "esp": "giganteus"}
]

print(f"🔄 Sincronizando los registros faltantes...")

for d in registros:
    slug = d['s_name'].lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Insects (Arthropoda)",
        "familia": d['familia'],
        "genero": d['gen'],
        "especie": d['esp'],
        "species_name": d['s_name'],
        "media_url": slug,
        "rubro": "ESPECIMENES_SECOS",
        "region": "Peru",
        "status": "IN_STOCK"
    }
    
    try:
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] Actualizado/Guardado: {d['s_name']} -> {d['familia']}")
    except Exception as e:
        print(f"  ❌ Error en {d['s_name']}: {e}")

print("\n✨ ¡Proceso completado con éxito!")
