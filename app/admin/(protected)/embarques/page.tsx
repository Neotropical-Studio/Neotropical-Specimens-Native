import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import AdminTable from '@/components/admin/AdminTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { buttonPrimaryClass } from '@/components/admin/FormField';

export const revalidate = 0;

async function loadShipments() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('shipments')
    .select('id, shipment_code, shipment_type, status, destination_country, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default async function EmbarquesPage() {
  const shipments = await loadShipments();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Documentos, Trámites Legales y Logística</h1>
          <p className="text-sm text-neutral-400">Embarques, permisos oficiales y códigos de trazabilidad QR.</p>
        </div>
        <Link href="/admin/embarques/nuevo" className={buttonPrimaryClass}>
          <Plus size={16} /> Nuevo embarque
        </Link>
      </div>

      <AdminTable
        columns={['Código', 'Tipo', 'Destino', 'Estado', 'Creado']}
        empty={shipments.length ? undefined : 'No hay embarques registrados.'}
      >
        {shipments.map((s) => (
          <tr key={s.id} className="hover:bg-neutral-900/60">
            <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
              <Link href={`/admin/embarques/${s.id}`} className="text-neutral-300 hover:text-emerald-400">
                {s.shipment_code}
              </Link>
            </td>
            <td className="px-4 py-2 text-neutral-400">
              {s.shipment_type === 'export' ? 'Exportación' : 'Importación'}
            </td>
            <td className="px-4 py-2 text-neutral-400">{s.destination_country ?? '—'}</td>
            <td className="px-4 py-2">
              <StatusBadge status={s.status} />
            </td>
            <td className="px-4 py-2 text-neutral-400">{new Date(s.created_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
