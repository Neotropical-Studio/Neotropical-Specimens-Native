-- ============================================================================
-- 0005 · UNIQUE en taxonomy.species_name — es la columna que en la práctica
-- funciona como "scientific_name" (nombre científico completo, binomial o
-- trinomial, tal como lo muestran app/catalogue/page.tsx y
-- lib/specimens/view.ts). No existía ninguna restricción de unicidad más
-- allá de `id`, así que el sync de Cloudinary la necesita como destino de
-- ON CONFLICT para no duplicar la fila de taxonomía en cada corrida.
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'taxonomy_species_name_key') then
    alter table taxonomy add constraint taxonomy_species_name_key unique (species_name);
  end if;
end $$;
