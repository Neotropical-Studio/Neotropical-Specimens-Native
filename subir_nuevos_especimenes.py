from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Lista estructurada con los nuevos registros que pasaste
especimenes_nuevos = [
    {
        "familia": "Spirostreptidae",
        "genero": "Archispirostreptus",
        "species_name": "Archispirostreptus gigas",
        "localidad": "Colección General"
    },
    {
        "familia": "Scolopendridae",
        "genero": "Scolopendra",
        "species_name": "Scolopendra gigantea",
        "localidad": "Piura, Tumbes, Amazonía"
    },
    {
        "familia": "Scorpionida",
        "genero": "Scorpion",
        "species_name": "Scorpion sp.",
        "localidad": "Colección General"
    }
]

count = 0
for row in especimenes_nuevos:
    try:
        response = supabase.table('specimens').insert(row).execute()
        count += 1
        print(f"Subido con éxito ({count}): {row['species_name']}")
    except Exception as e:
        print(f"Error al subir {row['species_name']}: {e}")

print("¡Carga de nuevos grupos completada con éxito!")
