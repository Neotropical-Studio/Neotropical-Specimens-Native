import os
from supabase import create_client

url, key = "https://pcoqtffxcemcmsjagkdo.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInR5cCI6MTc4NDgyMjI1OCwiZXhwIjoyMTAwMzk4MjU4fQ.kuoPUoNI5o50wKUGaIh1eSZlKw0EgyZI_4-M1ih_D48"
supabase = create_client(url, key)

for tabla in ["species", "specimens", "taxonomy"]:
    try:
        res = supabase.table(tabla).select("*", count="exact").limit(1).execute()
        print(f"📁 Tabla '{tabla}': {res.count} registros encontrados.")
    except Exception as e:
        print(f"❌ La tabla '{tabla}' no existe o dio error: {e}")
