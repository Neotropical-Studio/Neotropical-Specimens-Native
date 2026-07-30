-- ============================================================================
-- 0009 · Alinear schema live → contrato admin / storefront
--
-- ESTADO: OPCIONAL / SUPERSEDIDO parcialmente por
--   supabase/sql/espejo_universal_industrial.sql (secciones B+).
-- Live (Jul 2026) sigue en schema plano + stubs; el admin ya opera contra
-- columnas live sin exigir esta migración.
--
-- Conservar por historial. Aplicar SOLO si quieres specimen_code, attributes,
-- pricing, campaigns ricas, etc. Es ADITIVA e IDEMPOTENTE (no DROP).
-- Preferir espejo_universal_industrial.sql como fuente única al pegar en SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper temporal (se elimina al final de la sección 2)
-- ---------------------------------------------------------------------------
create or replace function _neo_has_col(p_table text, p_column text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table
      and column_name = p_column
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. specimens — columnas del contrato admin (todas nullable / con default)
-- ---------------------------------------------------------------------------
alter table specimens add column if not exists specimen_code text;
alter table specimens add column if not exists attributes    jsonb not null default '{}'::jsonb;
alter table specimens add column if not exists metadata      jsonb not null default '{}'::jsonb;
alter table specimens add column if not exists stock         integer not null default 0;
alter table specimens add column if not exists pricing       jsonb not null default '{}'::jsonb;
alter table specimens add column if not exists media_assets  jsonb not null default '[]'::jsonb;
alter table specimens add column if not exists stock_status  text;
alter table specimens add column if not exists category_id   uuid;
alter table specimens add column if not exists updated_at
  timestamptz not null default timezone('utc'::text, now());

-- region_id ya existe en live; el admin histórico escribe global_region_id.
-- Columna espejo aditiva (no reemplaza region_id).
alter table specimens add column if not exists global_region_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'specimens_stock_nonneg'
  ) then
    alter table specimens
      add constraint specimens_stock_nonneg check (stock >= 0);
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'specimens_stock_status_check'
  ) then
    alter table specimens
      add constraint specimens_stock_status_check
      check (stock_status is null or stock_status in ('IN_STOCK', 'OUT_OF_STOCK', 'PENDING'));
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'categories')
     and not exists (select 1 from pg_constraint where conname = 'specimens_category_id_fkey') then
    alter table specimens
      add constraint specimens_category_id_fkey
      foreign key (category_id) references categories(id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'global_regions')
     and not exists (select 1 from pg_constraint where conname = 'specimens_global_region_id_fkey') then
    alter table specimens
      add constraint specimens_global_region_id_fkey
      foreign key (global_region_id) references global_regions(id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

create unique index if not exists idx_specimens_specimen_code_key
  on specimens (specimen_code)
  where specimen_code is not null;

create index if not exists idx_specimens_attributes on specimens using gin (attributes jsonb_path_ops);
create index if not exists idx_specimens_metadata   on specimens using gin (metadata jsonb_path_ops);
create index if not exists idx_specimens_pricing    on specimens using gin (pricing jsonb_path_ops);
create index if not exists idx_specimens_category_id on specimens (category_id);
create index if not exists idx_specimens_global_region_id on specimens (global_region_id);

-- ---------------------------------------------------------------------------
-- 2. specimens — backfill (SQL dinámico: no referencia columnas ausentes)
-- ---------------------------------------------------------------------------

-- Espejo region_id → global_region_id
do $$
begin
  if _neo_has_col('specimens', 'region_id') then
    execute $u$
      update specimens
      set global_region_id = region_id
      where global_region_id is null and region_id is not null
    $u$;
  end if;
end $$;

-- stock_status
do $$
begin
  if _neo_has_col('specimens', 'status') then
    execute $u$
      update specimens
      set stock_status = case
        when coalesce(stock, 0) > 0 then 'IN_STOCK'
        when lower(coalesce(status, '')) in ('out', 'out_of_stock', 'agotado', '0') then 'OUT_OF_STOCK'
        else 'PENDING'
      end
      where stock_status is null
    $u$;
  else
    update specimens
    set stock_status = case when coalesce(stock, 0) > 0 then 'IN_STOCK' else 'PENDING' end
    where stock_status is null;
  end if;
end $$;

alter table specimens alter column stock_status set default 'PENDING';

-- pricing desde precio_menor / precio_mayor
do $$
declare
  retail text := case when _neo_has_col('specimens', 'precio_menor') then 'precio_menor' else 'null' end;
  whole  text := case when _neo_has_col('specimens', 'precio_mayor') then 'precio_mayor' else 'null' end;
begin
  if retail <> 'null' or whole <> 'null' then
    execute format(
      $u$
      update specimens
      set pricing = coalesce(pricing, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'retail_price', %s,
        'wholesale_price', %s,
        'currency', 'USD'
      ))
      where (pricing is null or pricing = '{}'::jsonb)
        and (%s is not null or %s is not null)
      $u$,
      retail, whole, retail, whole
    );
  end if;
end $$;

-- attributes desde columnas planas live
do $$
declare
  sex_expr     text := case when _neo_has_col('specimens', 'sexo')
    then 'nullif(btrim(sexo), '''')' else 'null' end;
  quality_expr text := case when _neo_has_col('specimens', 'calidad')
    then 'nullif(btrim(calidad), '''')' else 'null' end;
  origin_expr  text := case when _neo_has_col('specimens', 'origen')
    then 'nullif(btrim(origen), '''')' else 'null' end;
  colors_expr  text := case when _neo_has_col('specimens', 'color_dominante')
    then $c$case when color_dominante is not null and btrim(color_dominante) <> ''
           then jsonb_build_array(btrim(color_dominante)) else null end$c$
    else 'null' end;
  dims_expr    text := case when _neo_has_col('specimens', 'dimensiones')
    then 'nullif(btrim(dimensiones), '''')' else 'null' end;
  weight_expr  text := case when _neo_has_col('specimens', 'peso_gramos')
    then 'peso_gramos' else 'null' end;
begin
  execute format(
    $u$
    update specimens
    set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'sex', %s,
      'quality', %s,
      'grade_code', %s,
      'country_origin', %s,
      'primary_colors', %s,
      'dimensions', %s,
      'weight_g', %s,
      'specimen_kind', 'dried_specimen'
    ))
    where attributes = '{}'::jsonb or attributes is null
    $u$,
    sex_expr, quality_expr, quality_expr, origin_expr, colors_expr, dims_expr, weight_expr
  );
end $$;

-- metadata: taxonomía / localidad planas
do $$
declare
  expr_rubro    text := case when _neo_has_col('specimens', 'rubro') then 'nullif(btrim(rubro), '''')' else 'null' end;
  expr_region   text := case when _neo_has_col('specimens', 'region') then 'nullif(btrim(region), '''')' else 'null' end;
  expr_cat      text := case when _neo_has_col('specimens', 'categoria') then 'nullif(btrim(categoria), '''')' else 'null' end;
  expr_fam      text := case when _neo_has_col('specimens', 'familia') then 'nullif(btrim(familia), '''')' else 'null' end;
  expr_subfam   text := case when _neo_has_col('specimens', 'subfamilia') then 'nullif(btrim(subfamilia), '''')' else 'null' end;
  expr_gen      text := case when _neo_has_col('specimens', 'genero') then 'nullif(btrim(genero), '''')' else 'null' end;
  expr_esp      text := case when _neo_has_col('specimens', 'especie') then 'nullif(btrim(especie), '''')' else 'null' end;
  expr_subesp   text := case when _neo_has_col('specimens', 'subespecie') then 'nullif(btrim(subespecie), '''')' else 'null' end;
  expr_sci      text := case when _neo_has_col('specimens', 'species_name') then 'nullif(btrim(species_name), '''')' else 'null' end;
  expr_loc      text := case when _neo_has_col('specimens', 'localidad') then 'nullif(btrim(localidad), '''')' else 'null' end;
  expr_gps      text := case when _neo_has_col('specimens', 'gps') then 'nullif(btrim(gps), '''')' else 'null' end;
  expr_sexo     text := case when _neo_has_col('specimens', 'sexo') then 'nullif(btrim(sexo), '''')' else 'null' end;
  expr_calidad  text := case when _neo_has_col('specimens', 'calidad') then 'nullif(btrim(calidad), '''')' else 'null' end;
  expr_precio   text := case when _neo_has_col('specimens', 'precio_menor') then 'precio_menor' else 'null' end;
begin
  execute format(
    $u$
    update specimens
    set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'rubro', %s,
      'region', %s,
      'categoria', %s,
      'family_name', %s,
      'familia', %s,
      'subfamilia', %s,
      'genus', %s,
      'genero', %s,
      'especie', %s,
      'subespecie', %s,
      'nombre_cientifico', %s,
      'localidad', %s,
      'gps', %s,
      'sexo', %s,
      'calidad', %s,
      'precio', %s
    ))
    where metadata = '{}'::jsonb or metadata is null
    $u$,
    expr_rubro, expr_region, expr_cat,
    expr_fam, expr_fam, expr_subfam,
    expr_gen, expr_gen, expr_esp, expr_subesp,
    expr_sci, expr_loc, expr_gps, expr_sexo, expr_calidad, expr_precio
  );
end $$;

-- media_assets: un slot dorsal desde cloudinary_public_id o media_url
do $$
declare
  has_pid boolean := _neo_has_col('specimens', 'cloudinary_public_id');
  has_url boolean := _neo_has_col('specimens', 'media_url');
  id_expr text;
  cond    text;
begin
  if not has_pid and not has_url then
    return;
  end if;

  id_expr := format(
    'coalesce(%s, %s)',
    case when has_pid then 'nullif(btrim(cloudinary_public_id), '''')' else 'null' end,
    case when has_url then 'nullif(btrim(media_url), '''')' else 'null' end
  );

  cond := array_to_string(array_remove(array[
    case when has_pid then
      '(cloudinary_public_id is not null and btrim(cloudinary_public_id) <> '''')' end,
    case when has_url then
      '(media_url is not null and btrim(media_url) <> '''')' end
  ], null), ' or ');

  execute format(
    $u$
    update specimens
    set media_assets = jsonb_build_array(
      jsonb_strip_nulls(jsonb_build_object(
        'type', 'photo_webp',
        'view', 'dorsal',
        'cloudinary_id', %s
      ))
    )
    where (media_assets is null or media_assets = '[]'::jsonb)
      and (%s)
    $u$,
    id_expr, cond
  );
end $$;

-- specimen_code provisional (trazable; no inventa NEO-XXXX)
update specimens
set specimen_code = 'LEGACY-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where specimen_code is null;

drop function if exists _neo_has_col(text, text);

-- append_media_asset (0003) — recrear ahora que media_assets existe
create or replace function append_media_asset(p_specimen_id uuid, p_asset jsonb) returns void
language sql
security definer
set search_path = public
as $$
  update specimens
  set media_assets = coalesce(media_assets, '[]'::jsonb) || jsonb_build_array(p_asset)
  where id = p_specimen_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. specimen_media — columnas opcionales del contrato admin (sin romper live)
-- ---------------------------------------------------------------------------
alter table specimen_media add column if not exists view  text;
alter table specimen_media add column if not exists label text;

comment on column specimen_media.view is
  'Ángulo opcional (dorsal/ventral/etiqueta). Live histórico no lo tenía; nullable.';

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'specimen_media_specimen_id_fkey'
  ) then
    alter table specimen_media drop constraint specimen_media_specimen_id_fkey;
  end if;

  alter table specimen_media
    add constraint specimen_media_specimen_id_fkey
    foreign key (specimen_id) references specimens(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 4. campaigns — alterar el stub (id + name) hacia el contrato 0003
-- ---------------------------------------------------------------------------
alter table campaigns add column if not exists title            text;
alter table campaigns add column if not exists banner           jsonb not null default '{}'::jsonb;
alter table campaigns add column if not exists discount_percent numeric(5, 2);
alter table campaigns add column if not exists category_id      uuid;
alter table campaigns add column if not exists region_id        uuid;
alter table campaigns add column if not exists starts_at        timestamptz;
alter table campaigns add column if not exists ends_at          timestamptz;
alter table campaigns add column if not exists priority         integer not null default 0;
alter table campaigns add column if not exists active           boolean not null default true;
alter table campaigns add column if not exists created_by       uuid;
alter table campaigns add column if not exists created_at
  timestamptz not null default timezone('utc'::text, now());
alter table campaigns add column if not exists updated_at
  timestamptz not null default timezone('utc'::text, now());

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'campaigns' and column_name = 'name'
  ) then
    execute $u$
      update campaigns
      set title = coalesce(nullif(btrim(title), ''), nullif(btrim(name), ''), 'Campaña sin título')
      where title is null or btrim(title) = ''
    $u$;
  else
    update campaigns
    set title = coalesce(nullif(btrim(title), ''), 'Campaña sin título')
    where title is null or btrim(title) = '';
  end if;
end $$;

update campaigns
set
  starts_at = coalesce(starts_at, timezone('utc'::text, now())),
  ends_at   = coalesce(ends_at,   timezone('utc'::text, now()) + interval '30 days')
where starts_at is null or ends_at is null;

alter table campaigns alter column title set not null;
alter table campaigns alter column starts_at set not null;
alter table campaigns alter column ends_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_discount_percent_check'
  ) then
    alter table campaigns
      add constraint campaigns_discount_percent_check
      check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100));
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_window_valid'
  ) then
    alter table campaigns
      add constraint campaigns_window_valid check (ends_at > starts_at);
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'categories')
     and not exists (select 1 from pg_constraint where conname = 'campaigns_category_id_fkey') then
    alter table campaigns
      add constraint campaigns_category_id_fkey
      foreign key (category_id) references categories(id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'global_regions')
     and not exists (select 1 from pg_constraint where conname = 'campaigns_region_id_fkey') then
    alter table campaigns
      add constraint campaigns_region_id_fkey
      foreign key (region_id) references global_regions(id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_users')
     and not exists (select 1 from pg_constraint where conname = 'campaigns_created_by_fkey') then
    alter table campaigns
      add constraint campaigns_created_by_fkey
      foreign key (created_by) references admin_users(id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

drop trigger if exists trg_campaigns_updated on campaigns;
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    execute $t$
      create trigger trg_campaigns_updated
        before update on campaigns
        for each row execute function set_updated_at()
    $t$;
  end if;
end $$;

create index if not exists idx_campaigns_window
  on campaigns (starts_at, ends_at)
  where active;

alter table campaigns enable row level security;
drop policy if exists campaigns_public_read on campaigns;
create policy campaigns_public_read on campaigns for select using (true);

-- ---------------------------------------------------------------------------
-- 5. Comentarios
-- ---------------------------------------------------------------------------
comment on column specimens.specimen_code is
  'Código de catálogo admin (NEO-…). Filas legacy reciben LEGACY-<id8> hasta reasignar.';
comment on column specimens.media_assets is
  'JSONB de slots Cloudinary del panel; complementa specimen_media + media_url.';
comment on column specimens.pricing is
  '{retail_price, wholesale_price, wholesale_min_qty, currency} — backfill desde precio_menor/mayor.';
comment on column specimens.global_region_id is
  'Espejo de region_id para el contrato admin histórico; fuente de verdad sigue siendo region_id.';
comment on column campaigns.title is
  'Título admin/storefront. Stub live solo tenía name; title se rellena desde name.';

-- ---------------------------------------------------------------------------
-- Cómo aplicar (SQL Editor de Supabase):
--   1. Abrir Project → SQL → New query
--   2. Pegar este archivo completo y Run
--   3. Verificar:
--        select column_name from information_schema.columns
--          where table_name = 'specimens'
--            and column_name in ('specimen_code','attributes','pricing','media_assets','stock_status');
--        select column_name from information_schema.columns
--          where table_name = 'campaigns'
--            and column_name in ('title','banner','starts_at','ends_at','active');
--   4. Cloudinary sync queda FUERA de esta migración (ver resumen en el chat).
-- ============================================================================
