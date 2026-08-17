import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
# Usar la clave de servicio (service_role) para saltar las políticas de seguridad (RLS)
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: No se encontró la URL o la SUPABASE_SERVICE_ROLE_KEY en tu .env.local")
    exit(1)

supabase = create_client(url, key)

# Especies de Scarabaeidae confirmadas para Perú
especies = [
    ("Scarabaeidae", "Canthon smaragdulus", "Canthon", "smaragdulus"),
    ("Scarabaeidae", "Canthon sp.", "Canthon", "sp."),
    ("Scarabaeidae", "Dichotomius sp.", "Dichotomius", "sp."),
    ("Scarabaeidae", "Deltochilum sp.", "Deltochilum", "sp."),
    ("Scarabaeidae", "Onthophagus gazella", "Onthophagus", "gazella"),
    ("Scarabaeidae", "Onthophagus sp.", "Onthophagus", "sp."),
    ("Scarabaeidae", "Eurysternus sp.", "Eurysternus", "sp."),
    ("Scarabaeidae", "Oxysternon sp.", "Oxysternon", "sp."),
    ("Scarabaeidae", "Phanaeus sp.", "Phanaeus", "sp.")
]

print(f"🔄 Iniciando subida de {len(especies)} especies peruanas de Scarabaeidae...")

for fam, s_name, gen, esp in especies:
    slug = s_name.lower().replace('.', '').replace(' ', '-') + "-01.jpg"
    
    record = {
        "categoria": "Beetles (Coleoptera)",
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
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] Registrado: {s_name}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso de subida de Scarabaeidae (Perú) finalizado!")
