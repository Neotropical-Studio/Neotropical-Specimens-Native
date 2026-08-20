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

# 1. Consultar las columnas reales de la tabla para evitar fallos
res = supabase.table('specimens').select('*').limit(1).execute()
columnas_validas = list(res.data[0].keys()) if res.data else ['familia', 'genero', 'species_name', 'localidad']
print("Columnas válidas en Supabase:", columnas_validas)

# 2. Limpiar registros anteriores para evitar duplicados "legacy"
print("Vaciando registros antiguos...")
supabase.table('specimens').delete().neq('familia', 'INEXISTENTE').execute()

# 3. Insertar los especímenes limpios
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
    # Solo enviamos las columnas que la tabla realmente acepta
    data_limpia = {k: v for k, v in reg.items() if k in columnas_validas}
    supabase.table('specimens').insert(data_limpia).execute()
    print(f"✓ Subido con éxito: {reg['species_name']}")

print("¡Proceso completado con éxito desde la terminal!")
