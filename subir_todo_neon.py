import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
load_dotenv('.env.local')

# Conexión a Neon PostgreSQL
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("❌ Error: No se encontró la DATABASE_URL en el entorno.")
    exit(1)

# Diccionario organizado por Categoría -> Familia -> Lista de Especies (s_name, gen, esp)
taxonomia = {
    "Beetles (Coleoptera)": {
        "Scarabaeidae": [
            ("Canthon smaragdulus", "Canthon", "smaragdulus"),
            ("Canthon sp.", "Canthon", "sp."),
            ("Dichotomius sp.", "Dichotomius", "sp."),
            ("Phanaeus mimas", "Phanaeus", "mimas"),
        ],
        "Rutelinae": [
            ("Lagochile trigona mancocapaci", "Lagochile", "trigona mancocapaci"),
            ("Macraspis andicola", "Macraspis", "andicola"),
            ("Macraspis bicincta", "Macraspis", "bicincta"),
        ]
    },
    "Insects (Arthropoda)": {
        "Phasmatidae": [
            ("Prisopus sp.", "Prisopus", "sp."),
            ("Verophasmatoidea spp.", "Verophasmatoidea", "spp."),
            ("Proscopia gigantea", "Proscopia", "gigantea")
        ],
        "Phylliidae": [
            ("Phyllium giganteum", "Phyllium", "giganteum"),
            ("Phyllium bioculatum", "Phyllium", "bioculatum")
        ]
    }
}

try:
    conexion = psycopg2.connect(DATABASE_URL)
    cursor = conexion.cursor()

    for categoria, familias in taxonomia.items():
        print(f"\n📂 Procesando categoría: {categoria}")
        
        for familia, especies in familias.items():
            print(f"  🔹 Familia: {familia} ({len(especies)} especies)")
            
            for s_name, gen, esp in especies:
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
                    familia,
                    gen,
                    esp,
                    s_name,
                    slug,
                    "ESPECIMENES_SECOS",
                    "Peru",
                    "IN_STOCK"
                )

                try:
                    cursor.execute(sql, valores)
                    conexion.commit()
                    print(f"    [✔] Registrado: {s_name}")
                except Exception as e:
                    conexion.rollback()
                    print(f"    ❌ Error en {s_name}: {e}")

    cursor.close()
    conexion.close()
    print("\n✨ ¡Todas las familias y especies han sido migradas con éxito a Neon!")

except Exception as error:
    print(f"❌ Error de conexión a la base de datos: {error}")