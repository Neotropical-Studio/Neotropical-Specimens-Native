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

print("Purgando absolutamente todos los duplicados y registros legacy...")
familias_a_limpiar = ['Scorpion', 'Spirostreptida', 'Scolopendromorpha', 'Scorpion sp.']
for fam in familias_a_limpiar:
    supabase.table('specimens').delete().eq('familia', fam).execute()
    supabase.table('specimens').delete().eq('species_name', fam).execute()

# Insertar únicamente los registros limpios y correctos
unicos = [
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

for item in unicos:
    supabase.table('specimens').insert(item).execute()
    print(f"✓ Creado limpio: {item['species_name']}")

print("¡Base de datos saneada y sin duplicados!")
