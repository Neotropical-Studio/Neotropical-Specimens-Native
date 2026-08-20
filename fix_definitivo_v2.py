import os
from supabase import create_client

url, key = None, None

for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    parts = line.strip().split('=', 1)
                    k, v = parts[0].strip(), parts[1].strip().strip('"').strip("'")
                    if 'URL' in k.upper():
                        url = v
                    elif 'KEY' in k.upper() or 'SECRET' in k.upper() or 'SERVICE' in k.upper():
                        key = v

if not url:
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
if not key:
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not url or not key:
    raise ValueError("Error crítico: No se encontró la URL o la Key en .env.local")

db = create_client(url, key)

db.table('specimens').delete().neq('familia', 'INEXISTENTE').execute()

registros = [
    {
        'familia': 'Scorpion',
        'genero': 'Scorpion',
        'species_name': 'Scorpion sp.',
        'localidad': 'Colección General',
        'specimen_code': 'SCORP-001',
        'stock': 1
    },
    {
        'familia': 'Spirostreptida',
        'genero': 'Archispirostreptus',
        'species_name': 'Archispirostreptus gigas',
        'localidad': 'Colección General',
        'specimen_code': 'SPIRO-001',
        'stock': 1
    },
    {
        'familia': 'Scolopendromorpha',
        'genero': 'Scolopendra',
        'species_name': 'Scolopendra gigantea',
        'localidad': 'Colección General',
        'specimen_code': 'SCOLO-001',
        'stock': 1
    }
]

for reg in registros:
    db.table('specimens').insert(reg).execute()
    print(f"EXITO: {reg['species_name']} insertado con código {reg['specimen_code']}")

print("Sincronización completada con éxito.")
