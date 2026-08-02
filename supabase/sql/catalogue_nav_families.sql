-- Catálogo editable: familias / taxones de navegación (orden, crear, renombrar, desactivar).
-- Si no hay filas para región+categoría, el código usa EXPECTED_* de roots.ts.
-- Ejecutar en Supabase SQL Editor (Production).

create table if not exists public.catalogue_nav_families (
  id uuid primary key default gen_random_uuid(),
  region_id text not null,
  category_id text not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (region_id, category_id, label)
);

create index if not exists catalogue_nav_families_scope_idx
  on public.catalogue_nav_families (region_id, category_id, sort_order);

alter table public.catalogue_nav_families enable row level security;

-- Solo service_role (admin API). Sin políticas públicas de escritura.
drop policy if exists catalogue_nav_families_service_all on public.catalogue_nav_families;

comment on table public.catalogue_nav_families is
  'Familias de catálogo storefront (orden/CRUD). Cloudinary folder = label.';
