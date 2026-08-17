#!/bin/bash

echo "🕷️ Creando estructura de directorios para las Avispas Araña (Pompilidae) del Perú..."

BASE="Hymenoptera/Vespoidea/Pompilidae"

# Subfamilia Pepsinae
mkdir -p "$BASE/Pepsinae/Auplopus/Auplopus_eriodes"
mkdir -p "$BASE/Pepsinae/Pepsis/Pepsis_grossa"
mkdir -p "$BASE/Pepsinae/Pepsis/Pepsis_inclyta"
mkdir -p "$BASE/Pepsinae/Pepsis/Pepsis_multichroma"
mkdir -p "$BASE/Pepsinae/Pepsis/Pepsis_montezuma"
mkdir -p "$BASE/Pepsinae/Pepsis/Pepsis_petitii"
mkdir -p "$BASE/Pepsinae/Pepsis/Pepsis_chiliensis"

# Subfamilia Pompilinae
mkdir -p "$BASE/Pompilinae/Poecilopompilus/Poecilopompilus_rubricatus"

echo "✨ ¡Estructura de Pompilidae creada exitosamente!"
