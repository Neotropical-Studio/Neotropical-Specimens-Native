import os
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

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Modificar la columna specimen_id para que sea opcional (compatibilidad total)
try:
    print("🛠️ Modificando la tabla 'especimen_medios' para permitir registros de fotos/videos...")
    cur.execute("ALTER TABLE especimen_medios ALTER COLUMN specimen_id DROP NOT NULL;")
    conn.commit()
    print("✅ Cambio aplicado con éxito en Neon DB.\n")
except Exception as e:
    conn.rollback()
    print(f"ℹ️ La columna ya era opcional o no requería modificación: {e}\n")

# 2. Subida masiva a Cloudinary y registro en Neon DB
archivos_procesados = 0
for root, _, files in os.walk(CARPETA_ORIGEN):
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        is_image = ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        is_video = ext in ['.mp4', '.mov', '.avi']
        
        if not (is_image or is_video):
            continue

        ruta_local = os.path.join(root, file)
        nombre_base = os.path.splitext(file)[0]
        vista = 'ventral' if 'ventral' in nombre_base.lower() else ('dorsal' if 'dorsal' in nombre_base.lower() else 'general')
        media_type = 'image' if is_image else 'video'

        try:
            # Subida a Cloudinary
            res = cloudinary.uploader.upload(
                ruta_local,
                folder="specimens",
                public_id=nombre_base,
                overwrite=True,
                resource_type="image" if is_image else "video"
            )
            url_final = res.get("secure_url")
            pub_id = res.get("public_id")

            # Inserción compatible en especimen_medios
            sql = """
                INSERT INTO especimen_medios (media_type, media_url, public_id, display_order, view_name)
                VALUES (%s, %s, %s, %s, %s);
            """
            cur.execute(sql, (media_type, url_final, pub_id, 1, vista))
            conn.commit()
            
            archivos_procesados += 1
            print(f"  ✓ Subido e insertado: {file}")
            print(f"    └─ URL: {url_final}")

        except Exception as err:
            conn.rollback()
            print(f"  ❌ Error con {file}: {err}")

cur.close()
conn.close()
print(f"\n🎉 ¡Proceso finalizado con éxito! Registros insertados en 'especimen_medios': {archivos_procesados}")
