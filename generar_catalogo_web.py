import json

catalogo = [
    {
        "superfamilia": "Evanioidea",
        "familia": "Evaniidae",
        "subfamilia": "",
        "genero": "Evania",
        "especie": "Evania sp.",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Platygastroidea",
        "familia": "Platygastridae",
        "subfamilia": "Sceliotrachelinae",
        "genero": "Amitus",
        "especie": "Amitus spiniferus",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Platygastroidea",
        "familia": "Platygastridae",
        "subfamilia": "Telenominae",
        "genero": "Telenomus",
        "especie": "Telenomus alecto",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Cynipoidea",
        "familia": "Figitidae",
        "subfamilia": "Eucoilinae",
        "genero": "Ganaspidium",
        "especie": "Ganaspidium sp.",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Aphelinidae",
        "subfamilia": "Aphelininae",
        "genero": "Encarsia",
        "especie": "Encarsia formosa",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Aphelinidae",
        "subfamilia": "Aphelininae",
        "genero": "Encarsia",
        "especie": "Encarsia pergandiella",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Aphelinidae",
        "subfamilia": "Aphelininae",
        "genero": "Encarsia",
        "especie": "Encarsia tabacivora",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Aphelinidae",
        "subfamilia": "Aphelininae",
        "genero": "Aphytis",
        "especie": "Aphytis chrysomphali",
        "localidades": ["Piura", "Sullana", "Paita"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Aphelinidae",
        "subfamilia": "Eretmocerinae",
        "genero": "Eretmocerus",
        "especie": "Eretmocerus eremicus",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Chalcididae",
        "subfamilia": "Chalcidinae",
        "genero": "Brachymeria",
        "especie": "Brachymeria podagrica",
        "localidades": ["Piura", "Sullana", "Paita", "Talara", "Sechura", "Morropón", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Encyrtidae",
        "subfamilia": "",
        "genero": "Ooencyrtus",
        "especie": "Ooencyrtus bucculatrix",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eulophidae",
        "subfamilia": "Entedoninae",
        "genero": "Chrysocharis",
        "especie": "Chrysocharis vonones",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eulophidae",
        "subfamilia": "Entedoninae",
        "genero": "Proacrias",
        "especie": "Proacrias thysanoides",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eulophidae",
        "subfamilia": "Entedoninae",
        "genero": "Diglyphus",
        "especie": "Diglyphus websteri",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eulophidae",
        "subfamilia": "Eulophinae",
        "genero": "Zagrammosoma",
        "especie": "Zagrammosoma variegatum",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eulophidae",
        "subfamilia": "Eulophinae",
        "genero": "Diaulinopsis",
        "especie": "Diaulinopsis callichroma",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eupelmidae",
        "subfamilia": "Eupelminae",
        "genero": "Eupelmus",
        "especie": "Eupelmus (Eupelmus) pulchriceps",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eupelmidae",
        "subfamilia": "Eupelminae",
        "genero": "Brasema",
        "especie": "Brasema peruviana",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Eurytomidae",
        "subfamilia": "Eurytominae",
        "genero": "Eurytoma",
        "especie": "Eurytoma piurae",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Pteromalidae",
        "subfamilia": "Pteromalinae",
        "genero": "Dibrachys",
        "especie": "Dibrachys microgastri",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Pteromalidae",
        "subfamilia": "Pteromalinae",
        "genero": "Jaliscoa",
        "especie": "Jaliscoa hunteri",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Pteromalidae",
        "subfamilia": "Miscogastrinae",
        "genero": "Halticoptera",
        "especie": "Halticoptera arduine",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Torymidae",
        "subfamilia": "",
        "genero": "Podagrion",
        "especie": "Podagrion brasiliense",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Torymidae",
        "subfamilia": "",
        "genero": "Megastigmus",
        "especie": "Megastigmus transvaalensis",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Trichogrammatidae",
        "subfamilia": "",
        "genero": "Trichogramma",
        "especie": "Trichogramma (Trichogramma) pretiosum",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Chalcidoidea",
        "familia": "Trichogrammatidae",
        "subfamilia": "",
        "genero": "Trichogramma",
        "especie": "Trichogramma (Trichogramma) exiguum",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Microgastrinae",
        "genero": "Cotesia",
        "especie": "Cotesia flavipes",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Microgastrinae",
        "genero": "Apanteles",
        "especie": "Apanteles sp.",
        "localidades": ["Piura", "Sullana", "Sechura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Microgastrinae",
        "genero": "Glyptapanteles",
        "especie": "Glyptapanteles muesebecki",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón", "Ayacucho"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Cheloninae",
        "genero": "Microchelonus",
        "especie": "Microchelonus townsendi",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón", "Ayacucho"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Helconinae",
        "genero": "Triaspis",
        "especie": "Triaspis vestiticida",
        "localidades": ["Piura", "Sullana", "Paita", "Talara", "Morropón", "Sechura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Aphidiinae",
        "genero": "Aphidius",
        "especie": "Aphidius sp.",
        "localidades": ["Piura", "Sullana", "Paita", "Talara"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Braconinae",
        "genero": "Habrobracon",
        "especie": "Habrobracon hebetor",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Braconinae",
        "genero": "Bracon",
        "especie": "Bracon vestiticida",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Morropón"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Braconinae",
        "genero": "Digonogastra",
        "especie": "Digonogastra rimac",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Doryctinae",
        "genero": "Heterospilus",
        "especie": "Heterospilus hambletoni",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Doryctinae",
        "genero": "Percnobracon",
        "especie": "Percnobracon secundus",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Hormiinae",
        "genero": "Cantharactonus",
        "especie": "Cantharactonus stramineus",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Hormiinae",
        "genero": "Allobracon",
        "especie": "Allobracon primus",
        "localidades": ["Piura", "Sullana", "Paita"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Braconidae",
        "subfamilia": "Rogadinae",
        "genero": "Aleiodes",
        "especie": "Aleiodes gossypii",
        "localidades": ["Piura", "Sullana", "Paita", "Talara"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Ichneumonidae",
        "subfamilia": "Ophioninae",
        "genero": "Enicospilus",
        "especie": "Enicospilus purgatus",
        "localidades": ["Piura", "Sullana", "Paita", "Talara", "Sechura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Ichneumonidae",
        "subfamilia": "Cryptinae",
        "genero": "Brachycyrtus",
        "especie": "Brachycyrtus pretiosus",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Ichneumonidae",
        "subfamilia": "Cryptinae",
        "genero": "Isdromas",
        "especie": "Isdromas peruvianus",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Ichneumonidae",
        "subfamilia": "Cryptinae",
        "genero": "Aeliopotes",
        "especie": "Aeliopotes paitensis",
        "localidades": ["Paita"]
    },
    {
        "superfamilia": "Ichneumonoidea",
        "familia": "Ichneumonidae",
        "subfamilia": "Cryptinae",
        "genero": "Cryptanura",
        "especie": "Cryptanura sp.",
        "localidades": ["Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Chrysidoidea",
        "familia": "Chrysididae",
        "subfamilia": "Chrysidinae",
        "genero": "Holopyga",
        "especie": "Holopyga sp.",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Chrysidoidea",
        "familia": "Bethylidae",
        "subfamilia": "Bethylinae",
        "genero": "Goniozus",
        "especie": "Goniozus sp.",
        "localidades": ["Piura", "Sullana"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Auplopus",
        "especie": "Auplopus eriodes",
        "localidades": ["Piura", "Sullana", "Talara"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Pepsis",
        "especie": "Pepsis grossa",
        "localidades": ["Piura"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Pepsis",
        "especie": "Pepsis inclyta",
        "localidades": ["Morropón", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Pepsis",
        "especie": "Pepsis multichroma",
        "localidades": ["Piura", "Sullana", "Talara", "Paita", "Sechura", "Huancabamba"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Pepsis",
        "especie": "Pepsis montezuma",
        "localidades": ["Piura", "Sullana", "Talara", "Morropón", "Sechura", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Pepsis",
        "especie": "Pepsis petitii",
        "localidades": ["Piura", "Sullana", "Sechura", "Talara", "Huancabamba", "Ayacucho"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pepsinae",
        "genero": "Pepsis",
        "especie": "Pepsis chiliensis",
        "localidades": ["Piura", "Talara"]
    },
    {
        "superfamilia": "Vespoidea",
        "familia": "Pompilidae",
        "subfamilia": "Pompilinae",
        "genero": "Poecilopompilus",
        "especie": "Poecilopompilus rubricatus",
        "localidades": ["Talara", "Sechura", "Morropón", "Paita", "Sullana"]
    }
]

with open("hymenoptera_peru_seed.json", "w", encoding="utf-8") as f:
    json.dump(catalogo, f, ensure_ascii=False, indent=4)

print("✨ Archivo 'hymenoptera_peru_seed.json' generado correctamente para la base de datos.")
