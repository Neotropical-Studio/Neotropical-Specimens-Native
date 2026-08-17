import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales en .env")
    exit()

supabase = create_client(url, key)

# Categoria exacta utilizada por el frontend
CATEGORIA_OFICIAL = "Butterflies(lepidoptera) Diurne"

# 1. Obtener todos los especímenes
res = supabase.table('specimens').select('id, categoria, familia, genero, especie').execute()
rows = res.data or []

# 2. Filtrar los especímenes que no tienen la categoría oficial
incorrectos = [r for r in rows if r.get('categoria') != CATEGORIA_OFICIAL]

print(f"📊 Registros encontrados con categoría no oficial: {len(incorrectos)}\n")

for item in incorrectos:
    id_specimen = item['id']
    cat_actual = item.get('categoria')
    fam_actual = item.get('familia')
    
    print(f"Corrigiendo ID {id_specimen}: '{cat_actual}' ➔ '{CATEGORIA_OFICIAL}'")
    
    # Si la familia viene vacía o genérica, forzar Lycaenidae
    fam_nueva = 'Lycaenidae' if not fam_actual or fam_actual.lower() in ['mariposas', 'none', ''] else fam_actual

    supabase.table('specimens').update({
        'categoria': CATEGORIA_OFICIAL,
        'familia': fam_nueva
    }).eq('id', id_specimen).execute()

print("\n✨ ¡Proceso completado! Todos los especímenes ahora pertenecen a Butterflies(lepidoptera) Diurne y a la familia Lycaenidae.")
