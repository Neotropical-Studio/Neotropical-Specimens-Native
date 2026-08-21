import os
import psycopg2
from dotenv import load_dotenv

# Carga el archivo .env.local de tu proyecto
load_dotenv(".env.local")

DATABASE_URL = os.getenv("DATABASE_URL")

def conectar_bd():
    print(f"🔍 Intentando conectar...")
    try:
        conexion = psycopg2.connect(DATABASE_URL)
        print("¡Conexión exitosa!")
        return conexion
    except Exception as error:
        print(f"❌ Error al conectar: {error}")
        return None

if __name__ == "__main__":
    conn = conectar_bd()
    if conn:
        conn.close()