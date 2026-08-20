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

# 1. Limpiamos los anteriores para evitar duplicados basura
for fam in ['Scorpion', 'Spirostreptida', 'Scolopendromorpha']:
    supabase.table('specimens').delete().eq('familia', fam).execute()

# 2. Insertamos los tres registros limpios y correctos
registros = [
    {
        'familia': 'Scorpion',
        'genero': 'Scorpion',
        'species_name': 'Scorpion sp.',
        'localidad': 'Colección General'
    },
    {
        'familia': 'Spirostreptida',
        'genero': 'Archispirostreptus',
        'species_name': 'Archispirostreptus gigas',
        'localidad': 'Colección General'
    },
    {
        'familia': 'Scolopendromorpha',
        'genero': 'Scolopendra',
        'species_name': 'Scolopendra gigantea',
        'localidad': 'Colección General'
    }
]

for reg in registros:
    supabase.table('specimens').insert(reg).execute()
    print(f"✓ Registrado correctamente: {reg['species_name']}")

print("¡Todos los nuevos especímenes han sido sincronizados con éxito!")
