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

# Configurar Cloudinary con la variable de entorno
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

def buscar_id_especie(cursor, nombre_archivo):
    try:
        cursor.execute("SELECT id_especie, nombre_cientifico_completo FROM especies;")
        for id_esp, nombre in cursor.fetchall():
            if re.search(re.escape(nombre), nombre_archivo, re.IGNORECASE):
                return id_esp
    except Exception:
        pass
    return None

def procesar():
    if not os.path.exists(CARPETA_ORIGEN):
        print(f"❌ La carpeta '{CARPETA_ORIGEN}' no existe.")
        return

    db = obtener_db()
    if not db:
        return
    cursor = db.cursor()

    print("🚀 Conectado a Neon DB. Subiendo especímenes e indexando datos...\n")

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
                # Subida a Cloudinary
                res = cloudinary.uploader.upload(
                    ruta_local,
                    folder="specimens",
                    public_id=nombre_base,
                    overwrite=True,
                    resource_type="auto"
                )
                url_final = res.get("secure_url")

                # Registro de la URL en Neon DB
                id_especie = buscar_id_especie(cursor, file)
                sql = """
                    INSERT INTO archivos_multimedia (tipo, url_archivo, titulo, formato, id_especie)
                    VALUES (%s, %s, %s, %s, %s);
                """
                cursor.execute(sql, (tipo, url_final, nombre_base, ext.replace('.', ''), id_especie))
                db.commit()
                
                archivos_procesados += 1
                print(f"  ✓ Subido e insertado: {file} -> {url_final}")

            except Exception as e:
                print(f"  ❌ Error con {file}: {e}")

    cursor.close()
    db.close()
    print(f"\n🎉 Proceso completado. Total de archivos vinculados en Neon DB: {archivos_procesados}")

if __name__ == "__main__":
    procesar()
