from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInR5cCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Consultamos el conteo total de registros en la tabla species
response = supabase.table("species").select("*", count="exact").limit(1).execute()
total_registros = response.count

print(f"\n📊 Total general de especies/especímenes en Supabase: {total_registros}")

# Mostramos una muestra de diferentes registros para comprobar que hay de varias familias
muestra = supabase.table("species").select("species_name").limit(15).execute()
print("\n--- Muestra general de la base de datos ---")
for i, row in enumerate(muestra.data):
    print(f"{i+1}. {row['species_name']}")
