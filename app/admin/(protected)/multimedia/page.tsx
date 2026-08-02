// Multimedia & 3D — sección del admin.
// Sección 1: Galería clasificada con filtros por tipo, rubro, familia, especie.
// Sección 2: Tabla de especímenes para edición manual de slots individuales.
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { SPECIMEN_SELECT, toSpecimenView, type SpecimenRow } from '@/lib/specimens/view';
import AdminTable from '@/components/admin/AdminTable';
import MediaGalleryLoader from './MediaGalleryLoader';

export const revalidate = 0;

async function loadSpecimens() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('created_at', { ascending: false })
    .limit(400);
  if (error) throw error;
  return (data ?? []) as SpecimenRow[];
}

export default async function MultimediaPickerPage() {
  const rows      = await loadSpecimens();
  const specimens = rows.map(toSpecimenView);

  return (
    <div className="flex flex-col gap-10">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Multimedia y Estudio 3D</h1>
          <p className="text-sm text-neutral-400">
            Galería clasificada · filtros por tipo, rubro, familia y especie.
          </p>
          <p className="mt-2 max-w-2xl rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-[12px] leading-relaxed text-emerald-200/95">
            <strong className="text-emerald-300">Modo automático ON:</strong> al GRABAR foto de
            espécimen se hace solo cutout + nitidez + peso bajo. Video Blender → MP4/HLS
            liviano. 3D (.glb) se etiqueta y guarda. También podés soltar archivos en{' '}
            <code className="text-emerald-100">hot_folder/</code> y correr{' '}
            <code className="text-emerald-100">python scripts/auto_studio_daemon.py</code> sin
            mirar la pantalla.
          </p>
        </div>
        <Link
          href="/admin/ingesta"
          className="shrink-0 rounded-lg border border-emerald-700 bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900/60"
        >
          + Ingesta masiva
        </Link>
      </div>

      {/* ── Galería con filtros (client component) ─────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Galería de activos
        </h2>
        <MediaGalleryLoader />
      </section>

      {/* ── Tabla de especímenes para edición manual ───────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Gestión manual por espécimen
        </h2>
        <AdminTable
          columns={['Código', 'Especie', 'Fotos', 'Video', 'Modelo 3D']}
          empty={specimens.length ? undefined : 'No hay especímenes registrados.'}
        >
          {specimens.map((s) => (
            <tr key={s.id} className="hover:bg-neutral-900/60">
              <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                <Link href={`/admin/multimedia/${s.id}`} className="text-neutral-300 hover:text-emerald-400">
                  {s.code}
                </Link>
              </td>
              <td className="px-4 py-2 italic text-neutral-200">{s.scientificName}</td>
              <td className="px-4 py-2 text-neutral-400">{s.images.length}</td>
              <td className="px-4 py-2 text-neutral-400">{s.video ? 'Sí' : '—'}</td>
              <td className="px-4 py-2 text-neutral-400">{s.model3d ? 'Sí' : '—'}</td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
