import pandas as pd
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

print("Conectando a Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

df = pd.read_csv("Catalogo_Importacion_Brassolini.csv")
print(f"Cargados {len(df)} registros desde el CSV.")

print("Insertando en la tabla 'species'...")
for index, row in df.iterrows():
    specimen_data = {
        "species_name": str(row["Nombre científico"]) if pd.notna(row["Nombre científico"]) else None,
    }
    
    try:
        supabase.table("species").insert(specimen_data).execute()
        print(f"[{index+1}/41] Insertado: {specimen_data['species_name']}")
    except Exception as e:
        print(f"Error en registro {index+1}: {e}")

print("¡Importación finalizada!")
