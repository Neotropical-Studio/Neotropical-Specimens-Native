-- ============================================================================
-- 0006 · Subfamilia opcional en la cadena taxonómica.
--
-- Motivo: la estructura real de carpetas en Cloudinary (auditada el
-- 2026-07-28) no siempre tiene un nivel de subfamilia — bajo
-- "CATALOGUE Butterflies (Lepidoptera)" los nombres de familia clásicos
-- (MORPHIDAE, BRASSOLIDAE, DANAIDAE, HELICONIDAE, ITHOMIDAE, SATYRIDAE...)
-- están como carpetas hermanas planas, sin una subcarpeta "-inae" debajo.
-- Exigir subfamilia siempre habría marcado como `unclassified` cada
-- espécimen real de esa rama.
--
-- `genera` sólo tenía `subfamily_id` (NOT NULL en la práctica, sin
-- alternativa): si se deja la carpeta sin subfamilia, el género quedaría sin
-- ningún camino de vuelta a su familia. Se agrega `family_id` opcional para
-- que el género pueda enlazar DIRECTO a su familia cuando no hay subfamilia
-- real en la carpeta, sin inventar una subfamilia -inae que no existe.
--
-- Invariante aplicada con un CHECK: todo género debe tener subfamily_id O
-- family_id (nunca ambos null) — ningún nivel puede quedar suelto, subespecie
-- y ahora subfamilia son las dos únicas ramas opcionales de la cadena.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'genera' and column_name = 'family_id'
  ) then
    alter table genera add column family_id uuid references families(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_genera_family_id on genera (family_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'genera_subfamily_or_family_chk') then
    alter table genera
      add constraint genera_subfamily_or_family_chk
      check (subfamily_id is not null or family_id is not null);
  end if;
end $$;
