import os
import csv
import psycopg2
from dotenv import load_dotenv

# Cargar configuración de Neon
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

    # Crear la tabla asegurando una restricción única o validación para evitar duplicados exactos
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
        # --- CATEGORÍA 1: Mariposas Diurnas ---
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
        
        # Agrega aquí tus demás categorías cuando estén listas:
        # ("data/carga_noctuidae.csv", 2),
        # ("data/carga_coleoptera.csv", 3),
        # ("data/carga_hymenoptera.csv", 4),
    ]

    total_nuevos = 0
    total_duplicados = 0

    for archivo, cat_id in archivos_por_categoria:
        if not os.path.exists(archivo):
            print(f"[AVISO] No se encontró el archivo {archivo}, se omite.")
            continue

        print(f"[PROCESANDO] Leyendo {archivo} (Categoría: {CATEGORIAS_VALIDAS[cat_id]})...")
        
        with open(archivo, mode='r', encoding='utf-8') as f:
            lector = csv.DictReader(f)
            for fila in lector:
                nombre_cientifico = fila.get('nombre_cientifico') or fila.get('especie') or fila.get('name')
                if not nombre_cientifico:
                    continue # Saltar filas sin nombre
                
                # Extraer familia y limpiar espacios
                familia = fila.get('family') or fila.get('familia') or 'General'
                rubro = fila.get('rubro') or 'Neotropical'
                region = fila.get('region') or 'Central South America'
                genero = fila.get('genero') or ''
                stock = int(fila.get('stock') or 10)
                precio = float(fila.get('precio') or 0.0)
                descripcion = fila.get('descripcion') or ''

                # --- FILTRO ANTI-DUPLICADOS ---
                # Verificamos si ya existe exactamente el mismo nombre científico en la misma categoría y familia
                cursor.execute("""
                    SELECT id FROM especies 
                    WHERE categoria_id = %s AND familia = %s AND nombre_cientifico = %s;
                """, (cat_id, familia, nombre_cientifico))
                
                existente = cursor.fetchone()

                if existente:
                    # Si ya existe, no lo insertamos para evitar duplicados
                    total_duplicados += 1
                else:
                    # Si no existe, lo insertamos ordenado en su familia y categoría correcta
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
                    total_nuevos += 1
        
        conn.commit()
        print(f"[OK] Archivo {archivo} procesado limpiamente.")

    cursor.close()
    conn.close()
    print(f"\n[¡RESUMEN FINAL!]")
    print(f" - Especies nuevas agregadas: {total_nuevos}")
    print(f" - Duplicados evitados con éxito: {total_duplicados}")

if __name__ == "__main__":
    clasificar_y_subir()