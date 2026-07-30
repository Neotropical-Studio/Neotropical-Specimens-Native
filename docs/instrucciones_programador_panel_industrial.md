# DOCUMENTACIÓN TÉCNICA: PANEL ADMINISTRATIVO INDUSTRIAL MAESTRO (UPDATE V2)

**Proyecto:** Neotropical Specimens Native  
**Stack real del repo:** Next.js (App Router) + React + Tailwind + Supabase + Cloudinary  
**Admin existente:** `/admin` (auth protegida en `app/admin/(protected)/`)  
**Base maestra (entrega):** `ConsolidatedIndustrialDashboard.jsx` — *aún no versionado en este repo; montar bajo `app/admin/(protected)/industrial/`*

---

## 1. Visión General

Consola maestra de gestión industrial diseñada para ser el **núcleo operativo**. El sistema es **abierto y escalable**.

Arquitectura: **configuración sobre código**. El objeto central:

```text
SISTEMA_UNIVERSAL  →  única fuente de verdad (sin hardcoding de rubros / ejecutivos / perfiles)
```

En producción, `SISTEMA_UNIVERSAL` **no** vive hardcodeado: se inyecta desde Supabase (y opcionalmente Sanity) con una llamada asíncrona.

---

## 2. Sección de Adaptabilidad (Para Futuras Modificaciones)

| Necesidad futura | Qué tocar | Qué NO tocar |
|---|---|---|
| **Nuevos perfiles de cliente** | Añadir objeto a `SISTEMA_UNIVERSAL.perfiles_cliente` | Lógica del motor de segmentación |
| **Ajustar ventas asistidas** | Rubros/atributos en config; el filtro detecta rubros nuevos solo | Reescribir el grid de ventas |
| **Ampliar ejecutivos** | Cambiar `length: 20` → `length: 50` (array dinámico) | KPIs / estados ACTIVO–EN PAUSA |

Principio: **módulos nuevos encima de la Base Maestra**, nunca reescribir el núcleo.

---

## 3. Componentes Clave

| Componente | Responsabilidad |
|---|---|
| **Motor de Segmentación (IA)** | Filtra inventario en tiempo real según `perfilSeleccionado` (Coleccionista, Biólogo, Estudiante, Artesano). |
| **Control de Ejecutivos** | Matriz de N perfiles (`length` configurable) con estado `ACTIVO` / `EN PAUSA` y KPIs. |
| **Pipeline de Ventas Asistidas** | Recomendación de producto según perfil. |
| **`PerfilEjecutivo`** | Extraer a archivo propio si crece la lógica. |
| **`TarjetaVenta`** | Extraer a archivo propio para cards de venta. |

---

## 4. Puntos Críticos para el Programador

### 4.1 Modularidad / UI
- Grid responsivo obligatorio: respetar `grid-cols-2 md:grid-cols-4` (integridad móvil + desktop).
- Dark Mode Industrial (Tailwind) + Lucide React.

### 4.2 Persistencia de Datos
- Estado actual de la entrega: **en memoria**.
- Obligatorio: `useEffect` + `fetch` (o cliente Supabase del repo) hacia el backend definitivo.
- Corto plazo opcional: `localStorage` para metas ACTIVO/EN PAUSA.
- Producción: tabla Supabase + RLS.

### 4.3 Seguridad
- Montar **solo** dentro de `app/admin/(protected)/` (Auth Guard ya existente).
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni `CLOUDINARY_API_SECRET` al browser.

### 4.4 Conexión a datos reales (este repo)

Tablas diagnosticadas (`python scripts/diagnostico_real.py`):

| Tabla | Columnas clave |
|---|---|
| `specimens` | `id`, `species_name`, `media_url`, `taxonomy_id`, `region_id` (+ `stock_status` vía migración 0008) |
| `taxonomy` | `family_name`, `genus_name`, `subfamily_name`, `species_name`, `order_name` |
| `specimen_media` | `specimen_id`, `media_url`, `public_id`, `media_type`, `display_order` |

Tubería de imágenes (sin fotos sueltas): `scripts/processor_industrial.py`  
→ `public_id` Cloudinary = `specimen_id` (UUID); sin match → `revision_humana/` o `--create-pending`.

---

## 5. Compromiso de Calidad

Este código es la **Base Maestra**. Cualquier funcionalidad extra debe construirse **como módulo** sobre esta estructura:

- ❌ No reescribir el núcleo / contrato `SISTEMA_UNIVERSAL`
- ✅ Añadir módulos (PDF, ERP, facturación, barcode, etc.)

*Propietario del Proyecto: Asegurado. Arquitectura: Consolidada (UPDATE V2).*

---

## 6. Variables de Entorno (API Keys)

Copia `.env.example` → `.env.local` en la raíz del repo.

```bash
# Frontend (seguro)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Solo servidor / scripts (NUNCA NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

| Variable | Browser | API routes Next | Scripts Python |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_*` | ✅ | ✅ | URL sí / ANON no |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | ✅ |
| `CLOUDINARY_*` | ❌ | ✅ | ✅ |

```bash
npm run dev                                          # http://localhost:3000/admin
source scripts/.venv/bin/activate
python scripts/diagnostico_real.py                   # columnas reales
python scripts/processor_industrial.py --dry-run     # tubería fotos
```

---

## 7. Roadmap — Siguiente Paso (anotado para el programador)

Estas piezas **no** están en el núcleo V2; se construyen como **módulos encima** de la Base Maestra. Orden sugerido:

| Prioridad | Módulo | Notas de implementación |
|---|---|---|
| **P0** | Inyectar `SISTEMA_UNIVERSAL` desde Supabase | Reemplazar objeto estático; cablear `specimens` + `taxonomy` + ejecutivos/metas. |
| **P0** | Subir `ConsolidatedIndustrialDashboard` al admin protegido | Ruta `/admin/industrial`; Auth Guard del layout existente. |
| **P1** | Persistencia de metas de ejecutivos | Tabla `executive_targets` + RLS; fallback `localStorage`. |
| **P1** | Cola `revision_humana` en UI | Listar flags del processor; aprobar / vincular `specimen_id` / descartar. |
| **P2** | **Lector de códigos de barras / QR** | Input USB-HID o cámara; escanear → lookup `specimens.id` → abrir ficha / disparar ingesta. Ideal para almacén y embarques. |
| **P2** | **Facturación / cotización** | El repo ya tiene pasarelas (WorldFirst / Alipay) y `/admin/embarques`. Módulo: emitir PDF factura/packing list desde specimen + buyer; **no** reescribir el dashboard. |
| **P3** | Generación de PDFs (catálogo / CITES) | Módulo aparte; datos desde `SISTEMA_UNIVERSAL` + `specimen_media`. |
| **P3** | Conexión ERP externo | Adapter (webhook/API); el dashboard solo consume estado normalizado. |
| **P3** | Multi-rubro más allá de Lepidoptera | Nuevos perfiles/rubros solo en config (`perfiles_cliente`), sin tocar el motor. |

### Contrato para módulos futuros

```text
SISTEMA_UNIVERSAL (contrato estable)
        ↑
   adapters / fetch Supabase
        ↑
  [ Dashboard Base Maestra ]
        ↑
  módulos: barcode | facturación | PDF | ERP | revision_humana
```

---

## 8. Kit de entrega (GitHub)

```text
components/admin/ConsolidatedIndustrialDashboard.jsx   # (pendiente de versionar)
docs/instrucciones_programador_panel_industrial.md     # este archivo (UPDATE V2)
.env.example
scripts/diagnostico_real.py
scripts/processor_industrial.py
supabase/migrations/0008_inventory_spec_alignment.sql
```

---

*Siguiente paso operativo recomendado tras montar el dashboard: **barcode → ficha specimen** y **facturación/PDF sobre embarques existentes**.*
