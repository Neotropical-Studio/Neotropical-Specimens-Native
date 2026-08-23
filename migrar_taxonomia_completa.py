import os
import csv
import json
import glob
import psycopg2

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

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

def obtener_o_crear_id(tabla, columna, valor):
    if not valor:
        return None
    try:
        cur.execute(f"SELECT id FROM {tabla} WHERE LOWER({columna}) = LOWER(%s);", (valor.strip(),))
        res = cur.fetchone()
        if res:
            return res[0]
        cur.execute(f"INSERT INTO {tabla} ({columna}) VALUES (%s) RETURNING id;", (valor.strip(),))
        return cur.fetchone()[0]
    except Exception:
        conn.rollback()
        return None

print("🚀 Iniciando migración de datos taxonómicos, CSVs y Hymenoptera JSON...\n")

# 1. Migración de Archivos CSV
archivos_csv = glob.glob('./data/*.csv')
total_csv = 0

for filepath in archivos_csv:
    nombre_archivo = os.path.basename(filepath)
    print(f"📦 Procesando {nombre_archivo}...")
    
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                cur.execute("SAVEPOINT sp_csv;")
                
                # Crear entidades foráneas
                fam_id = obtener_o_crear_id('familias', 'nombre', row.get('familia'))
                reg_id = obtener_o_crear_id('global_regions', 'nombre', row.get('region')) if 'global_regions' in [t[0] for t in cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';") or []] else None

                # Mapeo de columnas exactas detectadas en Neon DB
                sql = """
                    INSERT INTO especimenes (
                        code, nombre_cientifico, nombre_comun, familia_id, 
                        order_name, subfamily, genus, locality, gps, sex, grade, retail_price
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """
                
                precio = float(row['precio']) if row.get('precio') and row['precio'].replace('.','',1).isdigit() else None
                
                cur.execute(sql, (
                    row.get('code'),
                    row.get('nombre_cientifico'),
                    row.get('nombre_comun'),
                    fam_id,
                    row.get('orden'),
                    row.get('subfamilia'),
                    row.get('genero'),
                    row.get('localidad_especifica'),
                    row.get('gps'),
                    row.get('sexo'),
                    row.get('calidad'),
                    precio
                ))
                
                cur.execute("RELEASE SAVEPOINT sp_csv;")
                total_csv += 1
            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT sp_csv;")

# 2. Migración del JSON de Hymenoptera
json_path = './src/data/hymenoptera.json'
total_json = 0

if os.path.exists(json_path):
    print(f"\n📦 Procesando {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        datos = json.load(f)
        items = datos if isinstance(datos, list) else datos.get('specimens', datos.get('especies', []))
        
        for item in items:
            try:
                cur.execute("SAVEPOINT sp_json;")
                fam_id = obtener_o_crear_id('familias', 'nombre', item.get('family') or item.get('familia'))
                
                sql = """
                    INSERT INTO especimenes (
                        code, nombre_cientifico, nombre_comun, familia_id,
                        order_name, subfamily, genus, species, subspecies, retail_price
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """
                cur.execute(sql, (
                    item.get('code') or item.get('id'),
                    item.get('scientific_name') or item.get('nombre_cientifico'),
                    item.get('common_name') or item.get('nombre_comun'),
                    fam_id,
                    item.get('order') or 'Hymenoptera',
                    item.get('subfamily'),
                    item.get('genus'),
                    item.get('species'),
                    item.get('subspecies'),
                    float(item['price']) if str(item.get('price', '')).replace('.','',1).isdigit() else None
                ))
                cur.execute("RELEASE SAVEPOINT sp_json;")
                total_json += 1
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT sp_json;")

conn.commit()
cur.close()
conn.close()

print(f"\n🎉 ¡Migración completada!")
print(f"  ├─ Registros desde CSVs: {total_csv}")
print(f"  └─ Registros desde JSON (Hymenoptera): {total_json}")
