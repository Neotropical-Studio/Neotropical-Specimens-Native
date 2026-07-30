import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import AdminTable from '@/components/admin/AdminTable';
import { buttonPrimaryClass } from '@/components/admin/FormField';

export const revalidate = 0;

type ShipmentRow = {
  id: string;
  tracking_code: string | null;
  created_at: string | null;
};

async function loadShipments(): Promise<{ rows: ShipmentRow[]; stub: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  // Live confirmado: shipments = stub (id, tracking_code, created_at).
  const { data, error } = await db
    .from('shipments')
    .select('id, tracking_code, created_at')
    .order('created_at', { ascending: false });

  if (error) return { rows: [], stub: true, error: error.message };
  return { rows: (data ?? []) as ShipmentRow[], stub: true };
}

export default async function EmbarquesPage() {
  const { rows, stub, error } = await loadShipments();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Documentos, Trámites Legales y Logística</h1>
          <p className="text-sm text-neutral-400">
            Live: stub (<code className="text-xs">tracking_code</code>). Sin shipment_items / estados.
          </p>
        </div>
        <span
          className={`${buttonPrimaryClass} cursor-not-allowed opacity-50`}
          title="Schema de logística incompleto en live"
        >
          <Plus size={16} /> Nuevo embarque
        </span>
      </div>

      {stub && (
        <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
          <p className="font-medium">Logística en modo stub.</p>
          <p className="mt-1 text-amber-200/90">
            Faltan columnas admin (<code className="text-xs">shipment_code</code>, status, …) y la
            tabla <code className="text-xs">shipment_items</code>. No se crean embarques desde el
            admin hasta ampliar el schema. Listado solo lectura.
          </p>
          {error ? <p className="mt-2 font-mono text-xs text-amber-300/80">{error}</p> : null}
        </div>
      )}

      <AdminTable
        columns={['Tracking', 'Creado']}
        empty={rows.length ? undefined : 'No hay embarques registrados.'}
      >
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-neutral-900/60">
            <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-neutral-300">
              <Link href={`/admin/embarques/${s.id}`} className="hover:text-emerald-400">
                {s.tracking_code ?? s.id.slice(0, 8)}
              </Link>
            </td>
            <td className="px-4 py-2 text-neutral-400">
              {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
