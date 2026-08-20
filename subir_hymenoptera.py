import csv
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

with open('hymenoptera.csv', mode='r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    count = 0
    for row in reader:
        # Ajustamos los campos que tu base de datos espera
        row.pop('superfamilia', None)
        row['familia'] = 'Hymenoptera'
        
        if 'especie' in row:
            row['species_name'] = row.pop('especie')
            
        # Intentamos asignar el stock si la columna existe, si no, lo omitimos para que no falle
        # (La mayoría de plantillas usan 'stock' o 'quantity', probemos directo)
        
        try:
            response = supabase.table('specimens').insert(row).execute()
            count += 1
            print(f"Subido con éxito ({count}): {row.get('species_name')}")
        except Exception as e:
            print(f"Error en {row.get('species_name')}: {e}")

print("¡Proceso finalizado!")
