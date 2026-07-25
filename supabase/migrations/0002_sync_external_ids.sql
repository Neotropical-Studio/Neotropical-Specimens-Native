-- ============================================================================
-- 0002 · Claves externas para sync Sanity → Supabase
-- El upsert/delete disparado por el endpoint de sync (app/api/sync/specimens)
-- necesita anclar cada fila a su documento de origen en Sanity: sin esto, un
-- update de precio/slug renombraría en vez de actualizar, y un delete no
-- tendría cómo encontrar la fila (el doc ya no existe en Sanity para
-- redereferenciar specimen_code/rank_hierarchy).
-- ============================================================================

alter table specimens add column if not exists sanity_id text;
alter table taxonomy  add column if not exists sanity_id text;

create unique index if not exists idx_specimens_sanity_id on specimens (sanity_id) where sanity_id is not null;
create unique index if not exists idx_taxonomy_sanity_id   on taxonomy  (sanity_id) where sanity_id is not null;
