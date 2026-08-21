import os
import glob
import csv
import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_WTHdDfXO0ES4@ep-damp-hat-afgjqwk2.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Cambiado a "especies"
NOMBRE_TABLA = "especies"

def asegurar_columna_existe(cursor, columna):
    """Agrega columnas a la tabla de forma dinámica si el CSV trae campos nuevos."""
    try:
        sql = f'ALTER TABLE "{NOMBRE_TABLA}" ADD COLUMN IF NOT EXISTS "{columna}" TEXT;'
        cursor.execute(sql)
    except Exception:
        pass

def importar_todos_los_csv():
    archivos_csv = glob.glob("**/*.csv", recursive=True)
    print(f"🔍 Se encontraron {len(archivos_csv)} archivos CSV.")

    try:
        conexion = psycopg2.connect(DATABASE_URL)
        cursor = conexion.cursor()
        print("✅ Conexión exitosa a Neon.\n")

        # 1. Crear tabla 'especies' si no existe
        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS "{NOMBRE_TABLA}" (
                id SERIAL PRIMARY KEY
            );
        ''')
        conexion.commit()

        # 2. Procesar cada archivo CSV
        for ruta in archivos_csv:
            if any(x in ruta for x in ["node_modules", ".next", ".venv"]):
                continue

            print(f"📂 Procesando: {ruta}")
            try:
                with open(ruta, mode="r", encoding="utf-8-sig") as f:
                    lector = csv.DictReader(f)
                    columnas = lector.fieldnames

                    if not columnas:
                        print("   ⚠️ Archivo sin cabeceras. Saltando...\n")
                        continue

                    columnas_limpias = [col.strip() for col in columnas if col]

                    # Garantizar que todas las columnas existan en la tabla 'especies'
                    for col in columnas_limpias:
                        asegurar_columna_existe(cursor, col)
                    conexion.commit()

                    # Preparar la inserción
                    columnas_sql = ", ".join([f'"{col}"' for col in columnas_limpias])
                    valores_sql = ", ".join(["%s"] * len(columnas_limpias))
                    sql = f'INSERT INTO "{NOMBRE_TABLA}" ({columnas_sql}) VALUES ({valores_sql});'

                    filas = 0
                    for fila in lector:
                        valores = [fila.get(col) for col in columnas_limpias]
                        cursor.execute(sql, valores)
                        filas += 1

                    conexion.commit()
                    print(f"   ✅ Se importaron {filas} registros en '{NOMBRE_TABLA}'.\n")

            except Exception as e:
                conexion.rollback()
                print(f"   ❌ Error en {ruta}: {e}\n")

        cursor.close()
        conexion.close()
        print("🎉 ¡Todos los CSV han sido procesados e importados con éxito!")

    except Exception as error:
        print(f"❌ Error de conexión: {error}")

if __name__ == "__main__":
    importar_todos_los_csv()