import os
import re
import psycopg2
import cloudinary
import cloudinary.uploader

def cargar_env():
    for env_file in ['.env.local', '.env']:
        if os.path.exists(env_file):
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")

cargar_env()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")
CARPETA_ORIGEN = os.path.join(os.getcwd(), 'public', 'specimens')

if not DATABASE_URL:
    print("❌ Error: No se encontró DATABASE_URL en .env.local")
    exit(1)

if CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)
else:
    cloud_name = os.getenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME") or os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if cloud_name and api_key and api_secret:
        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)

def obtener_db():
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as err:
        print(f"❌ Error conectando a Neon DB: {err}")
        return None

def obtener_columnas(cursor, tabla):
    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{tabla}';")
    return [row[0] for row in cursor.fetchall()]

def procesar():
    if not os.path.exists(CARPETA_ORIGEN):
        print(f"❌ La carpeta '{CARPETA_ORIGEN}' no existe.")
        return

    db = obtener_db()
    if not db:
        return
    cursor = db.cursor()

    # Tabla identificada en tu Neon DB
    tabla_destino = 'especimen_medios'
    columnas = obtener_columnas(cursor, tabla_destino)
    print(f"🚀 Conectado a Neon DB. Columnas en '{tabla_destino}': {columnas}\n")

    # Mapeo flexible de columnas para inserción
    col_url = 'url' if 'url' in columnas else ('url_archivo' if 'url_archivo' in columnas else None)
    col_tipo = 'tipo' if 'tipo' in columnas else None
    col_titulo = 'titulo' if 'titulo' in columnas else ('nombre' if 'nombre' in columnas else None)

    archivos_procesados = 0
    for root, _, files in os.walk(CARPETA_ORIGEN):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            tipo = 'foto' if ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif'] else ('video' if ext in ['.mp4', '.mov'] else None)
            
            if not tipo:
                continue

            ruta_local = os.path.join(root, file)
            nombre_base = os.path.splitext(file)[0]
            
            try:
                # 1. Subida a Cloudinary
                res = cloudinary.uploader.upload(
                    ruta_local,
                    folder="specimens",
                    public_id=nombre_base,
                    overwrite=True,
                    resource_type="auto"
                )
                url_final = res.get("secure_url")

                # 2. Inserción dinámica según columnas de Neon DB
                fields = []
                values = []
                
                if col_url:
                    fields.append(col_url)
                    values.append(url_final)
                if col_tipo:
                    fields.append(col_tipo)
                    values.append(tipo)
                if col_titulo:
                    fields.append(col_titulo)
                    values.append(nombre_base)

                sql = f"INSERT INTO {tabla_destino} ({', '.join(fields)}) VALUES ({', '.join(['%s']*len(values))});"
                cursor.execute(sql, tuple(values))
                db.commit()
                
                archivos_procesados += 1
                print(f"  ✓ Registrado: {file} -> {url_final}")

            except Exception as e:
                db.rollback()
                print(f"  ❌ Error con {file}: {e}")

    cursor.close()
    db.close()
    print(f"\n🎉 ¡Proceso completado con éxito! Archivos cargados e indexados: {archivos_procesados}")

if __name__ == "__main__":
    procesar()
