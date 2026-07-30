import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import AdminTable from '@/components/admin/AdminTable';
import { buttonPrimaryClass } from '@/components/admin/FormField';

export const revalidate = 0;

type CampaignRow = {
  id: string;
  title: string;
};

async function loadCampaigns(): Promise<{ campaigns: CampaignRow[]; stub: boolean }> {
  const db = getSupabaseAdmin();

  // Live confirmado: campaigns = stub (id, name). Contrato admin (title/active…) aún no.
  const stub = await db.from('campaigns').select('id, name').order('id');
  if (stub.error) {
    return { campaigns: [], stub: true };
  }

  return {
    campaigns: (stub.data ?? []).map((c) => ({
      id: c.id as string,
      title: (c.name as string | null) ?? 'Sin título',
    })),
    stub: true,
  };
}

export default async function CampanasPage() {
  const { campaigns, stub } = await loadCampaigns();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Campañas y Avisos Audiovisuales</h1>
          <p className="text-sm text-neutral-400">
            Live: tabla stub (<code className="text-xs">id</code>, <code className="text-xs">name</code>).
          </p>
        </div>
        {stub ? (
          <span
            className={`${buttonPrimaryClass} cursor-not-allowed opacity-50`}
            title="Aplica la sección B de espejo_universal_industrial.sql para crear campañas ricas"
          >
            <Plus size={16} /> Nueva campaña
          </span>
        ) : (
          <Link href="/admin/campanas/nueva" className={buttonPrimaryClass}>
            <Plus size={16} /> Nueva campaña
          </Link>
        )}
      </div>

      {stub && (
        <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
          <p className="font-medium">Campañas en modo stub (sin title / fechas / banner).</p>
          <p className="mt-1 text-amber-200/90">
            Para el formulario completo, pega la sección B de{' '}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
              supabase/sql/espejo_universal_industrial.sql
            </code>{' '}
            en el SQL Editor. Mientras tanto solo se listan nombres.
          </p>
        </div>
      )}

      <AdminTable
        columns={['Nombre']}
        empty={campaigns.length ? undefined : 'No hay campañas registradas.'}
      >
        {campaigns.map((c) => (
          <tr key={c.id} className="hover:bg-neutral-900/60">
            <td className="px-4 py-2 text-neutral-200">{c.title}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
