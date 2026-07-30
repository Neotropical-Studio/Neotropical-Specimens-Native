-- ============================================================================
-- 0010 · Espejo industrial Cloudinary ↔ Supabase (universal / idempotente)
--
-- ESTADO: OPCIONAL. Equivale a la sección C de
--   supabase/sql/espejo_universal_industrial.sql
-- Live (Jul 2026) ya tiene specimen_media básico + specimens.cloudinary_public_id;
-- faltan sync_status / mirror_status / mirror_sync_runs.
-- El runtime lib/mirror/* tolera la ausencia (fallback a columnas básicas).
-- Preferir pegar sección C del SQL industrial si quieres estados de espejo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. specimen_media — estado de espejo
-- ---------------------------------------------------------------------------
alter table specimen_media add column if not exists sync_status text;
alter table specimen_media add column if not exists cloudinary_exists boolean;
alter table specimen_media add column if not exists is_placeholder boolean not null default false;
alter table specimen_media add column if not exists last_synced_at timestamptz;
alter table specimen_media add column if not exists mirror_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'specimen_media_sync_status_check'
  ) then
    alter table specimen_media
      add constraint specimen_media_sync_status_check
      check (
        sync_status is null
        or sync_status in (
          'MIRRORED',
          'PENDING_UPLOAD',
          'PENDING_DB',
          'ORPHAN_CLOUD',
          'ORPHAN_DB',
          'ERROR'
        )
      );
  end if;
exception
  when duplicate_object then null;
end $$;

update specimen_media
set sync_status = coalesce(sync_status, 'PENDING_DB')
where sync_status is null;

alter table specimen_media
  alter column sync_status set default 'PENDING_DB';

create unique index if not exists idx_specimen_media_public_id_key
  on specimen_media (public_id)
  where public_id is not null and btrim(public_id) <> '';

create index if not exists idx_specimen_media_sync_status
  on specimen_media (sync_status);

create index if not exists idx_specimen_media_last_synced
  on specimen_media (last_synced_at desc nulls last);

-- ---------------------------------------------------------------------------
-- 2. specimens — ancla Cloudinary canónica
-- ---------------------------------------------------------------------------
alter table specimens add column if not exists cloudinary_public_id text;
alter table specimens add column if not exists mirror_status text;
alter table specimens add column if not exists last_mirror_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'specimens_mirror_status_check'
  ) then
    alter table specimens
      add constraint specimens_mirror_status_check
      check (
        mirror_status is null
        or mirror_status in (
          'MIRRORED',
          'PENDING',
          'PLACEHOLDER',
          'ERROR'
        )
      );
  end if;
exception
  when duplicate_object then null;
end $$;

update specimens
set mirror_status = coalesce(mirror_status, 'PENDING')
where mirror_status is null;

alter table specimens
  alter column mirror_status set default 'PENDING';

-- Backfill cloudinary_public_id desde media_url (solo si vacío)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'specimens' and column_name = 'media_url'
  ) then
    execute $u$
      update specimens
      set cloudinary_public_id = trim(both '/' from regexp_replace(
        regexp_replace(
          split_part(media_url, '/upload/', 2),
          '^v[0-9]+/',
          ''
        ),
        '\.[A-Za-z0-9]+$',
        ''
      ))
      where (cloudinary_public_id is null or btrim(cloudinary_public_id) = '')
        and media_url is not null
        and media_url like '%/upload/%'
    $u$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Tabla de corridas del espejo (auditoría industrial)
-- ---------------------------------------------------------------------------
create table if not exists mirror_sync_runs (
  id              uuid primary key default gen_random_uuid(),
  started_at      timestamptz not null default timezone('utc'::text, now()),
  finished_at     timestamptz,
  mode            text not null default 'apply'
                    check (mode in ('discover', 'apply')),
  triggered_by    text,
  cloud_scanned   integer not null default 0,
  db_scanned      integer not null default 0,
  upserted_media  integer not null default 0,
  created_cloud   integer not null default 0,
  placeholders    integer not null default 0,
  orphans_cloud   integer not null default 0,
  orphans_db      integer not null default 0,
  errors          jsonb not null default '[]'::jsonb,
  summary         jsonb not null default '{}'::jsonb
);

alter table mirror_sync_runs enable row level security;
-- Lectura/escritura sólo service_role (sin policy pública de write).

create index if not exists idx_mirror_sync_runs_started
  on mirror_sync_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- 4. Vistas de diagnóstico (espejo)
-- ---------------------------------------------------------------------------
create or replace view v_mirror_db_without_cloud_flag as
select
  sm.id,
  sm.specimen_id,
  sm.public_id,
  sm.media_url,
  sm.sync_status,
  sm.cloudinary_exists,
  sm.is_placeholder,
  s.species_name,
  s.specimen_code
from specimen_media sm
left join specimens s on s.id = sm.specimen_id
where coalesce(sm.cloudinary_exists, false) = false
   or sm.sync_status in ('PENDING_UPLOAD', 'ORPHAN_DB', 'ERROR');

create or replace view v_mirror_specimens_without_media as
select
  s.id,
  s.species_name,
  s.specimen_code,
  s.cloudinary_public_id,
  s.media_url,
  s.mirror_status
from specimens s
where not exists (
  select 1 from specimen_media m where m.specimen_id = s.id
);

comment on table mirror_sync_runs is
  'Auditoría de sync bidireccional Cloudinary ↔ Supabase (consola industrial).';
comment on column specimen_media.sync_status is
  'MIRRORED | PENDING_UPLOAD | PENDING_DB | ORPHAN_CLOUD | ORPHAN_DB | ERROR';
comment on column specimens.mirror_status is
  'MIRRORED | PENDING | PLACEHOLDER | ERROR — estado del espejo del espécimen.';

-- ---------------------------------------------------------------------------
-- Cómo aplicar:
--   1. Ejecutar primero 0009_align_live_schema.sql
--   2. Pegar este archivo en SQL Editor → Run
--   3. En admin Consola → botón ESPEJO C↔S (o POST /api/admin/mirror-sync)
-- ============================================================================
