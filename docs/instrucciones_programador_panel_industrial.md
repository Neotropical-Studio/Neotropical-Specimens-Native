# DOCUMENTO DE ESPECIFICACIONES TÉCNICAS
# PANEL DE INTELIGENCIA Y GESTIÓN OPERATIVA (UPDATE V3 — alineado al repo)

**Proyecto:** Neotropical Specimens Native  
**Propietario:** House Insects of Peru / Neotropical Specimens  
**Estado:** Base lista para codificar — conectar a Supabase real, no inventar columnas

---

## 1. Visión General

Dashboard administrativo de **gestión autónoma** para distribución de especímenes biológicos.

Debe permitir:
- Visualización de datos industriales por área
- Gestión de inventarios (integridad Supabase ↔ Cloudinary)
- Control de métricas de rendimiento por área / ejecutivo

Arquitectura: **configuración sobre código**.

| Objeto maestro | Rol |
|---|---|
| `SISTEMA_UNIVERSAL` | Perfiles de cliente, ventas asistidas, ejecutivos (Panel Industrial Maestro V2) |
| `ESTRUCTURA_EQUIPOS` | Áreas operativas (ej. `BIO_SECO`, `ESQUELETOS`) + potencial económico, ítems prioritarios, acciones sugeridas |

Ambos se inyectan desde Supabase en producción (no hardcode en prod).

---

## 2. Tecnologías (Stack — este repositorio)

| Capa | Spec original | **Usar en este repo** |
|---|---|---|
| Frontend | React + Vite | **Next.js App Router** (React 18+) ya montado |
| Estilos | Tailwind CSS | Tailwind (Dark Mode Industrial) |
| Iconos | lucide-react | lucide-react (ya en admin) |
| UI kit | shadcn/ui opcional | Opcional; no bloquear entrega |
| Backend | Supabase Auth + PostgreSQL | Supabase (ya conectado) |
| Media | — | Cloudinary (`background_removal=cloudinary_ai`) |
| Auth admin | Auth Guard | `app/admin/(protected)/` + login existente |

> No crear un proyecto Vite paralelo. Extender `/admin`.

---

## 3. Funcionalidades Requeridas

### A. Panel de Inteligencia (Dashboard Central)

1. **`ESTRUCTURA_EQUIPOS`** — objeto maestro de áreas, por ejemplo:

```js
const ESTRUCTURA_EQUIPOS = {
  BIO_SECO: {
    label: 'Biología Seca / Lepidoptera',
    potencial_economico: 0,      // calcular desde specimens + precios
    items_prioritarios: [],      // desde Supabase
    acciones_sugeridas: [],
  },
  ESQUELETOS: {
    label: 'Esqueletos / Osteología',
    potencial_economico: 0,
    items_prioritarios: [],
    acciones_sugeridas: [],
  },
  // escalar: añadir clave, no reescribir el dashboard
};
```

2. **Navegación dinámica:** sidebar de áreas; al seleccionar, el main se actualiza **sin recargar** (`useState` área activa).
3. **Visualización:** potencial económico, ítems prioritarios, acciones sugeridas por área.

### B. Gestión Industrial (Backend & BD)

#### Esquema — mapear a columnas **reales** (no inventar)

| Spec (ideal) | **Columna real en este proyecto** |
|---|---|
| `specimens.name` | `specimens.species_name` |
| `specimens.stock_quantity` | Usar `stock_status` (`IN_STOCK` / `OUT_OF_STOCK` / `PENDING`) vía migración `0008`; cantidad exacta = pendiente de columna o metadata |
| `specimens.image_url` | `specimens.media_url` + `specimen_media.media_url` |
| `specimens.taxonomy_id` | `specimens.taxonomy_id` ✅ |
| `taxonomy.family_name` / `genus_name` | ✅ (+ `subfamily_name`, `species_name`, `order_name`) |

Verificación en vivo:

```bash
source scripts/.venv/bin/activate
python scripts/diagnostico_real.py
```

#### Consola de Sincronización

Módulo que compare:
- Filas en `specimens` / `specimen_media` (Supabase)
- Assets en Cloudinary (`public_id` debe = `specimen_id` UUID)

Regla no negociable: **sin fotos sueltas**. Ver `scripts/processor_industrial.py`.

### C. Módulos de Operaciones (Pipeline) — 4 vistas

| Vista spec | Ruta / ubicación en este repo | Estado |
|---|---|---|
| **1. Dashboard Central** | `/admin` + futuro `/admin/industrial` | Parcial — extender con `ESTRUCTURA_EQUIPOS` |
| **2. Taxonomía** | `/admin/especimenes` | Existe — enriquecer CRUD taxonomy |
| **3. Motor de Ingesta** | `/admin/ingesta` + scripts Python hot_folder | Existe |
| **4. Control Aduanero** | `/admin/embarques` (VUCE, SUNAT, SERFOR, CITES) | Existe — enriquecer seguimiento expedientes |

Sidebar del admin debe navegar estas 4 sin full page reload innecesario (Next Link + layout compartido).

---

## 4. Requisitos de Calidad (No negociables)

| Requisito | Detalle |
|---|---|
| **Responsive** | Tailwind; grids tipo `grid-cols-2 md:grid-cols-4` |
| **Modularidad** | Cada área = componente independiente |
| **Feedback** | Estados `loading` + `try/catch` en toda llamada Supabase |
| **Estética** | Industrial Dark Mode; monoespaciadas en métricas; acento esmeralda / verde industrial |
| **Auth** | Solo dentro de `(protected)`; sin service role en el browser |
| **Integridad media** | `public_id` Cloudinary = `specimen_id`; flags → `revision_humana/` |

---

## 5. Entregables Esperados

- [ ] Repo funcional con `.env.local` (desde `.env.example`)
- [ ] Conexión exitosa a Supabase (anon en cliente, service role solo server/scripts)
- [ ] Dashboard con `ESTRUCTURA_EQUIPOS` + sidebar de áreas
- [ ] 4 vistas de navegación cableadas (o enlazadas al admin existente)
- [ ] Consola de sincronización Cloudinary ↔ `specimen_media`
- [ ] Código documentado en llamadas API
- [ ] Migración `0008_inventory_spec_alignment.sql` aplicada en el proyecto Supabase

---

## 6. Variables de Entorno (API Keys)

**Supabase → Settings → API**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # browser + RLS
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # SOLO servidor / scripts Python
```

**Cloudinary** (ingesta / API routes)

```bash
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...                  # NUNCA NEXT_PUBLIC_
```

Arranque:

```bash
cp .env.example .env.local   # completar keys
npm install && npm run dev
# Admin: http://localhost:3000/admin
```

Si **aún no** hay tablas: aplicar migraciones en `supabase/migrations/` (incl. `0008`).  
Si **ya** hay instancia: usar keys reales + `diagnostico_real.py` (no recrear esquema a ciegas).

---

## 7. Roadmap — Siguiente Paso (módulos, no reescritura)

| Prioridad | Módulo |
|---|---|
| P0 | Montar dashboard inteligencia + `ESTRUCTURA_EQUIPOS` en `/admin/industrial` |
| P0 | Inyectar datos desde Supabase (reemplazar mock) |
| P1 | Consola sync Cloudinary ↔ DB |
| P1 | Cola UI `revision_humana` |
| P2 | Lector códigos de barras/QR → ficha `specimen_id` |
| P2 | Facturación / PDF packing list sobre `/admin/embarques` |
| P3 | ERP externo, PDFs CITES, multi-rubro |

---

## 8. Kit de archivos

```text
docs/instrucciones_programador_panel_industrial.md   # este documento (V3)
app/admin/(protected)/                               # shell auth + 4 módulos
scripts/diagnostico_real.py
scripts/processor_industrial.py
supabase/migrations/0008_inventory_spec_alignment.sql
.env.example
```

---

**Para el programador:** con esto tienes la arquitectura para empezar hoy. Usa el admin Next.js existente, las columnas reales de Supabase y la tubería `processor_industrial.py`. No crees un Vite app paralelo ni columnas (`name`, `image_url`, `stock_quantity`) que no existen en la BD live sin una migración explícita.
