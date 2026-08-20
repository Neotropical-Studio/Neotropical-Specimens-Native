import os
from supabase import create_client

# Cargar credenciales oficiales desde .env.local
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

# Lista definitiva con los nombres exactos para que la web los reconozca en sus rutas
especimenes_oficiales = [
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

print("Actualizando y asignando registros a sus familias correspondientes...")
for esp in especimenes_oficiales:
    # Verificamos si ya existe por especie o familia para actualizarlo o insertarlo limpio
    existing = supabase.table('specimens').select('*').eq('species_name', esp['species_name']).execute()
    
    if existing.data:
        supabase.table('specimens').update(esp).eq('species_name', esp['species_name']).execute()
        print(f"✓ Actualizado en su familia: {esp['species_name']} -> {esp['familia']}")
    else:
        supabase.table('specimens').insert(esp).execute()
        print(f"✓ Insertado en su familia: {esp['species_name']} -> {esp['familia']}")

print("¡Sincronización de familias completada!")
