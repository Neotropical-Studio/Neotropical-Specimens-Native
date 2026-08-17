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
                    if 'SUPABASE_URL' in k:
                        url = v
                    elif 'SUPABASE_KEY' in k or 'SERVICE_ROLE' in k:
                        key = v

db = create_client(url, key)

updates = [
    {'familia': 'Scorpion', 'code': 'SCORP-001'},
    {'familia': 'Spirostreptida', 'code': 'SPIRO-001'},
    {'familia': 'Scolopendromorpha', 'code': 'SCOLO-001'}
]

for item in updates:
    res = db.table('specimens').select('id').eq('familia', item['familia']).execute()
    if res.data:
        for row in res.data:
            db.table('specimens').update({'specimen_code': item['code']}).eq('id', row['id']).execute()
        print(f"✓ Actualizado: {item['familia']} -> {item['code']}")
    else:
        print(f"⚠️ No se encontró la familia: {item['familia']}")

print("Proceso finalizado en la terminal.")
