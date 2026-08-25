import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(".env.local")
conn = psycopg2.connect(os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL"))
cursor = conn.cursor()

cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'especie';
""")

print("--- Columnas REALES de la tabla 'especie' en Neon: ---")
for col in cursor.fetchall():
    print(col)

cursor.close()
conn.close()