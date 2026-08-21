import os
import glob
import csv
import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_WTHdDfXO0ES4@ep-damp-hat-afgjqwk2.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
NOMBRE_TABLA = "especies"

def asegurar_columna_existe(cursor, columna):
    try:
        sql = f'ALTER TABLE "{NOMBRE_TABLA}" ADD COLUMN IF NOT EXISTS "{columna}" TEXT;'
        cursor.execute(sql)
    except Exception:
        pass

def registro_existe(cursor, fila, columnas_clave):
    """Comprueba si un registro idéntico ya existe usando las columnas principales."""
    condiciones = []
    valores = []
    
    for col in columnas_clave:
        val = fila.get(col)
        if val:
            condiciones.append(f'"{col}" = %s')
            valores.append(val)
            
    if not condiciones:
        return False
        
    sql = f'SELECT 1 FROM "{NOMBRE_TABLA}" WHERE {" AND ".join(condiciones)} LIMIT 1;'
    cursor.execute(sql, valores)
    return cursor.fetchone() is not None

def importar_todos_los_csv():
    archivos_csv = glob.glob("**/*.csv", recursive=True)
    print(f"🔍 Se encontraron {len(archivos_csv)} archivos CSV.")

    try:
        conexion = psycopg2.connect(DATABASE_URL)
        cursor = conexion.cursor()
        print("✅ Conexión exitosa a Neon.\n")

        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS "{NOMBRE_TABLA}" (
                id SERIAL PRIMARY KEY
            );
        ''')
        conexion.commit()

        for ruta in archivos_csv:
            if any(x in ruta for x in ["node_modules", ".next", ".venv"]):
                continue

            print(f"📂 Procesando: {ruta}")
            try:
                with open(ruta, mode="r", encoding="utf-8-sig") as f:
                    lector = csv.DictReader(f)
                    columnas = lector.fieldnames

                    if not columnas:
                        continue

                    columnas_limpias = [col.strip() for col in columnas if col]

                    for col in columnas_limpias:
                        asegurar_columna_existe(cursor, col)
                    conexion.commit()

                    columnas_sql = ", ".join([f'"{col}"' for col in columnas_limpias])
                    valores_sql = ", ".join(["%s"] * len(columnas_limpias))
                    sql = f'INSERT INTO "{NOMBRE_TABLA}" ({columnas_sql}) VALUES ({valores_sql});'

                    filas_nuevas = 0
                    duplicados_omitidos = 0

                    # Elegimos campos clave para detectar si ya existe
                    campos_clave = [c for c in ["species_name", "familia", "genero", "code"] if c in columnas_limpias]
                    if not campos_clave:
                        campos_clave = columnas_limpias[:2]

                    for fila in lector:
                        if registro_existe(cursor, fila, campos_clave):
                            duplicados_omitidos += 1
                        else:
                            valores = [fila.get(col) for col in columnas_limpias]
                            cursor.execute(sql, valores)
                            filas_nuevas += 1

                    conexion.commit()
                    print(f"   ✅ Nuevos: {filas_nuevas} | ⚠️ Omitidos por duplicados: {duplicados_omitidos}\n")

            except Exception as e:
                conexion.rollback()
                print(f"   ❌ Error en {ruta}: {e}\n")

        cursor.close()
        conexion.close()
        print("🎉 ¡Proceso completado sin duplicar datos!")

    except Exception as error:
        print(f"❌ Error de conexión: {error}")

if __name__ == "__main__":
    importar_todos_los_csv()