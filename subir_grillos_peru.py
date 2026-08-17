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

# Lista de especies filtrada para Perú
especies = [
    # --- Gryllidae ---
    ("Gryllidae", "Gryllus capitatus", "Gryllus", "capitatus"),
    ("Gryllidae", "Gryllus miopteryx", "Gryllus", "miopteryx"),
    ("Gryllidae", "Gryllus peruviensis", "Gryllus", "peruviensis"),
    ("Gryllidae", "Miogryllus convolutus", "Miogryllus", "convolutus"),
    ("Gryllidae", "Gryllodes sigillatus", "Gryllodes", "sigillatus"),
    ("Gryllidae", "Odontogryllus setosus", "Odontogryllus", "setosus"),
    ("Gryllidae", "Hemigryllus ortonii", "Hemigryllus", "ortonii"),
    ("Gryllidae", "Pteronemobius schunkei", "Pteronemobius", "schunkei"),
    ("Gryllidae", "Pteronemobius picinus", "Pteronemobius", "picinus"),
    ("Gryllidae", "Argizala brasiliensis", "Argizala", "brasiliensis"),
    ("Gryllidae", "Hygronemobius basalis", "Hygronemobius", "basalis"),
    ("Gryllidae", "Ornebius testaceus", "Ornebius", "testaceus"),
    ("Gryllidae", "Trigonidomimus zernyi", "Trigonidomimus", "zernyi"),
    ("Gryllidae", "Lerneca funebris", "Lerneca", "funebris"),
    ("Gryllidae", "Prosthacusta amplipennis", "Prosthacusta", "amplipennis"),
    ("Gryllidae", "Luzara rufipennis", "Luzara", "rufipennis"),
    ("Gryllidae", "Amusodes andeanum", "Amusodes", "andeanum"),
    ("Gryllidae", "Acia reticulata", "Acia", "reticulata"),
    ("Gryllidae", "Acia vicina", "Acia", "vicina"),
    ("Gryllidae", "Aclodes maculatum", "Aclodes", "maculatum"),
    ("Gryllidae", "Anaxipha annulipes", "Anaxipha", "annulipes"),
    ("Gryllidae", "Anaxipha nigripennis", "Anaxipha", "nigripennis"),
    ("Gryllidae", "Anaxipha nigerrima", "Anaxipha", "nigerrima"),
    ("Gryllidae", "Anaxipha schunkei", "Anaxipha", "schunkei"),
    ("Gryllidae", "Anaxipha peruviana", "Anaxipha", "peruviana"),
    ("Gryllidae", "Anaxipha marginipennis", "Anaxipha", "marginipennis"),
    ("Gryllidae", "Anaxipha titschaki", "Anaxipha", "titschaki"),
    ("Gryllidae", "Anaxipha ruficeps", "Anaxipha", "ruficeps"),
    ("Gryllidae", "Anaxipha sóror", "Anaxipha", "sóror"),
    ("Gryllidae", "Anaxipha rufoguttata", "Anaxipha", "rufoguttata"),
    ("Gryllidae", "Anaxipha infirmenotata", "Anaxipha", "infirmenotata"),
    ("Gryllidae", "Anaxipha allardi", "Anaxipha", "allardi"),
    ("Gryllidae", "Anaxipha variegata", "Anaxipha", "variegata"),
    ("Gryllidae", "Anaxipha nítida", "Anaxipha", "nítida"),
    ("Gryllidae", "Anaxipha smithi", "Anaxipha", "smithi"),
    ("Gryllidae", "Anaxipha angusticollis", "Anaxipha", "angusticollis"),
    ("Gryllidae", "Anaxipha stolzmanni", "Anaxipha", "stolzmanni"),
    ("Gryllidae", "Anaxipha gracilis", "Anaxipha", "gracilis"),
    ("Gryllidae", "Cyrtoxipha pernambucensis", "Cyrtoxipha", "pernambucensis"),
    ("Gryllidae", "Symphiloxiphus riveti", "Symphiloxiphus", "riveti"),
    ("Gryllidae", "Metioche peruviana", "Metioche", "peruviana"),
    ("Gryllidae", "Rhicnogryllus annulipes", "Rhicnogryllus", "annulipes"),
    ("Gryllidae", "Phylloscyrtus elegans", "Phylloscyrtus", "elegans"),
    ("Gryllidae", "Eneoptera surinamensis", "Eneoptera", "surinamensis"),
    ("Gryllidae", "Eneopterides flavifrons", "Eneopterides", "flavifrons"),
    ("Gryllidae", "Amblyrhetus nodifer", "Amblyrhetus", "nodifer"),
    ("Gryllidae", "Diatrypa pallidilabris", "Diatrypa", "pallidilabris"),
    ("Gryllidae", "Diatrypa affinis", "Diatrypa", "affinis"),
    ("Gryllidae", "Diatrypa allardi", "Diatrypa", "allardi"),
    ("Gryllidae", "Diatrypa latipennis", "Diatrypa", "latipennis"),
    ("Gryllidae", "Diatrypa schunkei", "Diatrypa", "schunkei"),
    ("Gryllidae", "Diatrypa minuta", "Diatrypa", "minuta"),
    ("Gryllidae", "Aphonomorphus mutus", "Aphonomorphus", "mutus"),
    ("Gryllidae", "Aphonomorphus telskii", "Aphonomorphus", "telskii"),
    ("Gryllidae", "Aphonomorphus luteicornis", "Aphonomorphus", "luteicornis"),
    ("Gryllidae", "Aphonomorphus duplovenatus", "Aphonomorphus", "duplovenatus"),
    ("Gryllidae", "Aphonomorphus socius", "Aphonomorphus", "socius"),
    ("Gryllidae", "Aphonomorphus deceptor", "Aphonomorphus", "deceptor"),
    ("Gryllidae", "Aphonomorphus schunkei", "Aphonomorphus", "schunkei"),
    ("Gryllidae", "Aphonomorphus allardi", "Aphonomorphus", "allardi"),
    ("Gryllidae", "Aphonomorphus adjunctus", "Aphonomorphus", "adjunctus"),
    ("Gryllidae", "Aphonomorphus elegans", "Aphonomorphus", "elegans"),
    ("Gryllidae", "Euaphonus peruvianus", "Euaphonus", "peruvianus"),
    ("Gryllidae", "Paraphonus vicinus", "Paraphonus", "vicinus"),
    ("Gryllidae", "Parametrypus aculeatus", "Parametrypus", "aculeatus"),
    
    # --- Oecanthidae ---
    ("Oecanthidae", "Oecanthus peruvianus", "Oecanthus", "peruvianus"),
    ("Oecanthidae", "Neoxabea astales", "Neoxabea", "astales"),
    
    # --- Gryllotalpidae ---
    ("Gryllotalpidae", "Neocurtilla hexadactyla", "Neocurtilla", "hexadactyla"),
    ("Gryllotalpidae", "Neocurtilla maranona", "Neocurtilla", "maranona"),
    ("Gryllotalpidae", "Scapteriscus vicinus", "Scapteriscus", "vicinus"),
    ("Gryllotalpidae", "Scapteriscus tetradactylus", "Scapteriscus", "tetradactylus")
]

print(f"🔄 Registrando {len(especies)} especies de grillos peruanos...")

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
        supabase.table('specimens').upsert(record, on_conflict='media_url').execute()
        print(f"  [✓] {s_name} ({fam})")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso completado! Los grillos están en el catálogo.")
