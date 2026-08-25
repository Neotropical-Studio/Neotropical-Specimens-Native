import os
import csv
import psycopg2
from dotenv import load_dotenv

# Cargar el archivo de configuración .env.local
load_dotenv(dotenv_path='.env.local')
DATABASE_URL = os.getenv("DATABASE_URL")

CATEGORIAS_VALIDAS = {
    1: "Butterflies (Lepidoptera) Diurne",
    2: "Moths (Butterflies Nocturne)",
    3: "Beetles (Coleoptera)",
    4: "Insects (Arthropoda)",
    5: "Rare, Gynan, Hybrid, Freak"
}

def conectar_db():
    return psycopg2.connect(DATABASE_URL)

def clasificar_y_subir():
    print("[INFO] Conectando a la base de datos de Neon...")
    conn = conectar_db()
    cursor = conn.cursor()

    # Asegurar tabla especies
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS especies (
            id SERIAL PRIMARY KEY,
            categoria_id INT,
            categoria VARCHAR(100),
            rubro VARCHAR(100),
            region VARCHAR(100),
            family VARCHAR(100),
            familia VARCHAR(100),
            genero VARCHAR(100),
            especie VARCHAR(255),
            nombre_cientifico VARCHAR(255),
            stock INT DEFAULT 0,
            precio NUMERIC(10,2) DEFAULT 0.00,
            descripcion TEXT
        );
    """)
    conn.commit()

    archivos_por_categoria = [
        ("data/carga_brassolini.csv", 1),
        ("data/carga_danaidae.csv", 1),
        ("data/carga_heliconiidae_ithomiidae.csv", 1),
        ("data/carga_heliconiidae_ithomiidae_lote2.csv", 1),
        ("data/carga_lycaenidae.csv", 1),
        ("data/carga_morphidae.csv", 1),
        ("data/carga_nymphalidae_lote1.csv", 1),
        ("data/carga_nymphalidae_lote2.csv", 1),
        ("data/carga_nymphalidae_lote3.csv", 1),
        ("data/carga_nymphalidae_lote4.csv", 1),
        ("data/carga_nymphalidae_lote5.csv", 1),
        ("data/carga_nymphalidae_resto_y_heliconiidae.csv", 1),
        ("data/carga_papilionidae_lote1.csv", 1),
        ("data/carga_papilionidae_lote2.csv", 1),
        ("data/carga_pieridae_pierinae_lote1.csv", 1),
        ("data/carga_riodinidae_lote1.csv", 1),
        ("data/carga_satyridae_lote1.csv", 1),
    ]

    for archivo, cat_id in archivos_por_categoria:
        if not os.path.exists(archivo):
            print(f"[AVISO] No se encontró el archivo {archivo}, se omite.")
            continue

        print(f"[PROCESANDO] Leyendo {archivo}...")
        
        with open(archivo, mode='r', encoding='utf-8') as f:
            lector = csv.DictReader(f)
            for fila in lector:
                nombre_cientifico = fila.get('nombre_cientifico') or fila.get('especie') or fila.get('name') or 'Desconocido'
                familia = fila.get('family') or fila.get('familia') or 'General'
                rubro = fila.get('rubro') or 'Neotropical'
                region = fila.get('region') or 'Central South America'
                genero = fila.get('genero') or ''
                stock = int(fila.get('stock') or 10)
                precio = float(fila.get('precio') or 0.0)
                descripcion = fila.get('descripcion') or ''

                cursor.execute("""
                    INSERT INTO especies (
                        categoria_id, categoria, rubro, region, family, familia, genero, especie, nombre_cientifico, stock, precio, descripcion
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    cat_id, 
                    CATEGORIAS_VALIDAS[cat_id], 
                    rubro, 
                    region, 
                    familia, 
                    familia, 
                    genero, 
                    nombre_cientifico, 
                    nombre_cientifico, 
                    stock, 
                    precio, 
                    descripcion
                ))
        
        conn.commit()
        print(f"[OK] {archivo} importado con éxito.")

    cursor.close()
    conn.close()
    print("[¡LISTO!] Sincronización completa.")

if __name__ == "__main__":
    clasificar_y_subir()