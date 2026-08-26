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

# Listas completas organizadas por Categoría, Familia y sus respectivas Especies
taxonomia = {
    "Beetles (Coleoptera)": {
        "Scarabaeidae": [
            ("Canthon smaragdulus", "Canthon", "smaragdulus"),
            ("Canthon sp.", "Canthon", "sp."),
            ("Canthon mimas", "Canthon", "mimas"), # Agregado de tus capturas
            ("Dichotomius sp.", "Dichotomius", "sp."),
            ("Deltochilum sp.", "Deltochilum", "sp."),
            ("Onthophagus gazella", "Onthophagus", "gazella"),
            ("Onthophagus sp.", "Onthophagus", "sp."),
            ("Eurysternus sp.", "Eurysternus", "sp."),
            ("Oxysternon silenus", "Oxysternon", "silenus"),
            ("Oxysternon sp.", "Oxysternon", "sp."),
            ("Phanaeus mimas", "Phanaeus", "mimas"),
            ("Phanaeus sp.", "Phanaeus", "sp."),
            ("Dichotomius", "Dichotomius", "faunus"), # Ajustado según tus registros
            ("Sulcophanaeus faunus", "Sulcophanaeus", "faunus"),
            ("Sulcophanaeus actaeon", "Sulcophanaeus", "actaeon"),
        ],
        "Rutelinae": [
            ("Lagochile trigona mancocapaci", "Lagochile", "trigona mancocapaci"),
            ("Macraspis andicola", "Macraspis", "andicola"),
            ("Macraspis bicincta", "Macraspis", "bicincta"),
            ("Macraspis festiva", "Macraspis", "festiva"),
            ("Macraspis martinezi auzereli", "Macraspis", "martinezi auzereli"),
            ("Macraspis morio", "Macraspis", "morio"),
            ("Macraspis olivieri", "Macraspis", "olivieri"),
            ("Macraspis pantachloris", "Macraspis", "pantachloris"),
            ("Macraspis peruana", "Macraspis", "peruana"),
            ("Macraspis peruviana", "Macraspis", "peruviana"),
            ("Macraspis xanthosticta", "Macraspis", "xanthosticta"),
            ("Pseudothyridium bouchardi", "Pseudothyridium", "bouchardi"),
            ("Mesomerodon spinipenne", "Mesomerodon", "spinipenne"),
        ]
    },
    "Insects (Arthropoda)": {
        "Phasmatidae": [
            ("Prisopus sp.", "Prisopus", "sp."),
            ("Verophasmatoidea spp.", "Verophasmatoidea", "spp."),
            ("Proscopia gigantea", "Proscopia", "gigantea"),
            ("Thesprotiella peruana", "Thesprotiella", "peruana"),
        ],
        "Phylliidae": [
            ("Phyllium giganteum", "Phyllium", "giganteum"),
            ("Phyllium bioculatum", "Phyllium", "bioculatum"),
            ("Phyllium philippinicum", "Phyllium", "philippinicum"),
            ("Chitoniscus brachysoma", "Chitoniscus", "brachysoma"),
            ("Nanophyllium pygmaeum", "Nanophyllium", "pygmaeum"),
        ],
        "Homoptera(Cicadidae)": [
            ("Cathedra serrata", "Cathedra", "serrata"),
            ("Phrictus buchei", "Phrictus", "buchei"),
            ("Retinus dilatatus", "Retinus", "dilatatus"),
            ("Membracis lunata", "Membracis", "lunata"),
            ("Membracis foliata", "Membracis", "foliata"),
            ("Cicadidae gen. sp.", "Cicadidae", "gen. sp."),
            ("Phenax variegata", "Phenax", "variegata"),
            ("Amantia sp.", "Amantia", "sp."),
            ("Aracynthus sanguineus", "Aracynthus", "sanguineus"),
            ("Fulgora laternaria", "Fulgora", "laternaria"),
        ],
        "Scorpion": [
            ("Scorpion sp.", "Scorpion", "Colección General"),
        ],
        "Spirostreptida": [
            ("Archispirostreptus gigas", "Archispirostreptus", "Colección General"),
        ],
        "Scolopendromorpha": [
            ("Scolopendra gigantea", "Scolopendra", "Colección General"),
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
                
                # Manejo de la localidad o especie genérica si aplica
                localidad_o_esp = esp if esp != "Colección General" else "sp."
                
                valores = (
                    categoria,
                    familia,
                    gen,
                    localidad_o_esp,
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
    print("\n✨ ¡Proceso completado con éxito en Neon!")

except Exception as error:
    print(f"❌ Error de conexión a la base de datos: {error}")