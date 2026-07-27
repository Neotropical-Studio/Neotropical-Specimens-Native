-- ============================================================================
-- Seed definitivo para Supabase
-- Pobla taxonomies, locations, specimens y specimen_media con datos de ejemplo
-- listos para usar en catálogo neotropical.
-- ============================================================================

-- 1) TAXONOMÍA JERÁRQUICA
insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
values
  (null, 'Animalia', 'Animalia', 'kingdom', 'animalia', 'animalia', 0, 1, '{"group":"kingdom"}'::jsonb)
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Arthropoda',
  'Arthropoda',
  'phylum',
  'arthropoda',
  'animalia/arthropoda',
  1,
  1,
  '{"group":"phylum"}'::jsonb
from taxonomies t
where t.slug = 'animalia'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Insecta',
  'Insecta',
  'class',
  'insecta',
  'animalia/arthropoda/insecta',
  2,
  1,
  '{"group":"class"}'::jsonb
from taxonomies t
where t.slug = 'arthropoda'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Lepidoptera',
  'Lepidoptera',
  'order',
  'lepidoptera',
  'animalia/arthropoda/insecta/lepidoptera',
  3,
  1,
  '{"group":"order"}'::jsonb
from taxonomies t
where t.slug = 'insecta'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Nymphalidae',
  'Nymphalidae',
  'family',
  'nymphalidae',
  'animalia/arthropoda/insecta/lepidoptera/nymphalidae',
  4,
  1,
  '{"group":"family"}'::jsonb
from taxonomies t
where t.slug = 'lepidoptera'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morpho',
  'Morpho',
  'genus',
  'morpho',
  'animalia/arthropoda/insecta/lepidoptera/nymphalidae/morpho',
  5,
  1,
  '{"group":"genus"}'::jsonb
from taxonomies t
where t.slug = 'nymphalidae'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morpho peleides',
  'Morpho peleides',
  'species',
  'morpho-peleides',
  'animalia/arthropoda/insecta/lepidoptera/nymphalidae/morpho/morpho-peleides',
  6,
  1,
  '{"group":"species","common_name":"Morpho azul"}'::jsonb
from taxonomies t
where t.slug = 'morpho'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Xylophanes',
  'Xylophanes',
  'genus',
  'xylophanes',
  'animalia/arthropoda/insecta/lepidoptera/sphingidae/xylophanes',
  5,
  2,
  '{"group":"genus"}'::jsonb
from taxonomies t
where t.slug = 'sphingidae'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Xylophanes terlooii',
  'Xylophanes terlooii',
  'species',
  'xylophanes-terlooii',
  'animalia/arthropoda/insecta/lepidoptera/sphingidae/xylophanes/xylophanes-terlooii',
  6,
  2,
  '{"group":"species","common_name":"Hawk moth"}'::jsonb
from taxonomies t
where t.slug = 'xylophanes'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Dynastes',
  'Dynastes',
  'genus',
  'dynastes',
  'animalia/arthropoda/insecta/coleoptera/scarabaeidae/dynastes',
  5,
  3,
  '{"group":"genus"}'::jsonb
from taxonomies t
where t.slug = 'scarabaeidae'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Dynastes hercules',
  'Dynastes hercules',
  'species',
  'dynastes-hercules',
  'animalia/arthropoda/insecta/coleoptera/scarabaeidae/dynastes/dynastes-hercules',
  6,
  3,
  '{"group":"species","common_name":"Hercules beetle"}'::jsonb
from taxonomies t
where t.slug = 'dynastes'
on conflict (slug) do nothing;

-- Insert missing middle nodes for the other branches if not present
insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  (select id from taxonomies where slug = 'insecta'),
  'Sphingidae',
  'Sphingidae',
  'family',
  'sphingidae',
  'animalia/arthropoda/insecta/lepidoptera/sphingidae',
  4,
  2,
  '{"group":"family"}'::jsonb
where not exists (select 1 from taxonomies where slug = 'sphingidae');

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  (select id from taxonomies where slug = 'insecta'),
  'Scarabaeidae',
  'Scarabaeidae',
  'family',
  'scarabaeidae',
  'animalia/arthropoda/insecta/coleoptera/scarabaeidae',
  4,
  3,
  '{"group":"family"}'::jsonb
where not exists (select 1 from taxonomies where slug = 'scarabaeidae');

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  (select id from taxonomies where slug = 'insecta'),
  'Coleoptera',
  'Coleoptera',
  'order',
  'coleoptera',
  'animalia/arthropoda/insecta/coleoptera',
  3,
  2,
  '{"group":"order"}'::jsonb
where not exists (select 1 from taxonomies where slug = 'coleoptera');

-- 2) LOCALIZACIONES Y GPS
insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
values
  (null, 'Perú', 'peru', 'PE', 'country', -9.1900, -75.0152, 1540.00, 1, '{"region":"South America"}'::jsonb)
on conflict (slug) do nothing;

insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
select
  l.id,
  'Madre de Dios',
  'madre-de-dios',
  'PE',
  'region',
  -12.8300,
  -69.3000,
  250.00,
  1,
  '{"biome":"rainforest"}'::jsonb
from locations l
where l.slug = 'peru'
on conflict (slug) do nothing;

insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
select
  l.id,
  'Reserva Manu',
  'reserva-manu',
  'PE',
  'protected_area',
  -12.7700,
  -71.4000,
  400.00,
  1,
  '{"habitat":"lowland rainforest"}'::jsonb
from locations l
where l.slug = 'madre-de-dios'
on conflict (slug) do nothing;

insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
values
  (null, 'Brasil', 'brasil', 'BR', 'country', -14.2350, -51.9253, 320.00, 2, '{"region":"South America"}'::jsonb)
on conflict (slug) do nothing;

insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
select
  l.id,
  'Amazonas',
  'amazonas-br',
  'BR',
  'state',
  -3.1190,
  -60.0217,
  92.00,
  1,
  '{"biome":"amazon"}'::jsonb
from locations l
where l.slug = 'brasil'
on conflict (slug) do nothing;

insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
values
  (null, 'España', 'espana', 'ES', 'country', 40.4637, -3.7492, 650.00, 3, '{"region":"Europe"}'::jsonb)
on conflict (slug) do nothing;

-- 3) ESPECÍMENES
insert into specimens (
  catalog_code,
  title,
  description,
  taxonomy_id,
  location_id,
  sex_code,
  quality_grade,
  quality_score,
  price_amount,
  currency,
  stock,
  is_active,
  is_featured,
  attributes,
  metadata
)
select
  'NEO-001',
  'Morpho peleides — macho',
  'Ejemplar seco de alta calidad con tonalidades azules y panel dorsal completo.',
  t.id,
  l.id,
  'M',
  'A1',
  96,
  180.00,
  'USD',
  3,
  true,
  true,
  '{"wingspan_mm":95,"color_palette":["blue","black"],"preservation":"dry","origin":"wild"}'::jsonb,
  '{"source":"seed","collection":"neotropical"}'::jsonb
from taxonomies t
join locations l on l.slug = 'reserva-manu'
where t.slug = 'morpho-peleides'
on conflict (catalog_code) do nothing;

insert into specimens (
  catalog_code,
  title,
  description,
  taxonomy_id,
  location_id,
  sex_code,
  quality_grade,
  quality_score,
  price_amount,
  currency,
  stock,
  is_active,
  is_featured,
  attributes,
  metadata
)
select
  'NEO-002',
  'Xylophanes terlooii — hembra',
  'Especimen de polilla tropical con patrón contrastado y excelente preservación.',
  t.id,
  l.id,
  'F',
  'A1',
  94,
  140.00,
  'USD',
  2,
  true,
  false,
  '{"wingspan_mm":110,"color_palette":["brown","cream"],"preservation":"dry","origin":"wild"}'::jsonb,
  '{"source":"seed","collection":"neotropical"}'::jsonb
from taxonomies t
join locations l on l.slug = 'amazonas-br'
where t.slug = 'xylophanes-terlooii'
on conflict (catalog_code) do nothing;

insert into specimens (
  catalog_code,
  title,
  description,
  taxonomy_id,
  location_id,
  sex_code,
  quality_grade,
  quality_score,
  price_amount,
  currency,
  stock,
  is_active,
  is_featured,
  attributes,
  metadata
)
select
  'NEO-003',
  'Dynastes hercules — macho',
  'Escarabajo de gran tamaño con excelente calidad y detalles de cabeza y cuernos.',
  t.id,
  l.id,
  'M',
  'A1',
  97,
  320.00,
  'USD',
  1,
  true,
  true,
  '{"length_mm":150,"color_palette":["black","green"],"preservation":"dry","origin":"captive"}'::jsonb,
  '{"source":"seed","collection":"neotropical"}'::jsonb
from taxonomies t
join locations l on l.slug = 'espana'
where t.slug = 'dynastes-hercules'
on conflict (catalog_code) do nothing;

-- 4) MULTIMEDIA MASIVA PARA ESPECÍMENES
insert into specimen_media (
  specimen_id,
  media_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  width,
  height,
  duration_seconds,
  checksum,
  cdn_url,
  thumbnail_url,
  is_primary,
  sort_order,
  is_public,
  is_active,
  metadata
)
select
  s.id,
  'image',
  'media',
  'specimens/neo-001/primary.webp',
  'image/webp',
  812000,
  1600,
  1200,
  null,
  'sha256:neo001_primary',
  'https://cdn.example.com/specimens/neo-001/primary.webp',
  'https://cdn.example.com/specimens/neo-001/primary.thumb.webp',
  true,
  1,
  true,
  true,
  '{"view":"dorsal","lighting":"studio"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-001'
on conflict (specimen_id, storage_path) do nothing;

insert into specimen_media (
  specimen_id,
  media_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  width,
  height,
  duration_seconds,
  checksum,
  cdn_url,
  thumbnail_url,
  is_primary,
  sort_order,
  is_public,
  is_active,
  metadata
)
select
  s.id,
  'model',
  'media',
  'specimens/neo-001/rotating.glb',
  'model/gltf-binary',
  2400000,
  null,
  null,
  null,
  'sha256:neo001_model',
  'https://cdn.example.com/specimens/neo-001/rotating.glb',
  'https://cdn.example.com/specimens/neo-001/rotating.thumb.webp',
  false,
  2,
  true,
  true,
  '{"format":"glb","rotation":"360"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-001'
on conflict (specimen_id, storage_path) do nothing;

insert into specimen_media (
  specimen_id,
  media_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  width,
  height,
  duration_seconds,
  checksum,
  cdn_url,
  thumbnail_url,
  is_primary,
  sort_order,
  is_public,
  is_active,
  metadata
)
select
  s.id,
  'video',
  'media',
  'specimens/neo-001/turntable.mp4',
  'video/mp4',
  5400000,
  1920,
  1080,
  22.5,
  'sha256:neo001_video',
  'https://cdn.example.com/specimens/neo-001/turntable.mp4',
  'https://cdn.example.com/specimens/neo-001/turntable.thumb.webp',
  false,
  3,
  true,
  true,
  '{"angle":"turntable","duration_sec":22.5}'::jsonb
from specimens s
where s.catalog_code = 'NEO-001'
on conflict (specimen_id, storage_path) do nothing;

insert into specimen_media (
  specimen_id,
  media_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  width,
  height,
  duration_seconds,
  checksum,
  cdn_url,
  thumbnail_url,
  is_primary,
  sort_order,
  is_public,
  is_active,
  metadata
)
select
  s.id,
  'image',
  'media',
  'specimens/neo-002/primary.webp',
  'image/webp',
  735000,
  1400,
  1050,
  null,
  'sha256:neo002_primary',
  'https://cdn.example.com/specimens/neo-002/primary.webp',
  'https://cdn.example.com/specimens/neo-002/primary.thumb.webp',
  true,
  1,
  true,
  true,
  '{"view":"dorsal","lighting":"natural"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-002'
on conflict (specimen_id, storage_path) do nothing;

insert into specimen_media (
  specimen_id,
  media_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  width,
  height,
  duration_seconds,
  checksum,
  cdn_url,
  thumbnail_url,
  is_primary,
  sort_order,
  is_public,
  is_active,
  metadata
)
select
  s.id,
  'image',
  'media',
  'specimens/neo-003/primary.webp',
  'image/webp',
  950000,
  1700,
  1200,
  null,
  'sha256:neo003_primary',
  'https://cdn.example.com/specimens/neo-003/primary.webp',
  'https://cdn.example.com/specimens/neo-003/primary.thumb.webp',
  true,
  1,
  true,
  true,
  '{"view":"frontal","lighting":"studio"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-003'
on conflict (specimen_id, storage_path) do nothing;
