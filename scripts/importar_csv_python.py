import os
import psycopg2

Conexión directa a Neon con tu nueva contraseña
DATABASE_URL = "postgresql://neondb_owner:npg_1Nfl8OEPbCoJ@ep-damp-hat-afgjqwk2.us-west-2.aws.neon.tech/neondb?sslmode=require"

def conectar_bd():
    print("⏳ Conectando a la base de datos de Neon...")
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