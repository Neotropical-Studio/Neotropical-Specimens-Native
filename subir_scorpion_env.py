import os
from supabase import create_client

# Buscamos las credenciales directamente en los archivos de configuración de tu proyecto
SUPABASE_URL = None
SUPABASE_KEY = None

for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    k, v = line.strip().split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if 'URL' in k and not SUPABASE_URL:
                        SUPABASE_URL = v
                    elif ('SERVICE_ROLE' in k or 'KEY' in k) and not SUPABASE_KEY:
                        SUPABASE_KEY = v

if not SUPABASE_URL or not SUPABASE_KEY:
    # Respaldos manuales por si acaso
    SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
    print("No se encontró clave en .env, usando URL por defecto.")

print(f"Conectando a Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

registro = {
    'familia': 'Scorpion',
    'genero': 'Scorpion',
    'species_name': 'Scorpion sp.',
    'localidad': 'Colección General'
}

try:
    response = supabase.table('specimens').insert(registro).execute()
    print("¡Especímen de Scorpion insertado con éxito absoluto!")
except Exception as e:
    print("Error al insertar:", e)
