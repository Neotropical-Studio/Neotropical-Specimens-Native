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

# Actualizar la familia para que coincida exactamente con la interfaz web
res = supabase.table('specimens').update({"familia": "Homoptera(Cicadidae)"}).eq('familia', 'Cicadidae').execute()

print("✨ ¡Familia actualizada a 'Homoptera(Cicadidae)' con éxito!")
