import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

datos = [
    {"familia": "Blattodea", "s_name": "Megaloblatta longipennis", "gen": "Megaloblatta", "esp": "longipennis"},
    {"familia": "Blattodea", "s_name": "Periplaneta gigantea", "gen": "Periplaneta", "esp": "gigantea"},
    {"familia": "Hemiptera", "s_name": "Belostoma giganteus", "gen": "Belostoma", "esp": "giganteus"},
    {"familia": "Hemiptera", "s_name": "Belostoma gigantea", "gen": "Belostoma", "esp": "gigantea"},
    {"familia": "Hemiptera", "s_name": "Quesada gigas", "gen": "Quesada", "esp": "gigas"}
]

for d in datos:
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
        res = supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"✅ {d['s_name']} actualizado correctamente.")
    except Exception as e:
        print(f"❌ Error al subir {d['s_name']}: {str(e)}")
