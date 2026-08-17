import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontraron las credenciales")
    exit(1)

supabase = create_client(url, key)

# Especies de arácnidos adaptadas a la categoría de la web
especies = [
    ("Spider (Anothers)", "Avicularia avicularia", "Avicularia", "avicularia"),
    ("Spider (Anothers)", "Acanthoscurria ferina", "Acanthoscurria", "ferina"),
    ("Spider (Anothers)", "Acanthoscurria sp.", "Acanthoscurria", "sp."),
    ("Spider (Anothers)", "Acanthoscurria juruenicola", "Acanthoscurria", "juruenicola"),
    ("Spider (Anothers)", "Lasiodorides striatus", "Lasiodorides", "striatus"),
    ("Spider (Anothers)", "Pamphobeteus antinous", "Pamphobeteus", "antinous"),
    ("Spider (Anothers)", "Heterophrynus grossetaitai", "Heterophrynus", "grossetaitai"),
    ("Spider (Anothers)", "Metagyndes innat", "Metagyndes", "innat")
]

print(f"🔄 Iniciando subida de {len(especies)} registros...")

for fam, s_name, gen, esp in especies:
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Insects (Arthropoda)",
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
        print(f"  [✓] Registrado: {s_name}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso finalizado con éxito!")
