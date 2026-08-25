import os
import csv
import re
from dotenv import load_dotenv
import psycopg2

load_dotenv(".env.local")
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

if not DATABASE_URL:
    print("Error: No se encontró la URL de conexión en .env.local")
    exit(1)

def crear_slug(texto):
    if not texto:
        return "general"
    texto = texto.lower().strip()
    texto = re.sub(r'[áàäâ]', 'a', texto)
    texto = re.sub(r'[éèëê]', 'e', texto)
    texto = re.sub(r'[íìïî]', 'i', texto)
    texto = re.sub(r'[óòöô]', 'o', texto)
    texto = re.sub(r'[úùüû]', 'u', texto)
    texto = re.sub(r'[^a-z0-9\s]', '', texto)
    texto = re.sub(r'\s+', '-', texto)
    return texto if texto else "general"

print("Conectando a la base de datos de Neon...")
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("Limpiando tablas...")
try:
    cursor.execute("TRUNCATE TABLE especie, familias, categoria, region, rubro RESTART IDENTITY CASCADE;")
    conn.commit()
    print("Tablas limpiadas con éxito.")
except Exception as e:
    print(f"Aviso al limpiar: {e}")
    conn.rollback()

archivos_csv = [
    "Importacion_Masiva_Adelpha_Nymphalidae.csv",
    "Catalogo_Importacion_Brassolini.csv",
]

for archivo in archivos_csv:
    if os.path.exists(archivo):
        print(f"\nProcesando archivo: {archivo}")
        
        with open(archivo, mode='r', encoding='utf-8') as f:
            lector = csv.DictReader(f)
            
            for index, row in enumerate(lector):
                nombre_cientifico = row.get("Nombre científico")
                rubro_nombre = row.get("Rubro") or "General"
                region_nombre = row.get("Región geográfica") or "General"
                categoria_nombre = row.get("Categoría (por zona)") or "General"
                familia_nombre = row.get("Familia") or "General"
                especie_nombre = row.get("Especie") or nombre_cientifico
                
                # Generar slugs necesarios para cumplir con Neon
                rubro_slug = crear_slug(rubro_nombre)
                region_slug = crear_slug(region_nombre)
                categoria_slug = crear_slug(categoria_nombre)
                familia_slug = crear_slug(familia_nombre)
                
                precio_str = row.get("Precio regular") or row.get("Precio regular (menor)") or "0"
                try:
                    precio = float(precio_str)
                except ValueError:
                    precio = 0.0
                    
                stock_str = row.get("Disponibilidad / Stock") or "10"
                try:
                    stock = int(stock_str)
                except ValueError:
                    stock = 10

                try:
                    # Insertar en tablas maestras incluyendo el slug obligatorio
                    cursor.execute(
                        "INSERT INTO rubro (nombre, slug) SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM rubro WHERE nombre = %s);",
                        (rubro_nombre, rubro_slug, rubro_nombre)
                    )
                    cursor.execute(
                        "INSERT INTO region (nombre, slug) SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM region WHERE nombre = %s);",
                        (region_nombre, region_slug, region_nombre)
                    )
                    cursor.execute(
                        "INSERT INTO categoria (nombre, slug) SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = %s);",
                        (categoria_nombre, categoria_slug, categoria_nombre)
                    )
                    cursor.execute(
                        "INSERT INTO familias (nombre) SELECT %s WHERE NOT EXISTS (SELECT 1 FROM familias WHERE nombre = %s);",
                        (familia_nombre, familia_nombre)
                    )

                    # Insertar finalmente en especie
                    cursor.execute(
                        """
                        INSERT INTO especie (nombre_cientifico, rubro, region, categoria, familia, especie, precio, stock)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                        """,
                        (
                            str(nombre_cientifico),
                            str(rubro_nombre),
                            str(region_nombre),
                            str(categoria_nombre),
                            str(familia_nombre),
                            str(especie_nombre),
                            precio,
                            stock,
                        ),
                    )
                except Exception as e:
                    print(f"Error en fila {index} de {archivo}: {e}")
                    conn.rollback()
        
        conn.commit()
        print(f"Archivo {archivo} importado con éxito.")
    else:
        print(f"El archivo {archivo} no se encontró.")

cursor.close()
conn.close()
print("\n¡Proceso finalizado correctamente!"). 