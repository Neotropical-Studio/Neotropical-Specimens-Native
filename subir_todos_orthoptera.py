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

# Lista completa de Orthoptera para Perú
especies = [
    # Adicionales del inicio
    ("Orthoptera", "Ponderacris peruviana", "Ponderacris", "peruviana"),
    ("Orthoptera", "Orotettix andeanus", "Orotettix", "andeanus"),
    
    # Gryllidae y otros grillos peruanos
    ("Orthoptera", "Gryllus capitatus", "Gryllus", "capitatus"),
    ("Orthoptera", "Gryllus miopteryx", "Gryllus", "miopteryx"),
    ("Orthoptera", "Gryllus peruviensis", "Gryllus", "peruviensis"),
    ("Orthoptera", "Miogryllus convolutus", "Miogryllus", "convolutus"),
    ("Orthoptera", "Gryllodes sigillatus", "Gryllodes", "sigillatus"),
    ("Orthoptera", "Odontogryllus setosus", "Odontogryllus", "setosus"),
    ("Orthoptera", "Hemigryllus ortonii", "Hemigryllus", "ortonii"),
    ("Orthoptera", "Pteronemobius schunkei", "Pteronemobius", "schunkei"),
    ("Orthoptera", "Pteronemobius picinus", "Pteronemobius", "picinus"),
    ("Orthoptera", "Argizala brasiliensis", "Argizala", "brasiliensis"),
    ("Orthoptera", "Hygronemobius basalis", "Hygronemobius", "basalis"),
    ("Orthoptera", "Ornebius testaceus", "Ornebius", "testaceus"),
    ("Orthoptera", "Trigonidomimus zernyi", "Trigonidomimus", "zernyi"),
    ("Orthoptera", "Lerneca funebris", "Lerneca", "funebris"),
    ("Orthoptera", "Prosthacusta amplipennis", "Prosthacusta", "amplipennis"),
    ("Orthoptera", "Luzara rufipennis", "Luzara", "rufipennis"),
    ("Orthoptera", "Amusodes andeanum", "Amusodes", "andeanum"),
    ("Orthoptera", "Acia reticulata", "Acia", "reticulata"),
    ("Orthoptera", "Acia vicina", "Acia", "vicina"),
    ("Orthoptera", "Aclodes maculatum", "Aclodes", "maculatum"),
    ("Orthoptera", "Anaxipha annulipes", "Anaxipha", "annulipes"),
    ("Orthoptera", "Anaxipha nigripennis", "Anaxipha", "nigripennis"),
    ("Orthoptera", "Anaxipha nigerrima", "Anaxipha", "nigerrima"),
    ("Orthoptera", "Anaxipha schunkei", "Anaxipha", "schunkei"),
    ("Orthoptera", "Anaxipha peruviana", "Anaxipha", "peruviana"),
    ("Orthoptera", "Anaxipha marginipennis", "Anaxipha", "marginipennis"),
    ("Orthoptera", "Anaxipha titschaki", "Anaxipha", "titschaki"),
    ("Orthoptera", "Anaxipha ruficeps", "Anaxipha", "ruficeps"),
    ("Orthoptera", "Anaxipha sóror", "Anaxipha", "sóror"),
    ("Orthoptera", "Anaxipha rufoguttata", "Anaxipha", "rufoguttata"),
    ("Orthoptera", "Anaxipha infirmenotata", "Anaxipha", "infirmenotata"),
    ("Orthoptera", "Anaxipha allardi", "Anaxipha", "allardi"),
    ("Orthoptera", "Anaxipha variegata", "Anaxipha", "variegata"),
    ("Orthoptera", "Anaxipha nítida", "Anaxipha", "nítida"),
    ("Orthoptera", "Anaxipha smithi", "Anaxipha", "smithi"),
    ("Orthoptera", "Anaxipha angusticollis", "Anaxipha", "angusticollis"),
    ("Orthoptera", "Anaxipha stolzmanni", "Anaxipha", "stolzmanni"),
    ("Orthoptera", "Anaxipha gracilis", "Anaxipha", "gracilis"),
    ("Orthoptera", "Cyrtoxipha pernambucensis", "Cyrtoxipha", "pernambucensis"),
    ("Orthoptera", "Symphiloxiphus riveti", "Symphiloxiphus", "riveti"),
    ("Orthoptera", "Metioche peruviana", "Metioche", "peruviana"),
    ("Orthoptera", "Rhicnogryllus annulipes", "Rhicnogryllus", "annulipes"),
    ("Orthoptera", "Phylloscyrtus elegans", "Phylloscyrtus", "elegans"),
    ("Orthoptera", "Eneoptera surinamensis", "Eneoptera", "surinamensis"),
    ("Orthoptera", "Eneopterides flavifrons", "Eneopterides", "flavifrons"),
    ("Orthoptera", "Amblyrhetus nodifer", "Amblyrhetus", "nodifer"),
    ("Orthoptera", "Diatrypa pallidilabris", "Diatrypa", "pallidilabris"),
    ("Orthoptera", "Diatrypa affinis", "Diatrypa", "affinis"),
    ("Orthoptera", "Diatrypa allardi", "Diatrypa", "allardi"),
    ("Orthoptera", "Diatrypa latipennis", "Diatrypa", "latipennis"),
    ("Orthoptera", "Diatrypa schunkei", "Diatrypa", "schunkei"),
    ("Orthoptera", "Diatrypa minuta", "Diatrypa", "minuta"),
    ("Orthoptera", "Aphonomorphus mutus", "Aphonomorphus", "mutus"),
    ("Orthoptera", "Aphonomorphus telskii", "Aphonomorphus", "telskii"),
    ("Orthoptera", "Aphonomorphus luteicornis", "Aphonomorphus", "luteicornis"),
    ("Orthoptera", "Aphonomorphus duplovenatus", "Aphonomorphus", "duplovenatus"),
    ("Orthoptera", "Aphonomorphus socius", "Aphonomorphus", "socius"),
    ("Orthoptera", "Aphonomorphus deceptor", "Aphonomorphus", "deceptor"),
    ("Orthoptera", "Aphonomorphus schunkei", "Aphonomorphus", "schunkei"),
    ("Orthoptera", "Aphonomorphus allardi", "Aphonomorphus", "allardi"),
    ("Orthoptera", "Aphonomorphus adjunctus", "Aphonomorphus", "adjunctus"),
    ("Orthoptera", "Aphonomorphus elegans", "Aphonomorphus", "elegans"),
    ("Orthoptera", "Euaphonus peruvianus", "Euaphonus", "peruvianus"),
    ("Orthoptera", "Paraphonus vicinus", "Paraphonus", "vicinus"),
    ("Orthoptera", "Parametrypus aculeatus", "Parametrypus", "aculeatus"),
    
    # Oecanthidae y Gryllotalpidae integrados en Orthoptera
    ("Orthoptera", "Oecanthus peruvianus", "Oecanthus", "peruvianus"),
    ("Orthoptera", "Neoxabea astales", "Neoxabea", "astales"),
    ("Orthoptera", "Neocurtilla hexadactyla", "Neocurtilla", "hexadactyla"),
    ("Orthoptera", "Neocurtilla maranona", "Neocurtilla", "maranona"),
    ("Orthoptera", "Scapteriscus vicinus", "Scapteriscus", "vicinus"),
    ("Orthoptera", "Scapteriscus tetradactylus", "Scapteriscus", "tetradactylus")
]

print(f"🔄 Registrando {len(especies)} especies bajo Orthoptera...")

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
        print(f"  [✓] {s_name}")
    except Exception as e:
        print(f"  ❌ Error en {s_name}: {e}")

print("\n✨ ¡Proceso completado con éxito!")
