import os
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjIyN0gsImV4cCI6MjEwMDM5ODI1OH0.lUGmkmImAIg6J-9CsFOJYkpEk-X8kGJZOLHjlUTfGqs"
# Usamos la service role key para tener permisos totales de escritura y borrado
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def limpiar_y_reiniciar():
    print("🧹 Limpiando base de datos actual...")
    # Borrar registros existentes en especímenes y familias para empezar de cero
    try:
        supabase.table("specimens").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("families").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("¡Tablas limpiadas con éxito!")
    except Exception as e:
        print(f"Nota durante la limpieza: {e}")

if __name__ == "__main__":
    limpiar_y_reiniciar()
