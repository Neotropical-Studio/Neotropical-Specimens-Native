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

# 1. Obtener las columnas reales de la tabla especimenes
cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'especimenes';
""")
cols_db = set(row[0] for row in cur.fetchall())

print("📋 COLUMNAS REALES EN TU BASE DE DATOS (Neon DB):")
print(sorted(list(cols_db)))

# Mapa de equivalencias entre el CSV/JSON local y las columnas reales en la BD
def obtener_valor(row, *claves):
    for k in claves:
        if k in row and row[k] is not None and str(row[k]).strip() != '':
            return str(row[k]).strip()
    return None

def armar_payload(row):
    code = obtener_valor(row, 'code', 'codigo', 'id')
    sci_name = obtener_valor(row, 'scientific_name', 'nombre_cientifico', 'scientificName')
    com_name = obtener_valor(row, 'common_name', 'nombre_comun', 'commonName')
    order = obtener_valor(row, 'order', 'orden', 'order_name')
    subfam = obtener_valor(row, 'subfamily', 'subfamilia')
    genus = obtener_valor(row, 'genus', 'genero')
    species = obtener_valor(row, 'species', 'especie')
    subspecies = obtener_valor(row, 'subspecies', 'subespecie')
    locality = obtener_valor(row, 'locality', 'localidad', 'localidad_especifica')
    gps = obtener_valor(row, 'gps', 'coordinates', 'coordenadas')
    sex = obtener_valor(row, 'sex', 'sexo')
    grade = obtener_valor(row, 'grade', 'calidad', 'quality')
    
    precio_raw = obtener_valor(row, 'price', 'precio', 'retail_price')
    price = float(precio_raw) if precio_raw and precio_raw.replace('.','',1).isdigit() else None

    payload = {}
    
    # Asignar a columnas exactas según existan en la tabla DB
    if 'code' in cols_db and code: payload['code'] = code
    if 'scientific_name' in cols_db and sci_name: payload['scientific_name'] = sci_name
    elif 'nombre_cientifico' in cols_db and sci_name: payload['nombre_cientifico'] = sci_name
    
    if 'common_name' in cols_db and com_name: payload['common_name'] = com_name
    elif 'nombre_comun' in cols_db and com_name: payload['nombre_comun'] = com_name

    if 'order_name' in cols_db and order: payload['order_name'] = order
    elif 'order' in cols_db and order: payload['order'] = order
    elif 'orden' in cols_db and order: payload['orden'] = order

    if 'subfamily' in cols_db and subfam: payload['subfamily'] = subfam
    elif 'subfamilia' in cols_db and subfam: payload['subfamilia'] = subfam

    if 'genus' in cols_db and genus: payload['genus'] = genus
    elif 'genero' in cols_db and genus: payload['genero'] = genus

    if 'species' in cols_db and species: payload['species'] = species
    elif 'especie' in cols_db and species: payload['especie'] = species

    if 'subspecies' in cols_db and subspecies: payload['subspecies'] = subspecies
    elif 'subespecie' in cols_db and subspecies: payload['subespecie'] = subspecies

    if 'locality' in cols_db and locality: payload['locality'] = locality
    elif 'localidad' in cols_db and locality: payload['localidad'] = locality
    elif 'localidad_especifica' in cols_db and locality: payload['localidad_especifica'] = locality

    if 'gps' in cols_db and gps: payload['gps'] = gps
    if 'sex' in cols_db and sex: payload['sex'] = sex
    elif 'sexo' in cols_db and sex: payload['sexo'] = sex

    if 'grade' in cols_db and grade: payload['grade'] = grade
    elif 'calidad' in cols_db and grade: payload['calidad'] = grade

    if 'retail_price' in cols_db and price: payload['retail_price'] = price
    elif 'price' in cols_db and price: payload['price'] = price
    elif 'precio' in cols_db and price: payload['precio'] = price

    if 'status' in cols_db: payload['status'] = 'available'

    return payload

actualizados = 0

# Actualizar todos los especímenes existentes con el mapeo correcto
for filepath in glob.glob('./data/*.csv'):
    with open(filepath, mode='r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            code = obtener_valor(row, 'code', 'codigo', 'id')
            if not code: continue
            
            p = armar_payload(row)
            if not p: continue

            set_clause = ", ".join([f"{k} = %s" for k in p.keys()])
            values = list(p.values()) + [code]
            
            cur.execute(f"UPDATE especimenes SET {set_clause} WHERE code = %s;", values)
            actualizados += cur.rowcount

conn.commit()

cur.close()
conn.close()

print(f"\n✅ ¡MAPEO COMPLETO! Se actualizaron {actualizados} registros en Neon DB con los nombres de columna compatibles con tu sitio web.")
