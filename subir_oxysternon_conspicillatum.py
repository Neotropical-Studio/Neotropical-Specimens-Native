import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

s_name = "Oxysternon conspicillatum"
slug = "oxysternon-conspicillatum-01.jpg"

record = {
    "categoria": "Beetles (Coleoptera)",
    "familia": "Scarabaeidae",
    "genero": "Oxysternon",
    "especie": "conspicillatum",
    "species_name": s_name,
    "media_url": slug,
    "rubro": "ESPECIMENES_SECOS",
    "region": "Peru",
    "status": "IN_STOCK"
}

try:
    supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
    print(f"  [✓] Registrado: {s_name}")
except Exception as e:
    print(f"  ❌ Error en {s_name}: {e}")
