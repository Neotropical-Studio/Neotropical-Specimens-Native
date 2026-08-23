import os
import re
import boto3
import psycopg2

def cargar_env():
    """Lee las variables de entorno de .env.local o .env de Next.js"""
    for env_file in ['.env.local', '.env']:
        if os.path.exists(env_file):
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")

cargar_env()

# =============================================================================
# VARIABLES DE ENTORNO
# =============================================================================
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

DO_SPACES_KEY = os.getenv("DO_SPACES_KEY") or os.getenv("DIGITALOCEAN_ACCESS_KEY")
DO_SPACES_SECRET = os.getenv("DO_SPACES_SECRET") or os.getenv("DIGITALOCEAN_SECRET_KEY")
DO_SPACES_BUCKET = os.getenv("DO_SPACES_BUCKET", "tu-bucket-name")
DO_SPACES_REGION = os.getenv("DO_SPACES_REGION", "nyc3")

CARPETA_ORIGEN = os.path.join(os.getcwd(), 'public', 'specimens')
ENDPOINT_URL = f"https://{DO_SPACES_REGION}.digitaloceanspaces.com"

if not DATABASE_URL:
    print("❌ No se encontró DATABASE_URL o POSTGRES_URL en tu archivo .env.local")
    exit(1)

# =============================================================================
# CONEXIONES Y CLIENTES
# =============================================================================
s3_client = boto3.client('s3',
    region_name=DO_SPACES_REGION,
    endpoint_url=ENDPOINT_URL,
    aws_access_key_id=DO_SPACES_KEY,
    aws_secret_access_key=DO_SPACES_SECRET
)

def obtener_db_conexion():
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

def procesar_y_subir():
    if not os.path.exists(CARPETA_ORIGEN):
        print(f"❌ La carpeta '{CARPETA_ORIGEN}' no existe.")
        return

    db = obtener_db_conexion()
    if not db:
        return
    cursor = db.cursor()

    print(f"🚀 Conectado correctamente a Neon DB.")
    print(f"📂 Procesando archivos desde: {CARPETA_ORIGEN}\n")

    archivos_procesados = 0
    for root, _, files in os.walk(CARPETA_ORIGEN):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            tipo = 'foto' if ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif'] else ('video' if ext in ['.mp4', '.mov', '.avi'] else None)
            
            if not tipo:
                continue

            ruta_local = os.path.join(root, file)
            space_path = f"specimens/{file}"
            
            try:
                # 1. Subir a DigitalOcean Spaces
                s3_client.upload_file(
                    ruta_local, 
                    DO_SPACES_BUCKET, 
                    space_path, 
                    ExtraArgs={'ACL': 'public-read'}
                )
                url_publica = f"https://{DO_SPACES_BUCKET}.{DO_SPACES_REGION}.digitaloceanspaces.com/{space_path}"
                
                # 2. Registrar en Neon DB
                id_especie = buscar_id_especie(cursor, file)
                sql = """
                    INSERT INTO archivos_multimedia (tipo, url_archivo, titulo, formato, id_especie)
                    VALUES (%s, %s, %s, %s, %s);
                """
                cursor.execute(sql, (tipo, url_publica, os.path.splitext(file)[0], ext.replace('.', ''), id_especie))
                db.commit()
                
                archivos_procesados += 1
                print(f"  ✓ [{tipo.upper()}] Subido y registrado: {file} -> ID Especie: {id_especie or 'General'}")

            except Exception as e:
                print(f"  ❌ Error procesando {file}: {e}")

    cursor.close()
    db.close()
    print(f"\n🎉 Proceso finalizado. Total archivos procesados: {archivos_procesados}")

if __name__ == "__main__":
    procesar_y_subir()
