import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Faltan credenciales en el archivo .env o .env.local")
    exit(1)

supabase = create_client(url, key)

# Probemos con un solo registro crítico
record = {
    "categoria": "Insects (Arthropoda)",
    "familia": "Hemiptera",
    "genero": "Belostoma",
    "especie": "giganteus",
    "species_name": "Belostoma giganteus",
    "media_url": "belostoma-giganteus-01.jpg",
    "rubro": "ESPECIMENES_SECOS",
    "region": "Peru",
    "status": "IN_STOCK"
}

print("🔄 Intentando insertar en Supabase...")
response = supabase.table('specimens').upsert(record, on_conflict='media_url').execute()

print("📥 Respuesta de Supabase:")
print(response)

