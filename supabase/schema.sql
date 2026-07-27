-- ============================================================================
-- Neotropical Specimens Native — esquema definitivo para Supabase
-- Objetivo: catálogo de especímenes con taxonomía jerárquica, localizaciones
-- geográficas con GPS, atributos flexibles y multimedia masiva escalable.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Limpieza previa (instalación limpia desde cero)
-- ---------------------------------------------------------------------------
drop table if exists specimen_origin_media cascade;
drop table if exists specimen_media cascade;
drop table if exists specimens cascade;
drop table if exists taxonomies cascade;
drop table if exists locations cascade;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace function sync_location_geography()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geography_point := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  else
    new.geography_point := null;
  end if;
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1. TAXONOMÍA JERÁRQUICA NORMALIZADA
-- ---------------------------------------------------------------------------
create table taxonomies (
    id              uuid primary key default gen_random_uuid(),
    parent_id       uuid references taxonomies(id) on delete set null,
    name            text not null,
    scientific_name text,
    rank            text not null default 'genus' check (
        rank in ('domain','kingdom','phylum','class','order','family','subfamily','tribe','genus','species','subspecies','variety','form')
    ),
    slug            text not null unique,
    path            text not null default '',
    depth           integer not null default 0,
    display_order   integer not null default 0,
    is_active       boolean not null default true,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default timezone('utc'::text, now()),
    updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_taxonomies_parent on taxonomies(parent_id);
create index idx_taxonomies_depth on taxonomies(depth);
create index idx_taxonomies_path on taxonomies(path);
create index idx_taxonomies_active on taxonomies(is_active, display_order);
create index idx_taxonomies_metadata on taxonomies using gin (metadata jsonb_path_ops);

create trigger trg_taxonomies_updated
  before update on taxonomies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. LOCALIZACIONES CON GPS
-- ---------------------------------------------------------------------------
create table locations (
    id                  uuid primary key default gen_random_uuid(),
    parent_id           uuid references locations(id) on delete set null,
    name                text not null,
    slug                text not null unique,
    country_code        text,
    administrative_level text,
    latitude            numeric(9,6),
    longitude           numeric(9,6),
    altitude_m          numeric(8,2),
    geography_point     geography(Point,4326),
    depth               integer not null default 0,
    display_order       integer not null default 0,
    is_active           boolean not null default true,
    metadata            jsonb not null default '{}'::jsonb,
    created_at          timestamptz not null default timezone('utc'::text, now()),
    updated_at          timestamptz not null default timezone('utc'::text, now())
);

create index idx_locations_parent on locations(parent_id);
create index idx_locations_depth on locations(depth);
create index idx_locations_active on locations(is_active, display_order);
create index idx_locations_latlon on locations(latitude, longitude);
create index idx_locations_geography on locations using gist (geography_point);
create index idx_locations_metadata on locations using gin (metadata jsonb_path_ops);

create trigger trg_locations_sync_geography
  before insert or update on locations
  for each row execute function sync_location_geography();

create trigger trg_locations_updated
  before update on locations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. ESPECÍMENES / PRODUCTOS
-- ---------------------------------------------------------------------------
create table specimens (
    id              uuid primary key default gen_random_uuid(),
    catalog_code    text not null unique,
    title           text,
    description     text,
    taxonomy_id     uuid references taxonomies(id) on delete restrict,
    location_id     uuid references locations(id) on delete restrict,
    sex_code        text not null default 'U' check (sex_code in ('M','F','U','P','G','H','R','A')),
    quality_grade   text not null default 'UNRATED' check (
        quality_grade in ('A.1','A1-','A2','A2.','B3','A3','VGA','UNRATED')
    ),
    quality_score   smallint check (quality_score between 0 and 100),
    price_amount    numeric(12,2) not null default 0,
    currency        char(3) not null default 'USD',
    stock           integer not null default 0 check (stock >= 0),
    is_active       boolean not null default true,
    is_featured     boolean not null default false,
    attributes      jsonb not null default '{}'::jsonb,
    metadata        jsonb not null default '{}'::jsonb,
    origin_flag_url text,
    origin_banner_url text,
    created_at      timestamptz not null default timezone('utc'::text, now()),
    updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_specimens_taxonomy on specimens(taxonomy_id);
create index idx_specimens_location on specimens(location_id);
create index idx_specimens_status on specimens(is_active, is_featured, stock);
create index idx_specimens_sex_quality on specimens(sex_code, quality_grade);
create index idx_specimens_price on specimens(price_amount);
create index idx_specimens_created on specimens(created_at desc);
create index idx_specimens_attributes on specimens using gin (attributes jsonb_path_ops);
create index idx_specimens_metadata on specimens using gin (metadata jsonb_path_ops);

create trigger trg_specimens_updated
  before update on specimens
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. MULTIMEDIA MASIVA DE ESPECÍMENES
-- ---------------------------------------------------------------------------
create table specimen_origin_media (
    id                uuid primary key default gen_random_uuid(),
    specimen_id       uuid not null references specimens(id) on delete cascade,
    media_type        text not null check (media_type in ('flag','banner','map','other')),
    label             text,
    country_code      text,
    region_key        text,
    collection_key    text,
    storage_bucket    text not null default 'media',
    storage_path      text not null,
    mime_type         text,
    file_size_bytes   bigint,
    width             integer,
    height            integer,
    checksum          text,
    cdn_url           text,
    thumbnail_url     text,
    is_primary        boolean not null default false,
    sort_order        integer not null default 0,
    is_public         boolean not null default true,
    is_active         boolean not null default true,
    metadata          jsonb not null default '{}'::jsonb,
    created_at        timestamptz not null default timezone('utc'::text, now()),
    updated_at        timestamptz not null default timezone('utc'::text, now())
);

create unique index idx_specimen_origin_media_unique_path on specimen_origin_media(specimen_id, storage_path);
create index idx_specimen_origin_media_specimen on specimen_origin_media(specimen_id);
create index idx_specimen_origin_media_type on specimen_origin_media(media_type, is_active);
create index idx_specimen_origin_media_primary on specimen_origin_media(specimen_id, is_primary) where is_primary = true;
create index idx_specimen_origin_media_order on specimen_origin_media(specimen_id, sort_order);
create index idx_specimen_origin_media_metadata on specimen_origin_media using gin (metadata jsonb_path_ops);

create trigger trg_specimen_origin_media_updated
  before update on specimen_origin_media
  for each row execute function set_updated_at();

create table specimen_media (
    id                uuid primary key default gen_random_uuid(),
    specimen_id       uuid not null references specimens(id) on delete cascade,
    media_type        text not null check (media_type in ('image','video','model','audio','document','other')),
    storage_bucket    text not null default 'media',
    storage_path      text not null,
    mime_type         text,
    file_size_bytes   bigint,
    width             integer,
    height            integer,
    duration_seconds  numeric(10,3),
    checksum          text,
    cdn_url           text,
    thumbnail_url     text,
    is_primary        boolean not null default false,
    sort_order        integer not null default 0,
    is_public         boolean not null default true,
    is_active         boolean not null default true,
    metadata          jsonb not null default '{}'::jsonb,
    created_at        timestamptz not null default timezone('utc'::text, now()),
    updated_at        timestamptz not null default timezone('utc'::text, now())
);

create unique index idx_specimen_media_unique_path on specimen_media(specimen_id, storage_path);
create index idx_specimen_media_specimen on specimen_media(specimen_id);
create index idx_specimen_media_type on specimen_media(media_type, is_active);
create index idx_specimen_media_primary on specimen_media(specimen_id, is_primary) where is_primary = true;
create index idx_specimen_media_order on specimen_media(specimen_id, sort_order);
create index idx_specimen_media_created on specimen_media(created_at desc);
create index idx_specimen_media_metadata on specimen_media using gin (metadata jsonb_path_ops);

create trigger trg_specimen_media_updated
  before update on specimen_media
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Comentarios de diseño / extensibilidad
-- ---------------------------------------------------------------------------
-- Este esquema está pensado para escalar a miles de archivos multimedia.
-- Para ello, la tabla specimen_media se mantiene normalizada y separada de
-- specimens, con índices por specimen_id, tipo de media, orden y estado.
-- Los atributos y metadatos van en JSONB para permitir flexibilidad futura sin
-- sacrificar la normalización de las entidades principales.
