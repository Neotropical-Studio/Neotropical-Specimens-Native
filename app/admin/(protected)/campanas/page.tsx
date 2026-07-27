import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import AdminTable from '@/components/admin/AdminTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { buttonPrimaryClass } from '@/components/admin/FormField';

export const revalidate = 0;

async function loadCampaigns() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('campaigns')
    .select('id, title, discount_percent, starts_at, ends_at, active, priority')
    .order('priority', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function computeStatus(c: { active: boolean; starts_at: string; ends_at: string }): string {
  if (!c.active) return 'cancelled';
  const now = new Date();
  if (now < new Date(c.starts_at)) return 'pending';
  if (now > new Date(c.ends_at)) return 'delivered'; // reutiliza el verde "cerrada"
  return 'ready';
}

export default async function CampanasPage() {
  const campaigns = await loadCampaigns();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Campañas y Avisos Audiovisuales</h1>
          <p className="text-sm text-neutral-400">Cintillos, descuentos por temporada y ventanas de activación.</p>
        </div>
        <Link href="/admin/campanas/nueva" className={buttonPrimaryClass}>
          <Plus size={16} /> Nueva campaña
        </Link>
      </div>

      <AdminTable
        columns={['Título', 'Descuento', 'Activación', 'Cierre', 'Estado']}
        empty={campaigns.length ? undefined : 'No hay campañas registradas.'}
      >
        {campaigns.map((c) => (
          <tr key={c.id} className="hover:bg-neutral-900/60">
            <td className="px-4 py-2 text-neutral-200">
              <Link href={`/admin/campanas/${c.id}`} className="hover:text-emerald-400">
                {c.title}
              </Link>
            </td>
            <td className="px-4 py-2 text-neutral-400">{c.discount_percent ? `${c.discount_percent}%` : '—'}</td>
            <td className="px-4 py-2 text-neutral-400">{new Date(c.starts_at).toLocaleString()}</td>
            <td className="px-4 py-2 text-neutral-400">{new Date(c.ends_at).toLocaleString()}</td>
            <td className="px-4 py-2">
              <StatusBadge status={computeStatus(c)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
