-- ============================================================================
-- 0004 · Restricciones únicas + índices de FK para el pipeline de
-- sincronización masiva Cloudinary → Supabase.
--
-- Auditoría previa (2026-07-28, supabase db query --linked) encontró que
-- families/subfamilies/genera/species/subspecies/global_regions/specimens/
-- specimen_media sólo tenían UNIQUE en `id` (primary key). Los índices
-- idx_*_name existentes son btree normales, NO unique: no sirven como
-- destino de `ON CONFLICT` ni evitan duplicados. Sin esto, cada corrida del
-- script de sync haría INSERT puro y multiplicaría cada fila.
--
-- También se confirmó que specimen_media.specimen_id nunca tuvo foreign key
-- (por eso PostgREST no puede embeber `specimen_media(*)` en /catalogue ni en
-- SPECIMEN_SELECT — ver lib/specimens/view.ts).
--
-- Nota de drift: supabase_migrations.schema_migrations no existe en la BD
-- viva, es decir 0001/0002/0003 nunca quedaron registradas como aplicadas
-- vía `supabase db push` (0002 en particular: specimens.sanity_id y
-- taxonomy.sanity_id NO existen hoy en producción, pese al archivo). Esta
-- migración se aplica de forma directa e idempotente (IF NOT EXISTS / DO
-- blocks) para no depender de ese historial roto.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. UNIQUE constraints en las columnas de nombre real de cada nivel
--    taxonómico (no existe `scientific_name` ni `code`: el esquema vivo usa
--    family_name / subfamily_name / genus_name / species_name /
--    subspecies_name / region_name — ver auditoría de columnas).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'families_family_name_key') then
    alter table families add constraint families_family_name_key unique (family_name);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'subfamilies_subfamily_name_key') then
    alter table subfamilies add constraint subfamilies_subfamily_name_key unique (subfamily_name);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'genera_genus_name_key') then
    alter table genera add constraint genera_genus_name_key unique (genus_name);
  end if;

  -- El epíteto específico se repite entre géneros distintos (p.ej. "rufa" en
  -- varios géneros): la unicidad real es (genus_id, species_name).
  if not exists (select 1 from pg_constraint where conname = 'species_genus_id_species_name_key') then
    alter table species add constraint species_genus_id_species_name_key unique (genus_id, species_name);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'subspecies_species_id_subspecies_name_key') then
    alter table subspecies add constraint subspecies_species_id_subspecies_name_key unique (species_id, subspecies_name);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'global_regions_region_name_key') then
    alter table global_regions add constraint global_regions_region_name_key unique (region_name);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. UNIQUE en multimedia — media_url/public_id identifican un asset físico
--    único de Cloudinary; sin esto, resubir el mismo folder duplica filas.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'specimen_media_media_url_key') then
    alter table specimen_media add constraint specimen_media_media_url_key unique (media_url);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'specimens_media_url_key') then
    alter table specimens add constraint specimens_media_url_key unique (media_url);
  end if;
end $$;

-- public_id es el identificador estable de Cloudinary (media_url puede variar
-- con transformaciones); único cuando está presente.
create unique index if not exists idx_specimen_media_public_id_key
  on specimen_media (public_id)
  where public_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Foreign key ausente: specimen_media.specimen_id → specimens.id.
--    Tabla vacía hoy (0 filas) → sin riesgo de violación al aplicar.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'specimen_media_specimen_id_fkey') then
    alter table specimen_media
      add constraint specimen_media_specimen_id_fkey
      foreign key (specimen_id) references specimens(id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Índices de rendimiento en FKs sin índice (specimens.taxonomy_id/
--    region_id y taxonomy.species_id no tenían ninguno).
-- ---------------------------------------------------------------------------
create index if not exists idx_specimens_taxonomy_id on specimens (taxonomy_id);
create index if not exists idx_specimens_region_id    on specimens (region_id);
create index if not exists idx_taxonomy_species_id    on taxonomy (species_id);
