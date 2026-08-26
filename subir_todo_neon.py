import os
import glob
import csv
import psycopg2
from dotenv import load_dotenv

load_dotenv()
load_dotenv('.env.local')

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("❌ Error: No se encontró la DATABASE_URL en el entorno.")
    exit(1)

try:
    conexion = psycopg2.connect(DATABASE_URL)
    cursor = conexion.cursor()

    # Buscar automáticamente todos los archivos CSV en la carpeta actual
    archivos_csv = glob.glob("*.csv")

    if not archivos_csv:
        print("⚠️ No se encontraron archivos CSV en este directorio.")
        exit(1)

    print(f"📂 Se encontraron {len(archivos_csv)} archivos CSV para procesar.\n")

    total_registros = 0

    for archivo in archivos_csv:
        print(f"📄 Procesando: {archivo}")
        
        with open(archivo, mode='r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            
            contador_archivo = 0
            for row in reader:
                # Limpiamos y leemos las columnas comunes de tus CSVs
                familia = row.get('familia') or row.get('Family') or row.get('FAMILIA') or "Desconocida"
                genero = row.get('genero') or row.get('Genus') or row.get('GENERO') or ""
                especie = row.get('especie') or row.get('Species') or row.get('ESPECIE') or ""
                s_name = row.get('species_name') or row.get('NOMBRE') or f"{genero} {especie}".strip()
                
                if not s_name or s_name == " ":
                    continue

                # Categorización automática basada en la familia real de tus listas
                fam_lower = familia.lower()
                if any(b in fam_lower for b in ['scarabaeidae', 'rutelinae', 'buprestidae', 'cerambycidae', 'cetoniidae', 'chrysomelidae', 'curculionidae', 'dynastidae', 'elateridae', 'lucanidae', 'coleoptera']):
                    categoria = "Beetles (Coleoptera)"
                else:
                    categoria = "Insects (Arthropoda)"

                slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"

                sql = """
                    INSERT INTO specimens (categoria, familia, genero, especie, species_name, media_url, rubro, region, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (media_url) 
                    DO UPDATE SET 
                        familia = EXCLUDED.familia,
                        genero = EXCLUDED.genero,
                        especie = EXCLUDED.especie;
                """
                
                valores = (
                    categoria,
                    familia.capitalize(),
                    genero,
                    especie,
                    s_name,
                    slug,
                    "ESPECIMENES_SECOS",
                    "Peru",
                    "IN_STOCK"
                )

                try:
                    cursor.execute(sql, valores)
                    conexion.commit()
                    contador_archivo += 1
                    total_registros += 1
                except Exception as e:
                    conexion.rollback()
                    print(f"    ❌ Error en {s_name}: {e}")

            print(f"  [✔] {contador_archivo} registros subidos desde {archivo}")

    cursor.close()
    conexion.close()
    print(f"\n✨ ¡Listo! Se procesaron todos tus CSVs. Total de registros subidos/actualizados: {total_registros}")

except Exception as error:
    print(f"❌ Error general: {error}")