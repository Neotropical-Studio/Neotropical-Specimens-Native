import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales en .env.local")
    exit(1)

supabase = create_client(url, key)

# Lista de especies de arácnidos
especies = [
    ("Theraphosidae (Aviculariinae)", "Avicularia avicularia", "Avicularia", "avicularia"),
    ("Theraphosidae (Theraphosinae)", "Acanthoscurria ferina", "Acanthoscurria", "ferina"),
    ("Theraphosidae (Theraphosinae)", "Acanthoscurria sp.", "Acanthoscurria", "sp."),
    ("Theraphosidae (Theraphosinae)", "Acanthoscurria juruenicola", "Acanthoscurria", "juruenicola"),
    ("Theraphosidae (Theraphosinae)", "Lasiodorides striatus", "Lasiodorides", "striatus"),
    ("Theraphosidae (Theraphosinae)", "Pamphobeteus antinous", "Pamphobeteus", "antinous"),
    ("Phrynidae", "Heterophrynus grossetaitai", "Heterophrynus", "grossetaitai"),
    ("Gonyleptidae (Pachylinae)", "Metagyndes innat", "Metagyndes", "innat")
]

print(f"🔄 Iniciando subida de {len(especies)} registros de Arachnida...")

for fam, s_name, gen, esp in especies:
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Arachnida",
        "familia": fam,
        "genero": gen,
        "especie": esp,
        "species_name": s_name,
        "media_url": slug,
        "rubro": "ESPECIMENES_SECOS",
        "region": "Peru",
        "status": "IN_STOCK"
    }
    
    try:
        response = supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        # Verificamos si Supabase devolvió algún error en la respuesta
        if hasattr(response, 'error') and response.error:
            print(f"  ❌ Error de Supabase en {s_name}: {response.error}")
        else:
            print(f"  [✓] Registrado correctamente: {s_name}")
    except Exception as e:
        print(f"  ❌ Excepción en {s_name}: {e}")

print("\n✨ ¡Proceso finalizado!")
