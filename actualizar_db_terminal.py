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

# Forzar la actualización de los códigos limpios directamente en Supabase
actualizaciones = [
    {'familia': 'Scorpion', 'code': 'SCORP-001'},
    {'familia': 'Spirostreptida', 'code': 'SPIRO-001'},
    {'familia': 'Scolopendromorpha', 'code': 'SCOLO-001'}
]

for item in actualizaciones:
    supabase.table('specimens').update({'specimen_code': item['code']}).ilike('familia', item['familia']).execute()
    print(f"✓ Familia '{item['familia']}' actualizada con el código: {item['code']}")

print("¡Sincronización completada en la base de datos!")
