import csv
from supabase import create_client

SUPABASE_URL = "https://pcoqtffxcemcmsjagkdo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3F0ZmZ4Y2VtY21zamFna2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjIyNTgsImV4cCI6MjEwMDM5ODI1OH0.lUGmkmImAIg6J-9CsFOJYkpEk-X8kGJZOLHjlUTfGqs"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Datos limpios en formato estructurado de lista/CSV
datos_csv = """superfamilia,familia,genero,especie,localidad
Evanioidea,Evaniidae,Evania,Evania sp.,"Piura, Sullana, Talara, Paita, Sechura, Morropón, Huancabamba, Ayacucho"
Platygastroidea,Platygastridae,Amitus,Amitus spiniferus,"Piura, Sullana"
Platygastroidea,Platygastridae,Telenomus,Telenomus alecto,"Piura, Sullana"
Cynipoidea,Figitidae,Ganaspidium,Ganaspidium sp.,Piura
Chalcidoidea,Aphelinidae,Encarsia,Encarsia formosa,"Piura, Sullana"
Chalcidoidea,Aphelinidae,Encarsia,Encarsia pergandiella,"Piura, Sullana"
Chalcidoidea,Aphelinidae,Encarsia,Encarsia tabacivora,Piura
Chalcidoidea,Aphelinidae,Aphytis,Aphytis chrysomphali,"Piura, Sullana, Paita"
Chalcidoidea,Aphelinidae,Eretmocerus,Eretmocerus eremicus,Piura
Chalcidoidea,Chalcididae,Brachymeria,Brachymeria podagrica,"Piura, Sullana, Paita, Talara, Sechura, Morropón, Huancabamba, Ayacucho"
Chalcidoidea,Encyrtidae,Ooencyrtus,Ooencyrtus bucculatrix,Piura
Chalcidoidea,Eulophidae,Chrysocharis,Chrysocharis vonones,"Piura, Sullana, Talara, Paita, Sechura"
Chalcidoidea,Eulophidae,Proacrias,Proacrias thysanoides,Piura
Chalcidoidea,Eulophidae,Diglyphus,Diglyphus websteri,Piura
Chalcidoidea,Eulophidae,Zagrammosoma,Zagrammosoma variegatum,Piura
Chalcidoidea,Eulophidae,Diaulinopsis,Diaulinopsis callichroma,Piura
Chalcidoidea,Eupelmidae,Eupelmus,Eupelmus (Eupelmus) pulchriceps,"Piura, Sullana"
Chalcidoidea,Eupelmidae,Brasema,Brasema peruviana,"Piura, Sullana"
Chalcidoidea,Eurytomidae,Eurytoma,Eurytoma piurae,Piura
Chalcidoidea,Pteromalidae,Dibrachys,Dibrachys microgastri,"Piura, Sullana"
Chalcidoidea,Pteromalidae,Jaliscoa,Jaliscoa hunteri,"Piura, Sullana"
Chalcidoidea,Pteromalidae,Halticoptera,Halticoptera arduine,Piura
Chalcidoidea,Torymidae,Podagrion,Podagrion brasiliense,Piura
Chalcidoidea,Torymidae,Megastigmus,Megastigmus transvaalensis,"Piura, Sullana, Talara, Paita, Sechura"
Chalcidoidea,Trichogrammatidae,Trichogramma,Trichogramma (Trichogramma) pretiosum,"Piura, Sullana, Talara, Paita, Sechura, Morropón, Huancabamba, Ayacucho"
Chalcidoidea,Trichogrammatidae,Trichogramma,Trichogramma (Trichogramma) exiguum,"Piura, Sullana, Talara, Paita, Sechura, Morropón, Huancabamba, Ayacucho"
Ichneumonoidea,Braconidae,Cotesia,Cotesia flavipes,"Piura, Sullana"
Ichneumonoidea,Braconidae,Apanteles,Apanteles sp.,"Piura, Sullana, Sechura"
Ichneumonoidea,Braconidae,Glyptapanteles,Glyptapanteles muesebecki,"Piura, Sullana, Talara, Paita, Sechura, Morropón, Ayacucho"
Ichneumonoidea,Braconidae,Microchelonus,Microchelonus townsendi,"Piura, Sullana, Talara, Paita, Sechura, Morropón, Ayacucho"
Ichneumonoidea,Braconidae,Triaspis,Triaspis vestiticida,"Piura, Sullana, Paita, Talara, Morropón, Sechura"
Ichneumonoidea,Braconidae,Aphidius,Aphidius sp.,"Piura, Sullana, Paita, Talara"
Ichneumonoidea,Braconidae,Habrobracon,Habrobracon hebetor,"Piura, Sullana, Talara, Paita, Sechura, Morropón, Huancabamba, Ayacucho"
Ichneumonoidea,Braconidae,Bracon,Bracon vestiticida,"Piura, Sullana, Talara, Paita, Sechura, Morropón"
Ichneumonoidea,Braconidae,Digonogastra,Digonogastra rimac,"Piura, Sullana, Talara, Paita, Sechura"
Ichneumonoidea,Braconidae,Heterospilus,Heterospilus hambletoni,"Piura, Sullana, Talara, Paita, Sechura"
Ichneumonoidea,Braconidae,Percnobracon,Percnobracon secundus,"Piura, Sullana, Talara, Paita, Sechura"
Ichneumonoidea,Braconidae,Cantharactonus,Cantharactonus stramineus,"Piura, Sullana"
Ichneumonoidea,Braconidae,Allobracon,Allobracon primus,"Piura, Sullana, Paita"
Ichneumonoidea,Braconidae,Aleiodes,Aleiodes gossypii,"Piura, Sullana, Paita, Talara"
Ichneumonoidea,Ichneumonidae,Enicospilus,Enicospilus purgatus,"Piura, Sullana, Paita, Talara, Sechura"
Ichneumonoidea,Ichneumonidae,Brachycyrtus,Brachycyrtus pretiosus,Piura
Ichneumonoidea,Ichneumonidae,Isdromas,Isdromas peruvianus,Piura
Ichneumonoidea,Ichneumonidae,Aeliopotes,Aeliopotes paitensis,Paita
Ichneumonoidea,Ichneumonidae,Cryptanura,Cryptanura sp.,"Huancabamba, Ayacucho"
Chrysidoidea,Chrysididae,Holopyga,Holopyga sp.,Piura
Chrysidoidea,Bethylidae,Goniozus,Goniozus sp.,"Piura, Sullana"
Vespoidea,Pompilidae,Auplopus,Auplopus eriodes,"Piura, Sullana, Talara"
Vespoidea,Pompilidae,Pepsis,Pepsis grossa,Piura
Vespoidea,Pompilidae,Pepsis,Pepsis inclyta,"Morropón, Huancabamba, Ayacucho"
Vespoidea,Pompilidae,Pepsis,Pepsis multichroma,"Piura, Sullana, Talara, Paita, Sechura, Huancabamba"
Vespoidea,Pompilidae,Pepsis,Pepsis montezuma,"Piura, Sullana, Talara, Morropón, Sechura, Huancabamba, Ayacucho"
Vespoidea,Pompilidae,Pepsis,Pepsis petitii,"Piura, Sullana, Sechura, Talara, Huancabamba, Ayacucho"
Vespoidea,Pompilidae,Pepsis,Pepsis chiliensis,"Piura, Talara"
Vespoidea,Pompilidae,Poecilopompilus,Poecilopompilus rubricatus,"Talara, Sechura, Morropón, Paita, Sullana"
"""

reader = csv.DictReader(datos_csv.strip().splitlines())
count = 0

for row in reader:
    # Mapeamos para que la web reconozca el orden como el filtro que busca
    row['familia'] = 'Hymenoptera' 
    row.pop('superfamilia', None)
    
    try:
        supabase.table('specimens').insert(dict(row)).execute()
        count += 1
        print(f"Subido exitosamente ({count}): {row['especie']}")
    except Exception as e:
        print(f"Error al subir {row['especie']}: {e}")

print("¡Carga masiva completada correctamente!")
