import Link from 'next/link';
import { Bug, ImagePlay, Megaphone, Truck } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const revalidate = 0;

async function loadCounts() {
  const db = getSupabaseAdmin();
  const [specimens, campaigns, shipments, pendingPermits] = await Promise.all([
    db.from('specimens').select('id', { count: 'exact', head: true }),
    db.from('campaigns').select('id', { count: 'exact', head: true }).eq('active', true),
    db.from('shipments').select('id', { count: 'exact', head: true }),
    db.from('shipment_permits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return {
    specimens: specimens.count ?? 0,
    campaigns: campaigns.count ?? 0,
    shipments: shipments.count ?? 0,
    pendingPermits: pendingPermits.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const counts = await loadCounts();

  const cards = [
    { href: '/admin/especimenes', label: 'Especímenes registrados', value: counts.specimens, icon: Bug },
    { href: '/admin/multimedia', label: 'Multimedia gestionable', value: counts.specimens, icon: ImagePlay },
    { href: '/admin/campanas', label: 'Campañas activas', value: counts.campaigns, icon: Megaphone },
    { href: '/admin/embarques', label: 'Embarques registrados', value: counts.shipments, icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Panel Administrativo</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ href, label, value, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-emerald-500/40"
          >
            <Icon className="text-emerald-400" size={20} />
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-sm text-neutral-400">{label}</div>
          </Link>
        ))}
      </div>

      {counts.pendingPermits > 0 && (
        <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200">
          {counts.pendingPermits} permiso(s) pendiente(s) de verificación en embarques.
        </div>
      )}
    </div>
  );
}
