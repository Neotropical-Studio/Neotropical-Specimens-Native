-- ============================================================================
-- RLS público seguro para el catálogo de especímenes.
-- Solo se exponen las filas autorizadas para lectura pública.
-- ============================================================================

alter table taxonomies enable row level security;
alter table locations enable row level security;
alter table specimens enable row level security;
alter table specimen_media enable row level security;
alter table specimen_origin_media enable row level security;

drop policy if exists taxonomies_public_read on taxonomies;
drop policy if exists locations_public_read on locations;
drop policy if exists specimens_public_read on specimens;
drop policy if exists specimen_media_public_read on specimen_media;
drop policy if exists specimen_origin_media_public_read on specimen_origin_media;

create policy taxonomies_public_read on taxonomies
  for select using (is_active = true);

create policy locations_public_read on locations
  for select using (is_active = true);

create policy specimens_public_read on specimens
  for select using (is_active = true);

create policy specimen_media_public_read on specimen_media
  for select using (is_active = true and is_public = true);

create policy specimen_origin_media_public_read on specimen_origin_media
  for select using (is_active = true and is_public = true);
