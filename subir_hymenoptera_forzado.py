import csv
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

with open('hymenoptera.csv', mode='r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    for row in reader:
        row.pop('superfamilia', None)
        # Forzamos el campo familia para que coincida con lo que busca tu web
        row['familia'] = 'Hymenoptera'
        
        try:
            supabase.table('specimens').insert(row).execute()
            print(f"Subido: {row['especie']}")
        except Exception as e:
            print(f"Error: {e}")

print("¡Listo! Actualiza tu página web.")
