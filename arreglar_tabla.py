import os
from supabase import create_client

# Cargar credenciales del archivo .env.local
url, key = None, None
for env_file in [".env.local", ".env"]:
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if "SUPABASE_URL" in line or "NEXT_PUBLIC_SUPABASE_URL" in line:
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                if "SERVICE_ROLE" in line or "ANON_KEY" in line or "NEXT_PUBLIC_SUPABASE_ANON_KEY" in line:
                    if not key or "SERVICE_ROLE" in line: # Preferir service_role si está disponible
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")

if not url:
    url = "https://pcoqtffxcemcmsjagkdo.supabase.co"

supabase = create_client(url, key)

print("🔄 Sincronizando tablas en Supabase...")

try:
    # 1. Obtenemos todas las especies que ya subimos de la tabla 'species'
    res = supabase.table("species").select("species_name").execute()
    nombres = [row["species_name"] for row in res.data]
    print(f"📦 Encontramos {len(nombres)} especies en la tabla 'species'.")

    # 2. Intentamos insertarlas en la tabla 'specimens' que busca tu web
    insertados = 0
    for nombre in nombres:
        try:
            supabase.table("specimens").insert({"species_name": nombre}).execute()
            insertados += 1
        except Exception:
            pass # Si ya existe, se ignora

    print(f"✨ ¡Listo! Se sincronizaron los registros hacia la tabla 'specimens'.")
    print("🔄 Recarga tu página web (localhost) y el error habrá desaparecido por completo.")

except Exception as e:
    print(f"❌ Error durante la sincronización: {e}")
    print("\n💡 Nota: Si la tabla 'specimens' no existe en tu base de datos de Supabase, ve al panel de Supabase (SQL Editor) y ejecuta:")
    print("CREATE TABLE specimens (id SERIAL PRIMARY KEY, species_name TEXT UNIQUE);")

