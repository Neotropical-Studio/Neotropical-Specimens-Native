import psycopg2

try:
    conn = psycopg2.connect(
        dbname="neotropical",
        user="postgres",
        password="Jza22493426.L@@@",
        host="64.227.23.161",
        port="5432"
    )
    cur = conn.cursor()
    print("¡Conexión exitosa a la base de datos de DigitalOcean!")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error al conectar con la base de datos: {e}")
