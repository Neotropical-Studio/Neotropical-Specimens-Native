import os
import csv
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

if not DATABASE_URL:
    print("❌ Error: No se encontró DATABASE_URL en .env.local")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Inspeccionar columnas reales de las tablas de destino
def obtener_columnas(tabla):
    try:
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{tabla}';")
        return [r[0] for r in cur.fetchall()]
    except Exception:
        return []

cols_familias = obtener_columnas('familias')
cols_especies = obtener_columnas('especies')
cols_especimenes = obtener_columnas('especimenes')

print(f"🚀 Iniciando migración a Neon DB...")
print(f"  ├─ Columnas 'familias': {cols_familias}")
print(f"  ├─ Columnas 'especies': {cols_especies}")
print(f"  └─ Columnas 'especimenes': {cols_especimenes}\n")

archivos_csv = glob.glob('./data/*.csv')
total_registros = 0

for filepath in archivos_csv:
    nombre_archivo = os.path.basename(filepath)
    print(f"📦 Procesando {nombre_archivo}...")
    
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                cur.execute("SAVEPOINT sp;")
                
                # Insertar/Asegurar Familia
                familia_nombre = row.get('familia', '').strip()
                if familia_nombre and 'familias' in cols_familias or 'nombre' in cols_familias:
                    col_fam = 'nombre' if 'nombre' in cols_familias else 'familia'
                    cur.execute(f"INSERT INTO familias ({col_fam}) VALUES (%s) ON CONFLICT DO NOTHING;", (familia_nombre,))
                
                # Inserción en especies o especimenes según las columnas existentes
                if cols_especimenes:
                    campos = []
                    valores = []
                    
                    mapa = {
                        'codigo': row.get('code'),
                        'codigo_especimen': row.get('code'),
                        'nombre_cientifico': row.get('nombre_cientifico'),
                        'nombre_comun': row.get('nombre_comun'),
                        'familia': row.get('familia'),
                        'subfamilia': row.get('subfamilia'),
                        'genero': row.get('genero'),
                        'orden': row.get('orden'),
                        'region': row.get('region'),
                        'localidad': row.get('localidad_especifica'),
                        'gps': row.get('gps'),
                        'calidad': row.get('calidad'),
                        'sexo': row.get('sexo'),
                        'precio': float(row['precio']) if row.get('precio') and row['precio'].replace('.','',1).isdigit() else None
                    }

                    for col_db, val in mapa.items():
                        if col_db in cols_especimenes and val is not None:
                            campos.append(col_db)
                            valores.append(val)

                    if campos:
                        sql = f"INSERT INTO especimenes ({', '.join(campos)}) VALUES ({', '.join(['%s']*len(valores))});"
                        cur.execute(sql, tuple(valores))

                cur.execute("RELEASE SAVEPOINT sp;")
                total_registros += 1

            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT sp;")
                # Continuar con la siguiente fila si hay un duplicado o error menor

conn.commit()
cur.close()
conn.close()

print(f"\n🎉 ¡Migración masiva completada! Se procesaron e insertaron {total_registros} registros taxonómicos en Neon DB.")
