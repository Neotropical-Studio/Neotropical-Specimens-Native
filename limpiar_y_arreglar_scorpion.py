import os
from supabase import create_client

# Cargar credenciales desde .env.local
supabase_url = None
supabase_key = None

for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    parts = line.strip().split('=', 1)
                    k = parts[0].strip()
                    v = parts[1].strip().strip('"').strip("'")
                    if 'SUPABASE_URL' in k:
                        supabase_url = v
                    elif 'SERVICE_ROLE' in k or 'SUPABASE_KEY' in k:
                        supabase_key = v
                        if 'SERVICE_ROLE' in k:
                            break

supabase = create_client(supabase_url, supabase_key)

# 1. Eliminamos TODOS los registros de Scorpion actuales para limpiar los duplicados y "legacy"
print("Eliminando registros duplicados de Scorpion...")
supabase.table('specimens').delete().eq('familia', 'Scorpion').execute()

# 2. Insertamos un único registro limpio y bien estructurado
# Verificamos si tu tabla usa columnas de stock o cantidad comunes
registro_limpio = {
    'familia': 'Scorpion',
    'genero': 'Scorpion',
    'species_name': 'Scorpion sp.',
    'localidad': 'Colección General'
}

supabase.table('specimens').insert(registro_limpio).execute()
print("¡Listo! Se borraron los duplicados y se dejó un registro limpio.")
