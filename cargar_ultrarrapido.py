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
conn = psycopg2.connect(os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL"))
cur = conn.cursor()

print("🚀 Sincronización ultrarrápida iniciada...\n")

# A. Precargar familias existentes en memoria
cur.execute("SELECT LOWER(nombre), id FROM familias;")
familias_map = dict(cur.fetchall())

def obtener_id_familia(nombre_fam):
    if not nombre_fam or not nombre_fam.strip():
        return None
    nombre_clean = nombre_fam.strip().title()
    key = nombre_clean.lower()
    
    if key in familias_map:
        return familias_map[key]
    
    cur.execute("INSERT INTO familias (nombre) VALUES (%s) RETURNING id;", (nombre_clean,))
    fid = cur.fetchone()[0]
    familias_map[key] = fid
    return fid

# B. Precargar códigos de especímenes existentes
cur.execute("SELECT code FROM especimenes WHERE code IS NOT NULL;")
codes_existentes = set(r[0] for r in cur.fetchall())

insertados = 0
duplicados = 0

# C. Cargar CSVs
for filepath in glob.glob('./data/*.csv'):
    with open(filepath, mode='r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            code = row.get('code', '').strip()
            if code and code in codes_existentes:
                duplicados += 1
                continue

            fam_id = obtener_id_familia(row.get('familia'))
            precio = float(row['precio']) if row.get('precio') and row['precio'].replace('.','',1).isdigit() else None
            
            cur.execute("""
                INSERT INTO especimenes (
                    code, nombre_cientifico, nombre_comun, familia_id, 
                    order_name, subfamily, genus, locality, gps, sex, grade, retail_price
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                code or None, row.get('nombre_cientifico', '').strip() or None,
                row.get('nombre_comun'), fam_id, row.get('orden'),
                row.get('subfamilia'), row.get('genero'), row.get('localidad_especifica'),
                row.get('gps'), row.get('sexo'), row.get('calidad'), precio
            ))
            if code: codes_existentes.add(code)
            insertados += 1

# D. Cargar JSON (Hymenoptera)
json_path = './src/data/hymenoptera.json'
if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        items = data if isinstance(data, list) else data.get('specimens', data.get('especies', []))
        for item in items:
            code = str(item.get('code') or item.get('id', '')).strip()
            if code and code in codes_existentes:
                duplicados += 1
                continue

            fam_id = obtener_id_familia(item.get('family') or item.get('familia'))
            precio = float(item['price']) if str(item.get('price', '')).replace('.','',1).isdigit() else None
            
            cur.execute("""
                INSERT INTO especimenes (
                    code, nombre_cientifico, nombre_comun, familia_id,
                    order_name, subfamily, genus, species, subspecies, retail_price
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                code or None, item.get('scientific_name') or item.get('nombre_cientifico'),
                item.get('common_name') or item.get('nombre_comun'), fam_id,
                item.get('order') or 'Hymenoptera', item.get('subfamily'),
                item.get('genus'), item.get('species'), item.get('subspecies'), precio
            ))
            if code: codes_existentes.add(code)
            insertados += 1

conn.commit()

cur.execute("SELECT COUNT(*) FROM especimenes;")
total_esp = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM familias;")
total_fam = cur.fetchone()[0]

cur.close()
conn.close()

print(f"🎉 ¡CARGA COMPLETA Y SIN DUPLICADOS!")
print(f" ├─ Insertados en esta sesión: {insertados}")
print(f" ├─ Omitidos por duplicado:     {duplicados}")
print(f" ├─ Total Especímenes en BD:    {total_esp}")
print(f" └─ Total Familias en BD:       {total_fam}")
