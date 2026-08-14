import os
import glob
from supabase import create_client

# Buscar claves en archivos .env
env_files = glob.glob(".env*")
env_vars = {}
for f in env_files:
    if os.path.isfile(f):
        with open(f, "r", encoding="utf-8", errors="ignore") as file:
            for line in file:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip("'\"")

url = env_vars.get("SUPABASE_URL") or env_vars.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY") or env_vars.get("SUPABASE_KEY") or env_vars.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ No se encontraron las credenciales en ningún archivo .env")
    exit(1)

supabase = create_client(url, key)

print("🔍 Buscando duplicados en la base de datos...")
res = supabase.table("specimens").select("id, code, scientific_name").execute()
data = res.data or []

seen = {}
duplicates_to_delete = []

for item in data:
    s_name = (item.get("scientific_name") or "").strip().lower()
    if not s_name:
        continue
    
    if s_name in seen:
        existing = seen[s_name]
        code_item = str(item.get("code") or "").upper()
        code_exist = str(existing.get("code") or "").upper()
        
        # Priorizar mantener el registro nuevo (BR-) y borrar el antiguo (LEGACY)
        if "LEGACY" in code_item and "BR-" in code_exist:
            duplicates_to_delete.append(item["id"])
        elif "LEGACY" in code_exist and "BR-" in code_item:
            duplicates_to_delete.append(existing["id"])
            seen[s_name] = item
        else:
            duplicates_to_delete.append(item["id"])
    else:
        seen[s_name] = item

print(f"Especies únicas identificadas: {len(seen)}")
print(f"Registros duplicados por eliminar: {len(duplicates_to_delete)}")

if duplicates_to_delete:
    for spec_id in duplicates_to_delete:
        supabase.table("specimens").delete().eq("id", spec_id).execute()
    print("✅ ¡Limpieza de duplicados completada con éxito!")
else:
    print("✨ No se encontraron duplicados por nombre científico.")
