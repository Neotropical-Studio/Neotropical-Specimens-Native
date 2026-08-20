from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

registro = {
    'familia': 'Scorpion',
    'genero': 'Scorpion',
    'species_name': 'Scorpion sp.',
    'localidad': 'Colección General'
}

try:
    response = supabase.table('specimens').insert(registro).execute()
    print("¡Especímen de Scorpion insertado con éxito!")
except Exception as e:
    print("Error:", e)
