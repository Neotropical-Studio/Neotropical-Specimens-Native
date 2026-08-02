-- ============================================================================
-- 0012 · Registry industrial CARD/VIDEO de nodo (catálogo)
--
-- Fuente de verdad para el storefront: solo filas reales.
-- Cloudinary = blob store; esta tabla = índice regenerativo.
--
-- Ciclo:
--   POST  /api/admin/node-media → upsert fila
--   DELETE /api/admin/node-media → delete filas del slot
--   Storefront → SELECT public_id (nunca inventa cover/intro fantasma)
--
-- Escala: O(n_slots) en DB, no scan de 80k especímenes.
-- Cero hardcode de nodos: target_id / node_path vienen del upload.
-- ============================================================================

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

drop trigger if exists trg_node_media_updated on node_media;
create trigger trg_node_media_updated
  before update on node_media
  for each row execute function set_updated_at();

alter table node_media enable row level security;

-- Storefront (anon) puede leer public_ids para cards/intros.
drop policy if exists node_media_public_read on node_media;
create policy node_media_public_read
  on node_media
  for select
  using (true);

-- Escritura solo service_role (API admin / getSupabaseAdmin).
-- Sin políticas de insert/update/delete para anon/authenticated.
