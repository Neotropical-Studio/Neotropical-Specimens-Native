-- ============================================================================
-- 0003 · Panel /admin: usuarios, secuencias correlativas, referencia adicional
-- (categorías/regiones), campañas, embarques/documentos legales.
--
-- Convención heredada de schema.sql: RLS habilitado en toda tabla nueva; las
-- que el storefront lee directo (categories/global_regions ya existían,
-- campaigns es nueva) reciben una política pública `for select using (true)`
-- y nada más; las puramente internas (admin_users, code_sequences,
-- shipments*) se quedan sin ninguna política — sólo service_role lee/escribe,
-- igual que sync_event/translation_cache hoy. Ninguna tabla nueva recibe
-- política pública de escritura: todo admin write pasa por getSupabaseAdmin()
-- desde Server Actions, con requireAdmin() como guardia de aplicación.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_users — autorización sobre una sesión real de Supabase Auth
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'editor' check (role in ('super_admin', 'editor', 'viewer')),
  active     boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists trg_admin_users_updated on admin_users;
create trigger trg_admin_users_updated
  before update on admin_users
  for each row execute function set_updated_at();

alter table admin_users enable row level security;
-- Sin políticas: sólo service_role (getCurrentAdmin en lib/auth/admin.ts).

-- ---------------------------------------------------------------------------
-- 2. code_sequences — contador atómico para códigos correlativos
--    (specimen_code nuevo formato NEO-4421, shipment_code EXP-2026-00001)
-- ---------------------------------------------------------------------------
create table if not exists code_sequences (
  id         text primary key,       -- 'specimen:NEO' | 'shipment:export:2026' | 'shipment:import:2026'
  next_value bigint not null default 1
);

alter table code_sequences enable row level security;
-- Sin políticas: sólo service_role, vía next_sequence().

create or replace function next_sequence(seq_key text) returns bigint
language sql
security definer
set search_path = public
as $$
  insert into code_sequences (id, next_value) values (seq_key, 1)
  on conflict (id) do update set next_value = code_sequences.next_value + 1
  returning next_value;
$$;

-- El primer NEO-... generado por el panel debe salir como NEO-4421 (ejemplo
-- del pedido original) sin chocar con specimen_code legado (formato distinto,
-- NEO-LEP-MORPHO-001).
insert into code_sequences (id, next_value) values ('specimen:NEO', 4420)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Referencia adicional: las 5 categorías y las regiones biogeográficas
--    mundiales (Neotropical ya existía y queda con prioridad de UI, no de BD).
-- ---------------------------------------------------------------------------
insert into categories (name, slug, settings) values
  ('Polillas', 'polillas', '{"display_mode": "grid"}'),
  ('Escarabajos', 'escarabajos', '{"display_mode": "grid"}'),
  ('Artrópodos', 'artropodos', '{"display_mode": "grid"}'),
  ('Raros y Especiales', 'raros-especiales', '{"display_mode": "grid"}')
on conflict (slug) do nothing;

insert into global_regions (name, region_name, metadata) values
  ('Región Paleártica', 'PAL', '{}'),
  ('Región Neártica', 'NEA', '{}'),
  ('Región Afrotropical', 'AFR', '{}'),
  ('Región Indomalaya', 'IND', '{}'),
  ('Región Australasiana', 'AUS', '{}'),
  ('Región Antártica', 'ANT', '{}'),
  ('Región Oceánica', 'OCE', '{}')
on conflict (region_name) do nothing;

-- ---------------------------------------------------------------------------
-- 4. append_media_asset — apéndice atómico a specimens.media_assets
--    (evita carrera de lectura-modificación-escritura con subidas concurrentes)
-- ---------------------------------------------------------------------------
create or replace function append_media_asset(p_specimen_id uuid, p_asset jsonb) returns void
language sql
security definer
set search_path = public
as $$
  update specimens
  set media_assets = media_assets || jsonb_build_array(p_asset)
  where id = p_specimen_id;
$$;

-- ---------------------------------------------------------------------------
-- 5. campaigns — cintillos/avisos con activación por ventana de fechas
-- ---------------------------------------------------------------------------
create table if not exists campaigns (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  banner           jsonb not null default '{}'::jsonb,
  -- banner: {headline:{es,en}, subheadline:{es,en}, cta_label:{es,en}, cta_href,
  --          image_cloudinary_id, video_cloudinary_id}
  discount_percent numeric(5, 2) check (discount_percent between 0 and 100),
  category_id      uuid references categories(id) on delete set null,
  region_id        uuid references global_regions(id) on delete set null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  priority         integer not null default 0,
  active           boolean not null default true, -- apagado manual, además de la ventana de fechas
  created_by       uuid references admin_users(id) on delete set null,
  created_at       timestamptz not null default timezone('utc'::text, now()),
  updated_at       timestamptz not null default timezone('utc'::text, now()),
  constraint campaigns_window_valid check (ends_at > starts_at)
);

drop trigger if exists trg_campaigns_updated on campaigns;
create trigger trg_campaigns_updated
  before update on campaigns
  for each row execute function set_updated_at();

create index if not exists idx_campaigns_window on campaigns (starts_at, ends_at) where active;

alter table campaigns enable row level security;
drop policy if exists campaigns_public_read on campaigns;
create policy campaigns_public_read on campaigns for select using (true);
-- Escrituras: sólo vía service_role, igual que el resto del catálogo.

-- ---------------------------------------------------------------------------
-- 6. shipments / shipment_items / shipment_permits — logística por embarque
-- ---------------------------------------------------------------------------
create table if not exists shipments (
  id                   uuid primary key default gen_random_uuid(),
  shipment_code        text unique not null,     -- EXP-2026-00001 / IMP-2026-00001
  shipment_type        text not null default 'export' check (shipment_type in ('export', 'import')),
  status               text not null default 'draft'
                         check (status in ('draft', 'permits_pending', 'ready', 'in_transit', 'delivered', 'cancelled')),
  destination_country  text,
  destination_customer text,
  carrier              text,
  tracking_number      text,
  qr_payload           text,       -- URL codificada en el QR
  qr_cloudinary_id     text,
  notes                text,
  created_by           uuid references admin_users(id) on delete set null,
  created_at           timestamptz not null default timezone('utc'::text, now()),
  updated_at           timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists trg_shipments_updated on shipments;
create trigger trg_shipments_updated
  before update on shipments
  for each row execute function set_updated_at();

create index if not exists idx_shipments_status  on shipments (status);
create index if not exists idx_shipments_created  on shipments (created_at desc);

alter table shipments enable row level security;
-- Sin políticas públicas: la página pública de rastreo (app/[lang]/track/[code])
-- lee con getSupabaseAdmin() y proyecta sólo columnas whitelisted, no vía RLS.

create table if not exists shipment_items (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  specimen_id uuid not null references specimens(id) on delete restrict,
  quantity    integer not null default 1 check (quantity > 0),
  unit_price  numeric(12, 2),
  created_at  timestamptz not null default timezone('utc'::text, now()),
  unique (shipment_id, specimen_id)
);

create index if not exists idx_shipment_items_shipment on shipment_items (shipment_id);
create index if not exists idx_shipment_items_specimen on shipment_items (specimen_id);

alter table shipment_items enable row level security;

create table if not exists shipment_permits (
  id                     uuid primary key default gen_random_uuid(),
  shipment_id            uuid not null references shipments(id) on delete cascade,
  permit_code            text not null check (permit_code in ('CITES', 'VUCE', 'SENASA', 'SERFOR')),
  permit_number          text,
  issued_at              date,
  expires_at             date,
  status                 text not null default 'pending'
                          check (status in ('pending', 'submitted', 'approved', 'rejected')),
  document_cloudinary_id text,
  verified_by            uuid references admin_users(id) on delete set null,
  verified_at            timestamptz,
  created_at             timestamptz not null default timezone('utc'::text, now()),
  updated_at             timestamptz not null default timezone('utc'::text, now()),
  unique (shipment_id, permit_code)
);

drop trigger if exists trg_shipment_permits_updated on shipment_permits;
create trigger trg_shipment_permits_updated
  before update on shipment_permits
  for each row execute function set_updated_at();

create index if not exists idx_shipment_permits_shipment on shipment_permits (shipment_id);

alter table shipment_permits enable row level security;
