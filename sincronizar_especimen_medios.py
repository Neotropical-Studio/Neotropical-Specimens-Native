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

def buscar_specimen_id(cursor, nombre_archivo):
    try:
        cursor.execute("SELECT id, codigo_especimen FROM especimenes;")
        for sp_id, codigo in cursor.fetchall():
            if codigo and re.search(re.escape(str(codigo)), nombre_archivo, re.IGNORECASE):
                return sp_id
        
        cursor.execute("SELECT id, nombre_cientifico FROM especies;")
        for sp_id, nombre in cursor.fetchall():
            if nombre and re.search(re.escape(str(nombre).replace(' ', '-')), nombre_archivo, re.IGNORECASE):
                return sp_id
    except Exception:
        pass
    return None

def insertar_con_fallback(cursor, specimen_id, media_type, url_final, pub_id, vista):
    # Probar diferentes variaciones válidas de media_type
    variaciones = [media_type, 'photo', 'image', 'video'] if media_type in ['photo', 'image'] else ['video', 'media']
    
    for tipo_test in variaciones:
        cursor.execute("SAVEPOINT intello_savepoint;")
        try:
            sql = """
                INSERT INTO especimen_medios (specimen_id, media_type, media_url, public_id, display_order, view_name)
                VALUES (%s, %s, %s, %s, %s, %s);
            """
            cursor.execute(sql, (specimen_id, tipo_test, url_final, pub_id, 1, vista))
            cursor.execute("RELEASE SAVEPOINT intello_savepoint;")
            return True, tipo_test
        except Exception as e:
            cursor.execute("ROLLBACK TO SAVEPOINT intello_savepoint;")
            
    return False, str(e)

def procesar():
    if not os.path.exists(CARPETA_ORIGEN):
        print(f"❌ La carpeta '{CARPETA_ORIGEN}' no existe.")
        return

    db = obtener_db()
    if not db:
        return
    cursor = db.cursor()

    print("🚀 Iniciando procesamiento e inserción segura en Neon DB...\n")

    archivos_procesados = 0
    for root, _, files in os.walk(CARPETA_ORIGEN):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            
            is_image = ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']
            is_video = ext in ['.mp4', '.mov', '.avi']
            
            if not (is_image or is_video):
                continue

            media_type_inicial = 'image' if is_image else 'video'
            resource_type = 'image' if is_image else 'video'

            ruta_local = os.path.join(root, file)
            nombre_base = os.path.splitext(file)[0]
            vista = 'ventral' if 'ventral' in nombre_base.lower() else ('dorsal' if 'dorsal' in nombre_base.lower() else 'general')

            try:
                # 1. Subir a Cloudinary
                res = cloudinary.uploader.upload(
                    ruta_local,
                    folder="specimens",
                    public_id=nombre_base,
                    overwrite=True,
                    resource_type=resource_type
                )
                url_final = res.get("secure_url")
                pub_id = res.get("public_id")

                # 2. Obtener specimen_id si existe relación
                specimen_id = buscar_specimen_id(cursor, file)

                # 3. Inserción resiliente con prueba de variaciones
                exito, tipo_usado = insertar_con_fallback(cursor, specimen_id, media_type_inicial, url_final, pub_id, vista)
                
                if exito:
                    db.commit()
                    archivos_procesados += 1
                    print(f"  ✓ Subido e Insertado [{tipo_usado}]: {file}")
                    print(f"    └─ URL: {url_final}")
                else:
                    db.rollback()
                    print(f"  ❌ Fallo al insertar {file}: {tipo_usado}")

            except Exception as e:
                db.rollback()
                print(f"  ❌ Error con {file}: {e}")

    cursor.close()
    db.close()
    print(f"\n🎉 Proceso completado. Total de registros en 'especimen_medios': {archivos_procesados}")

if __name__ == "__main__":
    procesar()
