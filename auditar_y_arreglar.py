import os
from supabase import create_client

# Cargamos credenciales limpias
SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("--- INSPECCIONANDO TABLA 'specimens' ---")
res = supabase.table('specimens').select('*').execute()

if not res.data:
    print("La tabla está completamente VACÍA.")
else:
    print(f"Total de registros encontrados: {len(res.data)}")
    for i, row in enumerate(res.data):
        print(f"[{i+1}] ID: {row.get('id')} | Familia: {row.get('familia')} | Especie: {row.get('species_name')} | Género: {row.get('genero')}")

# Forzamos la actualización o inserción con los campos exactos que exige la ruta de la web
# La URL muestra: /catalogue/dried-specimens/neotropical/insects-arthropoda/scorpion
print("\n--- ACTUALIZANDO REGISTRO PARA SCORPION ---")
data_scorpion = {
    'familia': 'Scorpion',
    'genero': 'Scorpion',
    'species_name': 'Scorpion sp.',
    'localidad': 'Colección General'
}

# Verificamos si ya existe para actualizarlo o insertarlo limpio
existing = supabase.table('specimens').select('*').eq('familia', 'Scorpion').execute()
if existing.data:
    supabase.table('specimens').update(data_scorpion).eq('familia', 'Scorpion').execute()
    print("Registro de Scorpion actualizado correctamente.")
else:
    supabase.table('specimens').insert(data_scorpion).execute()
    print("Registro de Scorpion insertado correctamente.")
