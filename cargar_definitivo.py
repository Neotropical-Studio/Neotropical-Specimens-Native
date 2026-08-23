import os, csv, json, glob, psycopg2

def cargar_env():
    for f in ['.env.local', '.env']:
        if os.path.exists(f):
            with open(f, encoding='utf-8') as file:
                for line in file:
                    if '=' in line and not line.startswith('#'):
                        k, v = line.strip().split('=', 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")

cargar_env()
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

def obtener_o_crear_familia(nombre_fam):
    if not nombre_fam:
        return None
    nombre_clean = nombre_fam.strip().title()
    cur.execute("SELECT id FROM familias WHERE LOWER(nombre) = LOWER(%s);", (nombre_clean,))
    res = cur.fetchone()
    if res:
        return res[0]
    try:
        cur.execute("INSERT INTO familias (nombre) VALUES (%s) RETURNING id;", (nombre_clean,))
        fid = cur.fetchone()[0]
        conn.commit()
        return fid
    except Exception:
        conn.rollback()
        cur.execute("SELECT id FROM familias WHERE LOWER(nombre) = LOWER(%s);", (nombre_clean,))
        res = cur.fetchone()
        return res[0] if res else None

print("🚀 Cargando datos a Neon DB sin duplicados...\n")

insertados = 0
duplicados = 0

# 1. Cargar CSVs
files_csv = glob.glob('./data/*.csv')
for filepath in files_csv:
    archivo = os.path.basename(filepath)
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row.get('code', '').strip()
            nombre_ci = row.get('nombre_cientifico', '').strip()
            
            # Chequeo de duplicado exacto
            if code:
                cur.execute("SELECT id FROM especimenes WHERE code = %s;", (code,))
                if cur.fetchone():
                    duplicados += 1
                    continue

            fam_id = obtener_o_crear_familia(row.get('familia'))
            
            try:
                cur.execute("SAVEPOINT sp;")
                sql = """
                    INSERT INTO especimenes (
                        code, nombre_cientifico, nombre_comun, familia_id, 
                        order_name, subfamily, genus, locality, gps, sex, grade, retail_price
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """
                precio = float(row['precio']) if row.get('precio') and row['precio'].replace('.','',1).isdigit() else None
                cur.execute(sql, (
                    code or None, nombre_ci or None, row.get('nombre_comun'), fam_id,
                    row.get('orden'), row.get('subfamilia'), row.get('genero'),
                    row.get('localidad_especifica'), row.get('gps'), row.get('sexo'),
                    row.get('calidad'), precio
                ))
                cur.execute("RELEASE SAVEPOINT sp;")
                insertados += 1
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT sp;")
                duplicados += 1

# 2. Cargar Hymenoptera JSON
json_path = './src/data/hymenoptera.json'
if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        items = data if isinstance(data, list) else data.get('specimens', data.get('especies', []))
        for item in items:
            code = str(item.get('code') or item.get('id', '')).strip()
            if code:
                cur.execute("SELECT id FROM especimenes WHERE code = %s;", (code,))
                if cur.fetchone():
                    duplicados += 1
                    continue

            fam_id = obtener_o_crear_familia(item.get('family') or item.get('familia'))
            try:
                cur.execute("SAVEPOINT sp_j;")
                sql = """
                    INSERT INTO especimenes (
                        code, nombre_cientifico, nombre_comun, familia_id,
                        order_name, subfamily, genus, species, subspecies, retail_price
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """
                precio = float(item['price']) if str(item.get('price', '')).replace('.','',1).isdigit() else None
                cur.execute(sql, (
                    code or None,
                    item.get('scientific_name') or item.get('nombre_cientifico'),
                    item.get('common_name') or item.get('nombre_comun'),
                    fam_id,
                    item.get('order') or 'Hymenoptera',
                    item.get('subfamily'),
                    item.get('genus'),
                    item.get('species'),
                    item.get('subspecies'),
                    precio
                ))
                cur.execute("RELEASE SAVEPOINT sp_j;")
                insertados += 1
            except Exception:
                cur.execute("ROLLBACK TO SAVEPOINT sp_j;")
                duplicados += 1

conn.commit()

# Verificación Final
cur.execute("SELECT COUNT(*) FROM especimenes;")
total_especimenes_db = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM familias;")
total_familias_db = cur.fetchone()[0]

cur.close()
conn.close()

print(f"🎉 ¡PROCESO FINALIZADO!")
print(f" ├─ Nuevos registros insertados en este pase: {insertados}")
print(f" ├─ Omitidos por duplicado / ya existían:     {duplicados}")
print(f" ├─ TOTAL ACTUAL EN BD (Especímenes):         {total_especimenes_db}")
print(f" └─ TOTAL ACTUAL EN BD (Familias):            {total_familias_db}")
