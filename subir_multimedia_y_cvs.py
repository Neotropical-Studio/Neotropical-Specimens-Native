import os
import re
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://usuario:password@ep-ejemplo.us-east-2.aws.neon.tech/neondb?sslmode=require")

CARPETA_UPLOADS = os.path.join(os.getcwd(), 'public', 'uploads')

EXTENSIONES_FOTO = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
EXTENSIONES_VIDEO = {'.mp4', '.avi', '.mov', '.mkv'}

def obtener_conexion():
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as err:
        print(f"❌ Error conectando a Neon DB: {err}")
        return None

def buscar_id_especie(cursor, nombre_archivo):
    try:
        cursor.execute("SELECT id_especie, nombre_cientifico_completo FROM especies;")
        especies = cursor.fetchall()
        for id_esp, nombre_completo in especies:
            pattern = re.escape(nombre_completo)
            if re.search(pattern, nombre_archivo, re.IGNORECASE):
                return id_esp
    except Exception:
        pass
    return None

def registrar_multimedia(cursor, db, ruta_relativa, nombre_archivo, tipo, ext):
    id_especie = buscar_id_especie(cursor, nombre_archivo)
    ruta_abs = os.path.join(os.getcwd(), ruta_relativa)
    tamano = os.path.getsize(ruta_abs) if os.path.exists(ruta_abs) else 0

    sql = """
        INSERT INTO archivos_multimedia 
        (tipo, url_archivo, titulo, formato, tamano_bytes, id_especie)
        VALUES (%s, %s, %s, %s, %s, %s);
    """
    valores = (
        tipo,
        ruta_relativa.replace("\\", "/"),
        os.path.splitext(nombre_archivo)[0],
        ext.replace('.', ''),
        tamano,
        id_especie
    )
    cursor.execute(sql, valores)
    db.commit()
    print(f"  ✓ [{tipo.upper()}] Registrado: {nombre_archivo} -> Especie ID: {id_especie or 'General'}")

def procesar():
    global CARPETA_UPLOADS
    if not os.path.exists(CARPETA_UPLOADS):
        CARPETA_UPLOADS = os.path.join(os.getcwd(), 'uploads')
        if not os.path.exists(CARPETA_UPLOADS):
            print(f"❌ No se encontró la carpeta 'uploads' ni 'public/uploads'. Créala e incluye los archivos.")
            return

    db = obtener_conexion()
    if not db:
        return

    cursor = db.cursor()
    archivos_procesados = 0

    print(f"🚀 Escaneando archivos en: {CARPETA_UPLOADS}\n")

    for root, _, files in os.walk(CARPETA_UPLOADS):
        for file in files:
            ruta_abs = os.path.join(root, file)
            ruta_relativa = os.path.relpath(ruta_abs, os.getcwd())
            ext = os.path.splitext(file)[1].lower()

            if ext in EXTENSIONES_FOTO:
                registrar_multimedia(cursor, db, ruta_relativa, file, 'foto', ext)
                archivos_procesados += 1
            elif ext in EXTENSIONES_VIDEO:
                registrar_multimedia(cursor, db, ruta_relativa, file, 'video', ext)
                archivos_procesados += 1

    cursor.close()
    db.close()
    print(f"\n🎉 Proceso finalizado. Total archivos indexados: {archivos_procesados}")

if __name__ == "__main__":
    procesar()
