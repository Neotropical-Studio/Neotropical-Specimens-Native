import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales")
    exit(1)

supabase = create_client(url, key)

# Actualizar la familia a Rutilidae para que coincida exactamente con la interfaz
res = supabase.table('specimens').update({"familia": "Rutilidae"}).in_('familia', ['Rutelidae', 'Rutelinae']).execute()

print("✨ ¡Familia actualizada a 'Rutilidae' con éxito!")
