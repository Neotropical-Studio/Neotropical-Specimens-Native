# Estándar Oficial de Carga CSV — Neotropical Specimens Native
> Vigente desde: 2026-07-29 · v6 confirmada con Heliconidae + Ithomiidae + Lycaenidae + Morphidae + Nymphalidae + Papilionidae + Pieridae + Satyridae.
> Cualquier familia que se procese en el futuro **debe seguir esta misma estructura**.

---

## Cabecera oficial (v5 — confirmada con Brassolidae + Heliconidae + Ithomiidae + Lycaenidae + Morphidae)

```
code,nombre_cientifico,nombre_comun,familia,subfamilia,genero,orden,region,localidad_especifica,gps,calidad,sexo,precio
```

> Los campos opcionales deben ir con `null` si no tienen valor (no dejar la celda vacía — facilita lectura del CSV).

## Columnas

| Columna | Tipo | Obligatoria | Descripción | Ejemplo |
|---|---|---|---|---|
| `code` | texto | **Sí** | Código único del lote. Prefijo de familia + número secuencial. | `BR-001` |
| `nombre_cientifico` | texto | **Sí** | Binomial o trinomial completo. `?` al final = identificación incierta (se acepta). | `Caligo atreus agesilaus` |
| `nombre_comun` | texto | No | Nombre popular. Usar `N/A` si no aplica. | `Owl Butterfly` |
| `familia` | texto | **Sí** | Nombre de familia. Se crea automáticamente si no existe. | `Brassolidae` |
| `subfamilia` | texto | No | Nombre de subfamilia. | `Brassolinae` |
| `genero` | texto | No | Override explícito del género. Si es `null`, se extrae del `nombre_cientifico`. | `Morpho` |
| `orden` | texto | **Sí** | Orden taxonómico. | `Lepidoptera` |
| `region` | texto | No | País o región de colecta. Default: `Neotropical`. | `Peru` |
| `localidad_especifica` | texto | No | Descripción textual de la localidad. | `Cuenca Amazónica - Iquitos` |
| `gps` | texto | No | Coordenadas GPS: `latitud longitud` separados por espacio o coma. | `-3.7491 -73.2538` |
| `calidad` | texto | **Sí** | Ver tabla de valores abajo. | `A1` |
| `sexo` | texto | **Sí** | Ver tabla de valores abajo. | `M/F` |
| `precio` | número | **Sí** | Precio en USD. Usar `0.00` si no tiene precio asignado. | `14.00` |
| `size_range` | texto | No | Envergadura o tamaño del espécimen. | `3.0 cm`, `8-10.0 cm` |

---

## Valores válidos para `calidad`

| CSV | Base de datos | Significado |
|---|---|---|
| `A1` | `A.1` | Perfecto, sin defectos |
| `A1-` | `A1-` | Casi perfecto, defecto menor |
| `A1/A1-` | `A.1` | Mezcla: se toma el mejor grado |
| `A1 OUT OF STOCK` | `A.1` + `out_of_stock: true` | Calidad A1 pero sin stock — se guarda en metadata |
| `A2` | `A2` | Buena calidad, defectos leves |
| `A2-` | `A2.` | Calidad media-baja |
| `B` / `B3` | `B3` | Defectos visibles |
| `VGA` | `VGA` | Muy buena, grado de archivo |
| `A!` | `A.1` | Typo/OCR de `A1` — se normaliza automáticamente |
| `A1/A1-++` | `A.1` | `++` (calidad extra) se descarta; se toma el mejor grado |
| `A1- to VGA2` | `A1-` | Rango de calidad: se toma el primer grado antes de ` to ` |
| *(vacío)* | `UNRATED` | Sin clasificar |

---

## Valores válidos para `sexo`

| CSV | Código BD | Cantidad | Descripción |
|---|---|---|---|
| `P` | `P` | 1 | 1 par montado |
| `3P` | `P` | 3 | 3 pares montados |
| `M/F` | `P` | 1 | 1 macho + 1 hembra (barra como separador) |
| `3M/F` | `P` | 3 | 3 machos + 3 hembras |
| `M or F` | `P` | 1 | 1 macho + 1 hembra ("or" como separador) |
| `3 M or F` | `P` | 3 | 3 machos + 3 hembras |
| `M` | `M` | 1 | 1 macho |
| `3M` | `M` | 3 | 3 machos |
| `F` | `F` | 1 | 1 hembra |
| `3pcs` | `U` | 3 | 3 piezas, género no especificado |
| `3 pcs` | `U` | 3 | ídem con espacio (ambas formas aceptadas) |
| `Male` | `M` | 1 | Palabra completa en inglés |
| `Female` | `F` | 1 | Palabra completa en inglés |
| `Macho` | `M` | 1 | Palabra completa en español |
| `Hembra` | `F` | 1 | Palabra completa en español |
| `2M` / `5M` | `M` | 2 / 5 | Cualquier número seguido de código de sexo |
| `?` | `U` | 1 | Sexo desconocido |

> El script normaliza `/` y `or` como separadores equivalentes. Palabras completas (`Male`, `Female`, `Macho`, `Hembra`) son reconocidas directamente. `?` = desconocido.

---

## Prefijos de código por familia

Cada familia tiene un prefijo de 2–3 letras. El número es secuencial dentro de esa familia.

| Familia | Prefijo | Ejemplo |
|---|---|---|
| Brassolidae | `BR` | `BR-001` |
| Heliconidae | `HE` | `HE-001` |
| Ithomiidae | `IT` | `IT-001` |
| Lycaenidae | `LY` | `LY-001` |
| Morphidae | `MO` | `MO-001` |
| Nymphalidae | `NY` | `NY-001` |
| Papilionidae | `PA` | `PA-001` |
| Pieridae | `PI` | `PI-001` |
| Riodinidae | `RI` | `RI-001` |
| Saturniidae | `SA` | `SA-001` |
| Satyridae | `ST` | `ST-001` |
| Sphingidae | `SP` | `SP-001` |
| Cerambycidae | `CE` | `CE-001` |
| Scarabaeidae | `SC` | `SC-001` |
| Saturnidae | `SA` | `SA-001` |
| Sphingidae | `SP` | `SP-001` |
| Cerambycidae | `CE` | `CE-001` |
| Scarabaeidae | `SC` | `SC-001` |
| *(nueva familia)* | 2–3 letras únicas | — |

---

## Reglas de nomenclatura científica

1. **Binomiales**: `Género especie` — dos palabras.
2. **Trinomiales**: `Género especie subespecie` — tres palabras.
3. **Subespecie incierta**: `Caligo illioneus ssp?` — `ssp?` se interpreta como subespecie desconocida (se carga como binomial).
4. **Identificación incierta**: `Opsiphanes cassina barkeri?` — el `?` se descarta; se carga como `barkeri`.
5. **Nominotípica**: `Dynastor darius darius` — válido.
6. **Notas de proveniencia entre paréntesis**: `Danaus plexippus nigrippus (Ecuador)` — el script ELIMINA `(Ecuador)` antes de almacenar en `taxonomy.species_name`. El nombre original completo se preserva en `metadata.nombre_cientifico_original`.
7. **Sinónimos entre paréntesis**: `Lycorea ilione lamaris (=Ituna lamaris)` — `(=Ituna lamaris)` se elimina. Se almacena como `Lycorea ilione lamaris`. El sinónimo queda en metadata.
8. **Notas de forma** (`f.` / `forma`): `Heliconius erato microclea f. microfluens` — el nombre canónico en BD es `Heliconius erato microclea`; `f. microfluens` se guarda en `metadata.form_note`. Dos lotes distintos de `microclea` (con y sin forma) comparten el mismo registro de `taxonomy`.
9. **Híbridos** (`hybrid`): `Heliconius erato hybrid f. simplex` — el nombre canónico es `Heliconius erato`; `hybrid f. simplex` → `metadata.form_note`.
10. **Notación híbrida con barra**: `Heliconius erato/melpomene? Form #7` — se conserva solo el primer epiteto (`erato`); `Form #7` → `metadata.form_note`.
11. **Columna `genero` con nota de error**: `Heliconius (error de catalogo)` — el texto entre paréntesis se elimina; se usa `Heliconius` como género. Útil para corregir typos en `nombre_cientifico` sin editar el CSV.
12. **Región compuesta**: `Peru/Ecuador` — se almacena tal cual como región. Se puede normalizar más adelante desde la tabla `global_regions`.
13. **Subespecie en paréntesis**: `Morpho sulkowskyi (selenaris)` — `selenaris` es una subespecie real en paréntesis. El script la detecta y almacena como subespecie en BD: `taxonomy.species_name = "Morpho sulkowskyi selenaris"`.
14. **Variante morfológica en paréntesis**: `(DWARF)`, `(SMALL FEMALE)` → se guardan en `metadata.form_note`. No afectan el nombre canónico.
15. **Forma en paréntesis**: `(f. bisanthe)`, `(f. pseudocypris)` → `metadata.form_note = "f. bisanthe"`. Nombre canónico = `"Morpho aega"`.
16. **Color en paréntesis**: `(blue)`, `(orange)`, `(White)`, `(Yellow)` → `metadata.form_note`. Mismo taxón base para todos los colores.
17. **Subespecie con guión-color**: `gahua-blue`, `gahua-orange` → subespecie = `"gahua"`, `metadata.form_note = "blue"`. Equivalente a `gahua (blue)`.
18. **Columna `localidad`** — alias de `localidad_especifica`. Ambos nombres son aceptados.
19. **Columna `sex`** — alias de `sexo`. Ambos nombres son aceptados.
20. **Columna `size_range`** — almacenada en `metadata.size_range`. Ejemplos: `3.0 cm`, `8-10.0 cm`.
21. **Columna `orden` ausente** — si no está en el CSV, se asume `Lepidoptera` (familia de mariposas). Se recomienda siempre incluirla.

## Reglas del campo `gps`

El campo `gps` acepta **coordenadas reales** o **texto de localidad**:

| Valor en CSV | Comportamiento |
|---|---|
| `-3.7491 -73.2538` | Parseado como lat/lon → guardado en `metadata.lat` y `metadata.lon` |
| `-3.7491,-73.2538` | Ídem con coma como separador |
| `Amazonas/Alto Huallaga` | No son coordenadas → guardado en `metadata.localidad` automáticamente |
| `null` | Sin datos de ubicación |

> Si tienes texto de localidad, puedes ponerlo en `gps` **o** en `localidad_especifica`. Si tienes coordenadas reales, usa `gps`. Si tienes ambos, usa `localidad_especifica` para el texto y `gps` para las coordenadas.

---

## Ejemplo de archivo completo

```csv
code,nombre_cientifico,nombre_comun,familia,subfamilia,genero,orden,region,localidad_especifica,gps,calidad,sexo,precio
BR-001,Brassolis sophorae vulpeculus,null,Brassolidae,Brassolinae,null,Lepidoptera,Argentina,null,null,A1,P,6.50
BR-003,Caligo atreus agesilaus,null,Brassolidae,Brassolinae,null,Lepidoptera,Ecuador,null,null,A1,M or F,25.00
BR-010,Caligo idomeneus idomenides,null,Brassolidae,Brassolinae,null,Lepidoptera,Peru,null,null,A1 OUT OF STOCK,M,0.00
NEO-4421,Morpho peleides,Morfo Azul Común,Nymphalidae,Morphinae,Morpho,Lepidoptera,Perú,Cuenca Amazónica - Iquitos,-3.7491 -73.2538,A1,Male,38.25
```

> `null` en cualquier campo se trata como vacío. El CSV puede mezclar familias — `NEO-4421` es Nymphalidae en el mismo archivo que Brassolidae.

---

## Garantías del script

- **`Brassolidae` solo existe 1 vez** en la tabla `families`, sin importar cuántas veces corras el script. Se usa `ON CONFLICT (family_name) DO UPDATE`.
- **Relaciones por ID, nunca por texto**: `specimens.taxonomy_id` → `taxonomy.id` → `family_name`. Cambiar el nombre de una familia en la tabla `families` no rompe ninguna relación de espécimen.
- **Idempotencia**: si el script se interrumpe y lo vuelves a correr, detecta los `code` ya cargados y los salta.
- **Verificación post-carga**: al terminar, el script imprime el conteo de Brassolidae (y cualquier familia del lote) en la BD — siempre debe decir `✔ 1`.

---

## Flujo recomendado por familia

```bash
# 1. Validar sin tocar la BD
python scripts/ingest_csv.py --csv carga_brassolidae.csv --validate-only

# 2. Probar las primeras 5 filas
python scripts/ingest_csv.py --csv carga_brassolidae.csv --dry-run --limit 5

# 3. Carga real
python scripts/ingest_csv.py --csv carga_brassolidae.csv

# 4. Exportar para verificar
python scripts/export_excel.py --familia Brassolidae --out verificacion_brassolidae.xlsx
```

---

## Nombre del archivo CSV

Convención: `carga_[familia_en_minusculas].csv`

| Familia | Nombre de archivo |
|---|---|
| Brassolidae | `carga_brassolidae.csv` |
| Morphidae | `carga_morphidae.csv` |
| Papilionidae | `carga_papilionidae.csv` |

Guardar todos los CSV en la carpeta `data/` del proyecto.
