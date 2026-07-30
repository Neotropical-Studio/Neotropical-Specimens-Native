-- 0008_inventory_spec_alignment.sql
-- Alineación con Documento de Especificaciones (inventario + integridad Cloudinary)
--
-- Objetivos:
--   1) stock_status en specimens (IN_STOCK | OUT_OF_STOCK | PENDING)
--   2) taxonomy.family_name / genus_name NOT NULL (si hay datos, rellenar nulos antes)
--   3) specimen_media.specimen_id ON DELETE CASCADE (idempotente)
--   4) Índice único en specimen_media.public_id (public_id = specimen_id UUID)

-- ── 1. stock_status ──────────────────────────────────────────────────────────
alter table specimens
  add column if not exists stock_status text;

update specimens
set stock_status = 'IN_STOCK'
where stock_status is null;

alter table specimens
  alter column stock_status set default 'PENDING';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'specimens_stock_status_check'
  ) then
    alter table specimens
      add constraint specimens_stock_status_check
      check (stock_status in ('IN_STOCK', 'OUT_OF_STOCK', 'PENDING'));
  end if;
end $$;

-- ── 2. taxonomy: rellenar nulos y endurecer NOT NULL ─────────────────────────
update taxonomy set family_name = 'UNKNOWN' where family_name is null or btrim(family_name) = '';
update taxonomy set genus_name  = 'UNKNOWN' where genus_name  is null or btrim(genus_name)  = '';

alter table taxonomy alter column family_name set not null;
alter table taxonomy alter column genus_name  set not null;

-- ── 3. FK CASCADE specimen_media → specimens ─────────────────────────────────
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

-- ── 4. public_id único (Cloudinary public_id = specimen_id) ──────────────────
create unique index if not exists idx_specimen_media_public_id_key
  on specimen_media (public_id)
  where public_id is not null;

comment on column specimens.stock_status is
  'IN_STOCK | OUT_OF_STOCK | PENDING — especificación inventario centralizado';

comment on column specimen_media.public_id is
  'Debe coincidir con specimens.id (UUID) para evitar fotos sueltas en Cloudinary';
