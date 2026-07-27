-- ============================================================================
-- Seed — Región Neotropical + Mariposas (Morpho peleides)
-- Idempotente por clave natural (code / slug / specimen_code).
-- ============================================================================

-- 1. Región global
insert into global_regions (name, region_name, metadata)
values ('Región Neotropical', 'NEO', '{"continent": "América del Sur"}')
on conflict (region_name) do nothing;

-- 2. Categoría / rubro
insert into categories (name, slug, settings)
values ('Mariposas', 'mariposas', '{"display_mode": "grid"}')
on conflict (slug) do nothing;

-- 3. Taxonomía (FK por slug de categoría)
insert into taxonomy (category_id, rank_hierarchy)
select c.id,
  '{
    "order": "Lepidoptera",
    "suborder": "Glossata",
    "family": "Nymphalidae",
    "subfamily": "Satyrinae",
    "tribe": "Morphini",
    "genus": "Morpho",
    "species": "peleides",
    "subspecies": null
  }'::jsonb
from categories c
where c.slug = 'mariposas'
  and not exists (
    select 1 from taxonomy t
    where t.rank_hierarchy->>'genus' = 'Morpho'
      and t.rank_hierarchy->>'species' = 'peleides'
  );

-- 4. Espécimen (FKs por code de región y por género/especie de taxonomía)
insert into specimens (
  specimen_code, global_region_id, taxonomy_id, pricing, stock, attributes, media_assets
)
select
  'NEO-LEP-MORPHO-001',
  r.id,
  t.id,
  '{"retail_price": 45.00, "wholesale_price": 32.00, "wholesale_min_qty": 5, "currency": "USD"}'::jsonb,
  1,
  '{
    "common_name": "Common Morpho",
    "sex": "M",
    "grade_code": "A1",
    "grade_name": "A1 (Perfecto)",
    "grade_description": "As perfect as all reasonable expectations dictate. Many are ex-pupae bred.",
    "wingspan_mm": 95.5,
    "body_length_mm": 40.0,
    "primary_colors": ["Azul", "Negro"],
    "country_origin": "Perú",
    "exact_locality": "Tingo María, Huánuco",
    "elevation_m": 650,
    "collection_date": "2026-05-12"
  }'::jsonb,
  '[
    {"type": "photo_webp",    "view": "dorsal",       "cloudinary_id": "especimenes-secos/neo/morpho_001_dorsal_webp"},
    {"type": "photo_webp",    "view": "ventral",      "cloudinary_id": "especimenes-secos/neo/morpho_001_ventral_webp"},
    {"type": "photo_webp",    "view": "etiqueta",     "cloudinary_id": "especimenes-secos/neo/morpho_001_label_webp"},
    {"type": "model_3d_glb",  "view": "interactivo",  "cloudinary_id": "especimenes-secos/neo/morpho_001_blender_model"},
    {"type": "video_mp4",     "view": "rotacion_360", "cloudinary_id": "especimenes-secos/neo/morpho_001_blender_video"}
  ]'::jsonb
from global_regions r
cross join taxonomy t
where r.region_name = 'NEO'
  and t.rank_hierarchy->>'genus' = 'Morpho'
  and t.rank_hierarchy->>'species' = 'peleides'
on conflict (specimen_code) do nothing;
