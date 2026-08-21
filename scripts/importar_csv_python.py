import os
import glob
import csv
import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_WTHdDfXO0ES4@ep-damp-hat-afgjqwk2.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Si tu tabla en Neon tiene otro nombre (ejemplo: "especies"), cámbialo aquí
NOMBRE_TABLA = "specimens" 

def importar_todos_los_csv():
    archivos_csv = glob.glob("**/*.csv", recursive=True)
    print(f"🔍 Se encontraron {len(archivos_csv)} archivos CSV.")
    
    try:
        conexion = psycopg2.connect(DATABASE_URL)
        cursor = conexion.cursor()
        print("✅ Conexión exitosa a Neon.\n")
        
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
                    
                    columnas_limpias = [col.strip() for col in columnas]
                    columnas_sql = ", ".join([f'"{col}"' for col in columnas_limpias])
                    valores_sql = ", ".join(["%s"] * len(columnas_limpias))
                    
                    sql = f'INSERT INTO "{NOMBRE_TABLA}" ({columnas_sql}) VALUES ({valores_sql});'
                    
                    filas = 0
                    for fila in lector:
                        valores = [fila[col] for col in columnas]
                        cursor.execute(sql, valores)
                        filas += 1
                    
                    conexion.commit()
                    print(f"   ✅ Se importaron {filas} registros correctamente.\n")
                    
            except Exception as e:
                conexion.rollback()
                print(f"   ❌ Error en {ruta}: {e}\n")

        cursor.close()
        conexion.close()
        print("🎉 ¡Importación completada!")

    except Exception as error:
        print(f"❌ Error de conexión: {error}")

if __name__ == "__main__":
    importar_todos_los_csv()