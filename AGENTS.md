# AGENTS.md

## Cursor Cloud specific instructions

### Scope: lista de especímenes en el catálogo

Para **crear / ordenar / renombrar / activar** la lista de familias (navegación del catálogo de especímenes secos):

1. Arrancar la app: `pnpm dev` (Node **24.x**, `pnpm@9` — ver `.nvmrc` / `package.json`).
2. Abrir admin: `/admin/especimenes` → sección **«Consola taxonomía · familias»** (`#clasificacion-familias`).
3. Elegir **Región** + **Categoría**.
4. Pulsar **«Activar edición»** (persiste la lista en Cloudinary meta o Supabase). Sin este paso, create/update/delete fallan con *«Lista aún no guardada…»*.
5. Añadir familias, reordenar ↑↓, **Colocar** en otra región/categoría, o sync desde carpetas Cloudinary.

Fichas de especie (CRUD inventario): misma página, ancla `#fichas-especies`, o `/admin/especimenes/[id]`.

Storefront del catálogo: `/[lang]/catalogue/...` (datos vivos Supabase + media Cloudinary).

### Servicios mínimos

| Servicio | Rol |
|---|---|
| Next.js (`pnpm dev`) | Storefront + admin + APIs |
| Supabase | `specimens`, `specimen_media`, nav familias |
| Cloudinary | Árbol canónico `RUBROS/...` + meta de listas |

Comandos estándar: `package.json` scripts (`lint`, `typecheck`, `dev`, `sync:cloudinary*`). Path canónico Cloudinary: `supabase/sql/README.md`.

### Gotchas

- **No desinstalar** `node_modules` ni paquetes salvo fallo claro de instalación; preferir `pnpm install` idempotente.
- En Cloud Agent, si `node -v` no es 24.x, anteponer el bin de nvm: `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` (o `nvm use` tras cargar `nvm.sh`).
- Sin `SUPABASE_SERVICE_ROLE_KEY` el admin de fichas no carga. Sin `CLOUDINARY_*` no se puede activar/guardar la lista de familias ni sync.
- No usar carpetas `_PENDING`, `CATALOGUE_*`, ni dumps en raíz; espejo en `/admin/espejo`.
