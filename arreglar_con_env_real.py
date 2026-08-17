import os
from supabase import create_client

supabase_url = None
supabase_key = None

# Buscar credenciales reales en la configuración local de Next.js
for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        print(f"Leyendo credenciales desde {env_file}...")
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
                            break # Priorizar service role

if not supabase_url or not supabase_key:
    print("Error crítico: No se pudieron extraer las credenciales del archivo local.")
    exit(1)

print("¡Conectando a Supabase con las llaves oficiales del proyecto...")
supabase = create_client(supabase_url, supabase_key)

data_scorpion = {
    'familia': 'Scorpion',
    'genero': 'Scorpion',
    'species_name': 'Scorpion sp.',
    'localidad': 'Colección General'
}

existing = supabase.table('specimens').select('*').eq('familia', 'Scorpion').execute()
if existing.data:
    supabase.table('specimens').update(data_scorpion).eq('familia', 'Scorpion').execute()
    print("¡Registro de Scorpion actualizado con éxito!")
else:
    supabase.table('specimens').insert(data_scorpion).execute()
    print("¡Registro de Scorpion insertado con éxito!")
