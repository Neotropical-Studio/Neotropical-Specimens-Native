-- ============================================================================
-- Neotropical Specimens Native — Esquema camaleónico (source of truth)
-- Diseño centrado en `specimens`: taxonomía y multimedia viven en JSONB vivo.
-- Instalación limpia desde cero.
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 0. LIMPIEZA PREVIA (instalación limpia desde cero)
-- ---------------------------------------------------------------------------
drop table if exists specimens      cascade;
drop table if exists taxonomy       cascade;
drop table if exists categories     cascade;
drop table if exists global_regions cascade;
drop table if exists site_branding  cascade;

-- ---------------------------------------------------------------------------
-- Utilidad: mantener updated_at automáticamente
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1. IDENTIDAD VISUAL DINÁMICA
-- ---------------------------------------------------------------------------
create table site_branding (
    id         uuid primary key default gen_random_uuid(),
    title      text not null,
    assets     jsonb not null default '{}'::jsonb,     -- logos, banners, recursos de Cloudinary
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger trg_site_branding_updated
  before update on site_branding
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. REGIONES GEOGRÁFICAS GLOBALES (Ej. Neotropical, Paleártico)
-- ---------------------------------------------------------------------------
create table global_regions (
    id       uuid primary key default gen_random_uuid(),
    name     text not null,
    code     text unique not null,                     -- Código corto (NEO, PAL)
    metadata jsonb not null default '{}'::jsonb
);

create index idx_regions_metadata on global_regions using gin (metadata jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- 3. RUBROS O CATEGORÍAS PRINCIPALES (Ej. Mariposas, Insectos, Artrópodos)
-- ---------------------------------------------------------------------------
create table categories (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    slug       text unique not null,                   -- URL amigable
    settings   jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger trg_categories_updated
  before update on categories
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. TAXONOMÍA CIENTÍFICA (jerarquía viva en JSONB)
-- ---------------------------------------------------------------------------
create table taxonomy (
    id            uuid primary key default gen_random_uuid(),
    category_id   uuid references categories(id) on delete cascade,
    rank_hierarchy jsonb not null,                     -- orden, familia, subfamilia, género, especie, subespecie
    updated_at    timestamptz not null default timezone('utc'::text, now())
);

create index idx_taxonomy_category on taxonomy(category_id);
create index idx_taxonomy_ranks    on taxonomy using gin (rank_hierarchy jsonb_path_ops);

create trigger trg_taxonomy_updated
  before update on taxonomy
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. NÚCLEO CAMALEÓNICO DE ESPECÍMENES (inventario total)
-- ---------------------------------------------------------------------------
create table specimens (
    id            uuid primary key default gen_random_uuid(),
    specimen_code text unique not null,                -- Código físico de inventario (NEO-LEP-001)

    -- Enlaces relacionales limpios
    global_region_id uuid references global_regions(id) on delete restrict,
    taxonomy_id      uuid references taxonomy(id)       on delete restrict,

    -- Datos comerciales y stock abiertos
    pricing jsonb not null default '{}'::jsonb,         -- retail_price, wholesale_price, wholesale_min_qty, currency
    stock   integer not null default 1 check (stock >= 0),

    -- Atributos físicos y biológicos camaleónicos
    -- sexo (M, F, P, EP, S), calidad (A1, A1/A1-, A1-, VGA2, A2), wingspan_mm, colores, origen, etc.
    attributes jsonb not null default '{}'::jsonb,

    -- Multimedia masiva y dinámica (Cloudinary): fotos WebP, modelos 3D (.glb), videos
    media_assets jsonb not null default '[]'::jsonb,

    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Índices para joins y filtrado camaleónico
create index idx_specimens_region     on specimens(global_region_id);
create index idx_specimens_taxonomy   on specimens(taxonomy_id);
create index idx_specimens_attributes on specimens using gin (attributes jsonb_path_ops);
create index idx_specimens_pricing    on specimens using gin (pricing    jsonb_path_ops);
create index idx_specimens_media      on specimens using gin (media_assets);
create index idx_specimens_created    on specimens(created_at desc);

create trigger trg_specimens_updated
  before update on specimens
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Sincronización de eventos (Sanity / n8n / webhooks)
-- ---------------------------------------------------------------------------
create table sync_event (
    id         bigint generated always as identity primary key,
    source     text not null,
    event_type text not null,
    payload    jsonb not null default '{}'::jsonb,
    processed  boolean not null default false,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_sync_unprocessed on sync_event (created_at) where processed = false;
create index idx_sync_source      on sync_event (source, event_type);

-- ---------------------------------------------------------------------------
-- RLS — lectura pública del catálogo (anon key)
-- ---------------------------------------------------------------------------
alter table site_branding  enable row level security;
alter table global_regions enable row level security;
alter table categories     enable row level security;
alter table taxonomy       enable row level security;
alter table specimens      enable row level security;
alter table sync_event     enable row level security;   -- sin política pública: sólo service_role escribe/lee

create policy site_branding_public_read  on site_branding  for select using (true);
create policy global_regions_public_read on global_regions for select using (true);
create policy categories_public_read     on categories     for select using (true);
create policy taxonomy_public_read       on taxonomy       for select using (true);
create policy specimens_public_read      on specimens      for select using (true);
-- Escrituras: sólo vía service_role (backend), que evita RLS por diseño.
