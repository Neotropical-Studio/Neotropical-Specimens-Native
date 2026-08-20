import os
import json
import ssl
import urllib.request
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: Faltan las credenciales de Supabase.")
    exit()

# Ignorar la verificación de certificado SSL en la consulta local de diagnóstico
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

tables = ['specimens', 'families', 'orders', 'categories', 'category', 'ordenes', 'categorias']

try:
    req = urllib.request.Request(f"{url}/rest/v1/", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, context=ctx) as response:
        schema = json.loads(response.read().decode())
        fetched_tables = list(schema.get('definitions', {}).keys())
        if fetched_tables:
            tables = fetched_tables
            print("📋 Tablas detectadas en la base de datos:\n", tables)
except Exception as e:
    print("⚠️ Usando lista de tablas por defecto:", e)

supabase = create_client(url, key)
print("\n🔍 Escaneando las tablas de la base de datos...\n")

for t in tables:
    try:
        res = supabase.table(t).select('*').execute()
        rows = res.data or []
        for row in rows:
            row_str = str(row)
            if 'Mariposas' in row_str or 'Butterflies' in row_str:
                print(f"📍 Encontrado en tabla '{t}':")
                print("  ", row)
                print("-" * 50)
    except Exception:
        pass

