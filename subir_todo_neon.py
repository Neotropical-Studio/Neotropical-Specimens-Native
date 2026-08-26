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

    archivos_csv = glob.glob("*.csv")

    if not archivos_csv:
        print("⚠️ No se encontraron archivos CSV en este directorio.")
        exit(1)

    print(f"📂 Se encontraron {len(archivos_csv)} archivos CSV para procesar.\n")

    total_registros = 0

    for archivo in archivos_csv:
        print(f"📄 Procesando archivo: {archivo}")
        
        nombre_lower = archivo.lower()
        
        # 1. Detectar el Rubro correcto según el archivo
        if 'esqueleto' in nombre_lower or 'zoologia' in nombre_lower:
            rubro = "Esqueletos de zoología"
        elif 'planta' in nombre_lower or 'cites' in nombre_lower:
            rubro = "Plantas secas no-CITES"
        else:
            rubro = "Especímenes secos biológicos"

        # 2. Detectar la Región correcta
        if 'africa' in nombre_lower:
            region = "Africa (Afrotropical)"
        elif 'oriental' in nombre_lower or 'australasian' in nombre_lower:
            region = "Australasian Y Oriental"
        elif 'europe' in nombre_lower or 'holarctic' in nombre_lower:
            region = "Europe (Holarctic)"
        elif 'nearctic' in nombre_lower or 'north_america' in nombre_lower:
            region = "North America (Nearctic)"
        else:
            region = "Central South America Neotropical"

        with open(archivo, mode='r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            
            contador_archivo = 0
            for row in reader:
                # Leer familia, género y especie con soporte para varios nombres de columnas posibles
                familia = row.get('familia') or row.get('Family') or row.get('FAMILIA') or "Desconocida"
                genero = row.get('genero') or row.get('Genus') or row.get('GENERO') or ""
                especie = row.get('especie') or row.get('Species') or row.get('ESPECIE') or ""
                s_name = row.get('species_name') or row.get('NOMBRE') or f"{genero} {especie}".strip()
                
                if not s_name or s_name == " ":
                    continue

                # 3. Detectar la Categoría exacta que espera tu web
                fam_lower = familia.lower()
                nombre_archivo_inf = archivo.lower()
                
                if 'moth' in nombre_archivo_inf or 'noctuidae' in nombre_archivo_inf or 'uranidae' in nombre_archivo_inf or 'castnia' in nombre_archivo_inf:
                    categoria = "Moths (Butterflies Nocturne)"
                elif any(b in fam_lower for b in ['scarabaeidae', 'rutelinae', 'buprestidae', 'cerambycidae', 'cetoniidae', 'chrysomelidae', 'curculionidae', 'dynastidae', 'elateridae', 'lucanidae', 'coleoptera']) or 'coleoptera' in nombre_archivo_inf:
                    categoria = "Beetles (Coleoptera)"
                elif any(d in fam_lower for d in ['nymphalidae', 'morphidae', 'papilionidae', 'pieridae', 'lycaenidae', 'hesperiidae', 'danainae', 'satyrinae', 'riodinidae']) or 'diurne' in nombre_archivo_inf or 'butterflies' in nombre_archivo_inf:
                    categoria = "Butterflies (Lepidoptera) Diurne"
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
                        especie = EXCLUDED.especie,
                        rubro = EXCLUDED.rubro,
                        region = EXCLUDED.region,
                        categoria = EXCLUDED.categoria;
                """
                
                valores = (
                    categoria,
                    familia.strip(),
                    genero.strip(),
                    especie.strip(),
                    s_name.strip(),
                    slug,
                    rubro,
                    region,
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

            print(f"  [✔] {contador_archivo} registros guardados en Rubro: '{rubro}' | Región: '{region}'")

    cursor.close()
    conexion.close()
    print(f"\n✨ ¡Listo! Se procesaron y clasificaron correctamente {total_registros} registros en total.")

except Exception as error:
    print(f"❌ Error general: {error}")