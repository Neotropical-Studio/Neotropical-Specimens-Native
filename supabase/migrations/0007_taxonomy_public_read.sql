-- ============================================================================
-- Fix crítico: `taxonomy` es la tabla real que `specimens` embebe vía
-- PostgREST (taxonomy:taxonomy!taxonomy_id(*)), pero nunca tuvo una policy
-- de lectura pública — a diferencia de families/genera/species/subfamilies/
-- subspecies/specimens/global_regions/specimen_media, que sí la tienen.
-- Resultado: para cualquier visitante anónimo (anon key, el que usa todo el
-- front-end), el embed de taxonomy siempre volvía null, así que el nombre
-- científico, familia, género, etc. nunca se veían en el sitio público
-- aunque el dato sí existiera en la tabla.
-- Idempotente: no falla si ya existe o si RLS ya estaba activo.
-- ============================================================================
alter table public.taxonomy enable row level security;

drop policy if exists "Permitir lectura publica taxonomy" on public.taxonomy;
create policy "Permitir lectura publica taxonomy"
  on public.taxonomy
  for select
  to public
  using (true);
