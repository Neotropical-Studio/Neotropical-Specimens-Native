import os
import glob
import pandas as pd
import psycopg2

# Conexión directa con la contraseña nueva y URL limpia
DATABASE_URL = "postgresql://neondb_owner:npg_CJ2Uy4KWNxPj@ep-damp-hat-afgjqwk2.us-west-2.aws.neon.tech/neondb?sslmode=require"

def importar_datos():
    print("⏳ Conectando a la base de datos de Neon...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print("✅ ¡Conexión exitosa!")
    except Exception as e:
        print(f"❌ Error al conectar: {e}")
        return

    archivos_csv = glob.glob("data/*.csv")
    print(f"📁 Se encontraron {len(archivos_csv)} archivos CSV en la carpeta data.")

    for archivo in archivos_csv:
        nombre_archivo = os.path.basename(archivo)
        print(f"⏳ Procesando: {nombre_archivo}...")
        
        try:
            df = pd.read_csv(archivo)
            df = df.where(pd.notnull(df), None)

            for _, row in df.iterrows():
                columnas = list(df.columns)
                valores = list(row)

                cols_sql = ", ".join(columnas)
                placeholders = ", ".join(["%s"] * len(columnas))
                query = f"INSERT INTO specimens ({cols_sql}) VALUES ({placeholders})"

                try:
                    cursor.execute(query, valores)
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print(f"⚠️ Error en una fila de {nombre_archivo}: {e}")

            print(f"✅ ¡Completado: {nombre_archivo}!")

        except Exception as e:
            print(f"❌ Error leyendo el archivo {nombre_archivo}: {e}")

    cursor.close()
    conn.close()
    print("🚀 ¡Todos los archivos CSV se han importado exitosamente!")

if __name__ == "__main__":
    importar_datos()