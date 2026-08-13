-- ============================================================================
-- 0013 · Reparar stub `node_media` (solo id/created_at/updated_at)
--
-- En producción quedó una tabla vacía incompleta: create table if not exists
-- de 0012 no añadió columnas. Sin public_id/folder el registry no puede
-- guardar CARD/VIDEO → familias como Hepialidae quedan en «Sin imagen».
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'node_media'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'node_media'
      and column_name = 'public_id'
  ) then
    drop table public.node_media cascade;
  end if;
end $$;

create table if not exists node_media (
  id              uuid primary key default gen_random_uuid(),
  target_id       text not null,
  slot            text not null check (slot in ('card', 'video')),
  public_id       text not null,
  resource_type   text not null default 'image'
                    check (resource_type in ('image', 'video', 'raw')),
  folder          text not null,
  node_path       text not null,
  level           text,
  secure_url      text,
  sync_status     text not null default 'MIRRORED'
                    check (sync_status in (
                      'MIRRORED',
                      'PENDING_UPLOAD',
                      'PENDING_DB',
                      'PENDING_CLOUD',
                      'ORPHAN_CLOUD',
                      'ORPHAN_DB',
                      'ERROR'
                    )),
  metadata        jsonb not null default '{}'::jsonb,
  last_synced_at  timestamptz not null default timezone('utc'::text, now()),
  created_at      timestamptz not null default timezone('utc'::text, now()),
  updated_at      timestamptz not null default timezone('utc'::text, now()),
  constraint node_media_target_slot_unique unique (target_id, slot)
);

create unique index if not exists idx_node_media_public_id
  on node_media (public_id)
  where public_id is not null and btrim(public_id) <> '';

create index if not exists idx_node_media_folder
  on node_media (folder);

create index if not exists idx_node_media_node_path
  on node_media (node_path);

create index if not exists idx_node_media_slot
  on node_media (slot);

-- Trigger updated_at (idempotente si ya existe la función).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_node_media_updated on node_media;
create trigger trg_node_media_updated
  before update on node_media
  for each row execute function set_updated_at();

alter table node_media enable row level security;

drop policy if exists node_media_public_read on node_media;
create policy node_media_public_read
  on node_media
  for select
  using (true);
