# SQL espejo · orden operativo

**Una pantalla. Sin borrar datos live. `orders` = taxonomía (no e‑commerce).**

## Orden consecutivo

1. **SQL** — pegar en Supabase → SQL Editor (proyecto live):
   1. `espejo_universal_industrial.sql` (specimens contrato + specimen_media espejo + campaigns + `mirror_sync_runs`)
   2. `delta_align_admin_stubs.sql` (categories name/slug + shipments/permits contrato)
2. **ESPEJO** — en admin `/admin/espejo` o Consola V3: **Discover** → **Apply espejo**  
   (o CLI: `pnpm sync:mirror:discover` luego `pnpm sync:mirror`)
3. **Clasificación** — el panel en `/admin/espejo` compara path Cloudinary esperado vs filas `families` / `specimens.familia`
4. **Taxonomía desde carpetas** — CLI (árbol RUBROS → REGION → Butterflies → Familia):
   ```bash
   pnpm sync:cloudinary:discover -- --root=butterflies
   # o región completa (Butterflies + Beetles + Moths + legacy NO CITES):
   pnpm sync:cloudinary:discover
   # cuando el reporte se vea bien:
   pnpm sync:cloudinary -- --root=butterflies --limit=20
   pnpm sync:cloudinary -- --root=butterflies
   ```
5. **Revisar panel** — Cloud vs DB, **Fuera de lugar**, huérfanos, refs muertas limpiadas, gaps de schema, familias faltantes.

## Path Cloudinary canónico (Media Library) — ÚNICO sitio de catálogo

```
RUBROS
  └─ ESPECIMENS SECOS BIOLOGICOS Y INSECTOS COLEOPTEROS  Y ARHHROPODS
       └─ REGION Central  South America Neotropical
            ├─ Rare -Gynan-Aberrations
            ├─ Insects(arthropoda)
            ├─ Beetles(Coleoptera) Insects
            ├─ Moths(Lepidoptera) Nocturne
            └─ Butterflies(lepidoptera) Diurne
                 └─ Satyridae|Riodinidae|…|Brassolidae|Nymphalidae 1..6
                      └─ [genus/species]  ← fotos, cards, videos de intro AQUÍ
```

**Nunca crear carpetas fuera de este árbol entomológico.**  
Cards/videos de intro de rubro/categoría/familia solo dentro del path de ese nivel.  
No usar: raíz, `CATALOGUE_*`, `_PENDING`, `especimenes-secos/neotropical`, `LOGOS`, etc.

DEFAULT_ROOT del sync = nivel **REGION**. Ver `scripts/sync-cloudinary/roots.ts` y `lib/mirror/contract.ts`.

## Política Cloudinary (post-limpieza)

- **Cloudinary = fuente de verdad** de `public_id` / ubicación.
- Supabase = checklist de estructura; Cloudinary se completa **solo** en el sitio correcto.
- Apply / uploads admin **NO** crean carpetas `_PENDING`, raíz, `CATALOGUE_*` ni `especimenes-secos`.
- Si un asset está fuera del árbol canónico → se marca **ORPHAN / Fuera de lugar** y se lista en `/admin/espejo` — **no** se borra automáticamente (limpieza manual).
- Si un `public_id` ya no existe en Cloud → se **limpia** en Supabase (`specimen_media` delete / cover null).
- Brand/UI (logos, favicons) **no** se guardan en `specimen_media`.

## Requisitos CLI / agente

| Variable | Para |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Espejo de assets (PostgREST) |
| `CLOUDINARY_*` | Listar inventario real |
| `SUPABASE_DB_URL` o connection string Postgres | DDL remoto automático |

Sin connection string Postgres, el DDL **solo** se aplica pegando los `.sql` en el SQL Editor.
