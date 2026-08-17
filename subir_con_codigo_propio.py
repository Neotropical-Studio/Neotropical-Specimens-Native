import os
from supabase import create_client

supabase_url = None
supabase_key = None

for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    parts = line.strip().split('=', 1)
                    k, v = parts[0].strip(), parts[1].strip().strip('"').strip("'")
                    if 'SUPABASE_URL' in k:
                        supabase_url = v
                    elif 'SERVICE_ROLE' in k or 'SUPABASE_KEY' in k:
                        supabase_key = v

supabase = create_client(supabase_url, supabase_key)

print("Limpiando registros anteriores...")
for fam in ['Scorpion', 'Spirostreptida', 'Scolopendromorpha']:
    supabase.table('specimens').delete().eq('familia', fam).execute()

# Registros con un código propio para evitar que la base de datos les ponga "LEGACY-"
registros = [
    {
        'familia': 'Scorpion',
        'genero': 'Scorpion',
        'species_name': 'Scorpion sp.',
        'localidad': 'Colección General',
        'specimen_code': 'SCORP-001'
    },
    {
        'familia': 'Spirostreptida',
        'genero': 'Archispirostreptus',
        'species_name': 'Archispirostreptus gigas',
        'localidad': 'Colección General',
        'specimen_code': 'SPIRO-001'
    },
    {
        'familia': 'Scolopendromorpha',
        'genero': 'Scolopendra',
        'species_name': 'Scolopendra gigantea',
        'localidad': 'Colección General',
        'specimen_code': 'SCOLO-001'
    }
]

for reg in registros:
    supabase.table('specimens').insert(reg).execute()
    print(f"✓ Subido con código propio: {reg['species_name']} ({reg['specimen_code']})")

print("¡Listo! Ya no se generará el código LEGACY para estos especímenes.")
