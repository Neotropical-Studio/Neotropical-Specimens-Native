import os
import psycopg2

postgresql://neondb_owner:npg_eQqKZ3JkD4nz@ep-damp-hat-afgjqwk2.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

def conectar_bd():
    print(f"🔍 Intentando conectar con esta URL exacta: {DATABASE_URL}")
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