-- ============================================================================
-- Seed de ejemplo: Morpho godartii didius tingomarensis
-- Adaptado al esquema definitivo de Supabase para taxonomía, ubicación,
-- atributos detallados y multimedia (fotos, 3D, video).
-- ============================================================================

-- 1) TAXONOMÍA completa: Orden → Familia → Subfamilia → Género → Especie → Subespecie
insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
values
  (null, 'Lepidoptera', 'Lepidoptera', 'order', 'lepidoptera', 'lepidoptera', 0, 1, '{"group":"order"}'::jsonb)
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morphidae',
  'Morphidae',
  'family',
  'morphidae',
  'lepidoptera/morphidae',
  1,
  1,
  '{"group":"family"}'::jsonb
from taxonomies t
where t.slug = 'lepidoptera'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morphinae',
  'Morphinae',
  'subfamily',
  'morphinae',
  'lepidoptera/morphidae/morphinae',
  2,
  1,
  '{"group":"subfamily"}'::jsonb
from taxonomies t
where t.slug = 'morphidae'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morpho',
  'Morpho',
  'genus',
  'morpho',
  'lepidoptera/morphidae/morphinae/morpho',
  3,
  1,
  '{"group":"genus"}'::jsonb
from taxonomies t
where t.slug = 'morphinae'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morpho godartii didius',
  'Morpho godartii didius',
  'species',
  'morpho-godartii-didius',
  'lepidoptera/morphidae/morphinae/morpho/morpho-godartii-didius',
  4,
  1,
  '{"group":"species"}'::jsonb
from taxonomies t
where t.slug = 'morpho'
on conflict (slug) do nothing;

insert into taxonomies (parent_id, name, scientific_name, rank, slug, path, depth, display_order, metadata)
select
  t.id,
  'Morpho godartii didius tingomarensis',
  'Morpho godartii didius tingomarensis',
  'subspecies',
  'morpho-godartii-didius-tingomarensis',
  'lepidoptera/morphidae/morphinae/morpho/morpho-godartii-didius/morpho-godartii-didius-tingomarensis',
  5,
  1,
  '{"group":"subspecies","common_name":"Morpho azul"}'::jsonb
from taxonomies t
where t.slug = 'morpho-godartii-didius'
on conflict (slug) do nothing;

-- 2) LOCALIDAD: Tingo María - Huánuco, Perú
insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
values
  (null, 'Perú', 'peru', 'PE', 'country', -9.1900, -75.0152, 1540.00, 1, '{"region":"Central & South America (Neotropical)","country":"Perú"}'::jsonb)
on conflict (slug) do nothing;

insert into locations (parent_id, name, slug, country_code, administrative_level, latitude, longitude, altitude_m, display_order, metadata)
select
  l.id,
  'Tingo María - Huánuco',
  'tingo-maria-huanuco',
  'PE',
  'locality',
  -9.2895,
  -75.9951,
  650.00,
  1,
  '{"region":"Central & South America (Neotropical)","country":"Perú","locality":"Tingo María - Huánuco","collection_note":"Punto de colecta / origen de la muestra"}'::jsonb
from locations l
where l.slug = 'peru'
on conflict (slug) do nothing;

-- 3) ESPECÍMEN: atributos detallados
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
  metadata,
  origin_flag_url,
  origin_banner_url
)
select
  'NEO-MORPHO-01',
  'Morpho godartii didius tingomarensis',
  'Ejemplar de mariposa neotropical con coloración azul intensa, excelente estado de conservación y procedencia de Tingo María, Huánuco, Perú.',
  t.id,
  l.id,
  'M',
  'A.1',
  98,
  260.00,
  'USD',
  2,
  true,
  true,
  '{
    "sex":"male",
    "sex_label":"Macho",
    "sex_type":"male",
    "sex_options":["male","female","pairs","rare","gynandromorph","hybrid","freak","aberrations"],
    "quality":"A.1",
    "quality_label":"Excelente condición de conservación",
    "quality_scale":["A.1","A1-","A2.","B3"],
    "primary_color":"Azul",
    "size_cm":"12-14 cm",
    "size_range_cm":[12,14],
    "origin_country":"Perú",
    "origin_locality":"Tingo María - Huánuco",
    "region":"Central & South America (Neotropical)",
    "preservation":"dry",
    "wing_pattern":"metallic blue",
    "notes":"Ejemplo adaptado al esquema definitivo",\n    "collected_date":"2024-04-15",\n    "collection_year":2024,\n    "collection_month":4,\n    "collection_day":15
  }'::jsonb,
  '{
    "source":"seed",
    "collection_origin":"Tingo María - Huánuco",
    "taxonomy_complete":true,
    "media_expected":"photos,3d_model,video"
  }'::jsonb,
  'https://flagcdn.com/w320/pe.png',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80'
from taxonomies t
join locations l on l.slug = 'tingo-maria-huanuco'
where t.slug = 'morpho-godartii-didius-tingomarensis'
on conflict (catalog_code) do nothing;

-- 4) MULTIMEDIA de ejemplo para el espécimen
-- Nota: para 80,000 archivos, este patrón se repite por lote o por importación
-- masiva, usando specimen_id + storage_path únicos.
insert into specimen_media (
  specimen_id,
  media_type,
  storage_bucket,
  storage_path,
  mime_type,
  file_size_bytes,
  width,
  height,
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
  'specimens/neo-morpho-01/primary.webp',
  'image/webp',
  980000,
  2000,
  1600,
  'sha256:neo_morpho_primary',
  'https://cdn.example.com/specimens/neo-morpho-01/primary.webp',
  'https://cdn.example.com/specimens/neo-morpho-01/primary.thumb.webp',
  true,
  1,
  true,
  true,
  '{"view":"dorsal","lighting":"studio","color":"blue","role":"hero"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-MORPHO-01'
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
  'specimens/neo-morpho-01/turntable.glb',
  'model/gltf-binary',
  3800000,
  null,
  null,
  'sha256:neo_morpho_model',
  'https://cdn.example.com/specimens/neo-morpho-01/turntable.glb',
  'https://cdn.example.com/specimens/neo-morpho-01/turntable.thumb.webp',
  false,
  2,
  true,
  true,
  '{"format":"glb","rotation":"360","role":"3d"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-MORPHO-01'
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
  'specimens/neo-morpho-01/turntable.mp4',
  'video/mp4',
  6200000,
  1920,
  1080,
  24.0,
  'sha256:neo_morpho_video',
  'https://cdn.example.com/specimens/neo-morpho-01/turntable.mp4',
  'https://cdn.example.com/specimens/neo-morpho-01/turntable.thumb.webp',
  false,
  3,
  true,
  true,
  '{"format":"mp4","rotation":"turntable","role":"video"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-MORPHO-01'
on conflict (specimen_id, storage_path) do nothing;
