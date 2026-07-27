import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { SPECIMEN_SELECT, toSpecimenView, type SpecimenRow } from '@/lib/specimens/view';
import AdminTable from '@/components/admin/AdminTable';

export const revalidate = 0;

async function loadSpecimens() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as SpecimenRow[];
}

export default async function MultimediaPickerPage() {
  const rows = await loadSpecimens();
  const specimens = rows.map(toSpecimenView);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Multimedia y Estudio 3D</h1>
        <p className="text-sm text-neutral-400">Elige un espécimen para gestionar sus fotos, video y modelo 3D.</p>
      </div>

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
    </div>
  );
}
