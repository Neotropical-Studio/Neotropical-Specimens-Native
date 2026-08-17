import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

# Verificamos qué hay en Blattodea y Hemiptera
familias_a_buscar = ['Blattodea', 'Hemiptera']

for fam in familias_a_buscar:
    print(f"\n🔍 Buscando registros en familia: {fam}")
    response = supabase.table('specimens').select("*").eq('familia', fam).execute()
    
    if not response.data:
        print("   -> No se encontraron registros.")
    else:
        for item in response.data:
            print(f"   [✓] Encontrado: {item['species_name']} (ID: {item.get('id')})")

