import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { SPECIMEN_SELECT, toSpecimenView, type SpecimenRow } from '@/lib/specimens/view';
import AdminTable from '@/components/admin/AdminTable';
import { buttonPrimaryClass } from '@/components/admin/FormField';

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

export default async function EspecimenesPage() {
  const rows = await loadSpecimens();
  const specimens = rows.map(toSpecimenView);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Taxonomía y Datos</h1>
          <p className="text-sm text-neutral-400">Inventario de especímenes, precios y calidad.</p>
        </div>
        <Link href="/admin/especimenes/nuevo" className={buttonPrimaryClass}>
          <Plus size={16} /> Nuevo espécimen
        </Link>
      </div>

      <AdminTable
        columns={['Código', 'Especie', 'Región', 'Grado', 'Precio', 'Stock']}
        empty={specimens.length ? undefined : 'Todavía no hay especímenes registrados.'}
      >
        {specimens.map((s) => (
          <tr key={s.id} className="hover:bg-neutral-900/60">
            <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-neutral-300">
              <Link href={`/admin/especimenes/${s.id}`} className="hover:text-emerald-400">
                {s.code}
              </Link>
            </td>
            <td className="px-4 py-2 italic text-neutral-200">{s.scientificName}</td>
            <td className="px-4 py-2 text-neutral-400">{s.regionCode ?? '—'}</td>
            <td className="px-4 py-2 text-neutral-400">{s.grade ?? '—'}</td>
            <td className="px-4 py-2 text-neutral-400">{s.price != null ? `${s.price} ${s.currency}` : '—'}</td>
            <td className="px-4 py-2 text-neutral-400">{s.stock}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
