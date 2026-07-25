-- ============================================================================
-- 0001 · Caché de traducción automática (MT)
-- Guarda traducciones generadas en runtime por lib/i18n/translate.ts para no
-- volver a pagar/pedir la misma cadena. Clave: (target_lang, source_hash).
-- Escritura/lectura sólo vía service_role (backend); sin política pública.
-- ============================================================================

create table if not exists translation_cache (
    id          bigint generated always as identity primary key,
    target_lang text not null,                 -- BCP-47 destino (es, zh-CN, ar…)
    source_lang text not null default 'en',    -- idioma de origen del texto fuente
    source_hash text not null,                 -- hash estable de (source_text + source_lang)
    source_text text not null,                 -- texto original (auditoría/depuración)
    text        text not null,                 -- traducción resultante
    provider    text,                          -- proveedor MT usado (deepl, google, none…)
    created_at  timestamptz not null default timezone('utc'::text, now())
);

-- Búsqueda O(1) de un hit de caché y unicidad por (idioma destino, hash).
create unique index if not exists idx_translation_cache_key
  on translation_cache (target_lang, source_hash);

alter table translation_cache enable row level security;
-- Sin políticas públicas: sólo service_role (que evita RLS) lee/escribe.
