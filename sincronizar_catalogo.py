import os
import csv
import psycopg2
from dotenv import load_dotenv

# Cargar las variables de entorno (.env)
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Definición de las 5 categorías principales para clasificar correctamente
CATEGORIAS_VALIDAS = {
    1: "Lepidópteros Diurnos",
    2: "Lepidópteros Nocturnos",
    3: "Coleópteros",
    4: "Artrópodos",
    5: "Especiales / Híbridos"
}

def conectar_db():
    return psycopg2.connect(DATABASE_URL)

def clasificar_y_subir():
    print("[INFO] Conectando a la base de datos de Neon...")
    conn = conectar_db()
    cursor = conn.cursor()

    # Asegurar que la tabla principal se llama 'especies' con la estructura correcta
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

    # Lista de tus archivos CSV principales a procesar
    archivos_csv = [
        ("Brassolini", 1),
        ("castnia_catalogo.csv", 1),
        ("chrysomelidae_catalogo.csv", 3),
        ("cicindelidae_catalogo.csv", 3),
        ("coleoptera_catalogo.csv", 3),
        ("noctuidae_catalogo.csv", 2),
        ("saturniidae_catalogo.csv", 2),
        ("sphingidae_catalogo.csv", 2),
        ("uranidae_catalogo.csv", 3),
        ("hymenoptera.csv", 4)
    ]

    for archivo, cat_id in archivos_csv:
        if not os.path.exists(archivo):
            print(f"[AVISO] El archivo {archivo} no se encontró en la ruta, se omite.")
            continue

        print(f"[PROCESANDO] Leyendo {archivo} bajo la Categoría [{cat_id}: {CATEGORIAS_VALIDAS[cat_id]}]...")
        
        with open(archivo, mode='r', encoding='utf-8') as f:
            lector = csv.DictReader(f)
            for fila in lector:
                # Extraer datos flexibles del CSV
                nombre_cientifico = fila.get('nombre_cientifico') or fila.get('especie') or fila.get('name') or 'Desconocido'
                familia = fila.get('family') or fila.get('familia') or 'General'
                rubro = fila.get('rubro') or 'Neotropical'
                region = fila.get('region') or 'Central South America'
                genero = fila.get('genero') or ''
                stock = int(fila.get('stock') or 10)
                precio = float(fila.get('precio') or 0.0)
                descripcion = fila.get('descripcion') or ''

                # Insertar clasificado en la base de datos
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
        print(f"[OK] Archivo {archivo} importado y clasificado con éxito.")

    cursor.close()
    conn.close()
    print("[¡LISTO!] Sincronización y clasificación completada en Neon.")

if __name__ == "__main__":
    clasificar_y_subir()