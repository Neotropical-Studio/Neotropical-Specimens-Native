import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

# Lista procesada de Lucanidae (sin duplicados y sin autores)
especies = [
    ("Lucanidae", "Aegognathus aguirrei", "Aegognathus", "aguirrei"),
    ("Lucanidae", "Aegognathus leuthneri damasoi", "Aegognathus", "leuthneri damasoi"),
    ("Lucanidae", "Aegognathus similis", "Aegognathus", "similis"),
    ("Lucanidae", "Aegognathus soulai", "Aegognathus", "soulai"),
    ("Lucanidae", "Andinolucanus inesae", "Andinolucanus", "inesae"),
    ("Lucanidae", "Cantharolethrus azambrei", "Cantharolethrus", "azambrei"),
    ("Lucanidae", "Cantharolethrus steinheili", "Cantharolethrus", "steinheili"),
    ("Lucanidae", "Onorelucanus marujae", "Onorelucanus", "marujae"),
    ("Lucanidae", "Pseudoscortizus incredibilis", "Pseudoscortizus", "incredibilis"),
    ("Lucanidae", "Sphaenognathus giganteus", "Sphaenognathus", "giganteus"),
    ("Lucanidae", "Sphaenognathus monguilloni", "Sphaenognathus", "monguilloni")
]

print(f"🔄 Iniciando subida de {len(especies)} especies de Lucanidae...")

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

print("\n✨ ¡Proceso de subida de Lucanidae finalizado!")
