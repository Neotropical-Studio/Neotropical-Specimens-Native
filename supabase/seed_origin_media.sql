-- ============================================================================
-- Seed para múltiples assets de origen por espécimen.
-- Permite guardar varias banderas/banners por país, región o colección.
-- ============================================================================

insert into specimen_origin_media (
  specimen_id,
  media_type,
  label,
  country_code,
  region_key,
  collection_key,
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
  'flag',
  'Perú',
  'PE',
  'neotropical',
  null,
  'media',
  'specimens/origin/pe-flag.webp',
  'image/webp',
  180000,
  800,
  533,
  'sha256:pe_flag',
  'https://flagcdn.com/w320/pe.png',
  'https://flagcdn.com/w80/pe.png',
  true,
  1,
  true,
  true,
  '{"scope":"country","purpose":"display"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-MORPHO-01'
on conflict (specimen_id, storage_path) do nothing;

insert into specimen_origin_media (
  specimen_id,
  media_type,
  label,
  country_code,
  region_key,
  collection_key,
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
  'banner',
  'Tingo María',
  'PE',
  'neotropical',
  'tingo-maria',
  'media',
  'specimens/origin/tingo-maria-banner.webp',
  'image/webp',
  420000,
  1600,
  900,
  'sha256:tingo_banner',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=60',
  false,
  2,
  true,
  true,
  '{"scope":"collection","purpose":"hero"}'::jsonb
from specimens s
where s.catalog_code = 'NEO-MORPHO-01'
on conflict (specimen_id, storage_path) do nothing;
