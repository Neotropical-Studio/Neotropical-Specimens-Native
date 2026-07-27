-- ============================================================================
-- Seed dinámico para poblar Supabase con una estructura libre, jerárquica y
-- camaleónica de regiones, categorías, taxonomía y especímenes.
-- ============================================================================

-- 1) Regiones geográficas con jerarquía padre-hijo
with inserted_regions as (
  insert into global_regions (name, region_name, parent_id, depth, display_order, is_active, metadata)
  values
    ('Región Neotropical', 'NEO', null, 0, 1, true, '{"continent":"América del Sur","biome":"tropical"}'),
    ('Neotropical - Andes', 'ANDES', (select id from global_regions where region_name='NEO'), 1, 1, true, '{"subregion":"Andes"}'),
    ('Neotropical - Amazonía', 'AMAZON', (select id from global_regions where region_name='NEO'), 1, 2, true, '{"subregion":"Amazonía"}'),
    ('Región Paleártica', 'PAL', null, 0, 2, true, '{"continent":"Europa/Asia","biome":"temperate"}'),
    ('Paleártica - Mediterránea', 'MED', (select id from global_regions where region_name='PAL'), 1, 1, true, '{"subregion":"Mediterránea"}')
  on conflict (region_name) do nothing
  returning id, region_name
)
select 1;

-- 2) Categorías principales y subcategorías
with inserted_categories as (
  insert into categories (name, slug, parent_id, depth, display_order, is_active, settings, metadata)
  values
    ('Invertebrados', 'invertebrados', null, 0, 1, true, '{"display_mode":"grid"}', '{"group":"main"}'),
    ('Mariposas', 'mariposas', (select id from categories where slug='invertebrados'), 1, 1, true, '{"display_mode":"grid"}', '{"group":"butterflies"}'),
    ('Polillas', 'polillas', (select id from categories where slug='invertebrados'), 1, 2, true, '{"display_mode":"grid"}', '{"group":"moths"}'),
    ('Escarabajos', 'escarabajos', (select id from categories where slug='invertebrados'), 1, 3, true, '{"display_mode":"grid"}', '{"group":"beetles"}')
  on conflict (slug) do nothing
  returning id, slug
)
select 1;

-- 3) Taxonomía base: jerarquía libre y dinámica por especie
insert into taxonomy (category_id, rank_hierarchy)
select c.id, '{"order":"Lepidoptera","family":"Nymphalidae","subfamily":"Satyrinae","genus":"Morpho","species":"peleides"}'::jsonb
from categories c
where c.slug = 'mariposas'
  and not exists (
    select 1 from taxonomy t
    where t.rank_hierarchy->>'genus' = 'Morpho'
      and t.rank_hierarchy->>'species' = 'peleides'
  );

insert into taxonomy (category_id, rank_hierarchy)
select c.id, '{"order":"Lepidoptera","family":"Sphingidae","subfamily":"Sphinginae","genus":"Xylophanes","species":"terlooii"}'::jsonb
from categories c
where c.slug = 'polillas'
  and not exists (
    select 1 from taxonomy t
    where t.rank_hierarchy->>'genus' = 'Xylophanes'
      and t.rank_hierarchy->>'species' = 'terlooii'
  );

insert into taxonomy (category_id, rank_hierarchy)
select c.id, '{"order":"Coleoptera","family":"Scarabaeidae","subfamily":"Dynastinae","genus":"Dynastes","species":"hercules"}'::jsonb
from categories c
where c.slug = 'escarabajos'
  and not exists (
    select 1 from taxonomy t
    where t.rank_hierarchy->>'genus' = 'Dynastes'
      and t.rank_hierarchy->>'species' = 'hercules'
  );

-- 4) Especímenes de ejemplo, conectados a región, categoría y taxonomía
insert into specimens (
  specimen_code,
  global_region_id,
  category_id,
  taxonomy_id,
  pricing,
  stock,
  attributes,
  media_assets
)
select
  'NEO-LEP-MORPHO-001',
  r.id,
  c.id,
  t.id,
  '{"retail_price":45.00,"wholesale_price":32.00,"wholesale_min_qty":5,"currency":"USD"}'::jsonb,
  1,
  '{"common_name":"Common Morpho","sex":"M","grade_code":"A1","grade_name":"A1 (Perfecto)","wingspan_mm":95.5,"country_origin":"Perú","specimen_kind":"dried_specimen","theme":"regenerative"}'::jsonb,
  '[{"type":"photo_webp","view":"dorsal","cloudinary_id":"especimenes-secos/neo/morpho_001_dorsal_webp"}]'::jsonb
from global_regions r
join categories c on c.slug = 'mariposas'
join taxonomy t on t.rank_hierarchy->>'genus' = 'Morpho' and t.rank_hierarchy->>'species' = 'peleides'
where r.region_name = 'NEO'
on conflict (specimen_code) do nothing;

insert into specimens (
  specimen_code,
  global_region_id,
  category_id,
  taxonomy_id,
  pricing,
  stock,
  attributes,
  media_assets
)
select
  'NEO-LEP-XYLO-001',
  r.id,
  c.id,
  t.id,
  '{"retail_price":60.00,"wholesale_price":42.00,"wholesale_min_qty":3,"currency":"USD"}'::jsonb,
  1,
  '{"common_name":"Hawk Moth","sex":"F","grade_code":"A1","grade_name":"A1 (Perfecto)","wingspan_mm":110,"country_origin":"Brasil","specimen_kind":"dried_specimen","theme":"camaleonic"}'::jsonb,
  '[{"type":"photo_webp","view":"dorsal","cloudinary_id":"especimenes-secos/neo/xylophanes_001_dorsal_webp"}]'::jsonb
from global_regions r
join categories c on c.slug = 'polillas'
join taxonomy t on t.rank_hierarchy->>'genus' = 'Xylophanes' and t.rank_hierarchy->>'species' = 'terlooii'
where r.region_name = 'AMAZON'
on conflict (specimen_code) do nothing;

insert into specimens (
  specimen_code,
  global_region_id,
  category_id,
  taxonomy_id,
  pricing,
  stock,
  attributes,
  media_assets
)
select
  'PAL-COL-DYN-001',
  r.id,
  c.id,
  t.id,
  '{"retail_price":80.00,"wholesale_price":55.00,"wholesale_min_qty":2,"currency":"USD"}'::jsonb,
  1,
  '{"common_name":"Hercules Beetle","sex":"M","grade_code":"A1","grade_name":"A1 (Perfecto)","wingspan_mm":150,"country_origin":"España","specimen_kind":"dried_specimen","theme":"regenerative"}'::jsonb,
  '[{"type":"photo_webp","view":"dorsal","cloudinary_id":"especimenes-secos/pal/dynastes_001_dorsal_webp"}]'::jsonb
from global_regions r
join categories c on c.slug = 'escarabajos'
join taxonomy t on t.rank_hierarchy->>'genus' = 'Dynastes' and t.rank_hierarchy->>'species' = 'hercules'
where r.region_name = 'MED'
on conflict (specimen_code) do nothing;
