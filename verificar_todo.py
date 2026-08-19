import os
from supabase import create_client, Client

# Credenciales directas para evitar fallos de lectura en el archivo .env
url: str = "https://pcoqtffxcemcmsjagkdo.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase: Client = create_client(url, key)

try:
    response = supabase.table("species").select("*", count="exact").limit(1).execute()
    print("¡Conexión y lectura exitosa a Supabase!")
    print("Datos encontrados:", response.data)
except Exception as e:
    print("Error al conectar:", e)