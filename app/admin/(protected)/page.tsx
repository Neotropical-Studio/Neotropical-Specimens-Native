import Link from 'next/link';
import { Bug, ImagePlay, Megaphone, Truck } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import RubrosRegionesPanel from '@/components/admin/RubrosRegionesPanel';

export const revalidate = 0;

async function loadCounts() {
  const db = getSupabaseAdmin();
  // Live: campaigns stub (sin `active`); shipment_permits stub (sin `status`).
  const [specimens, campaigns, shipments] = await Promise.all([
    db.from('specimens').select('id', { count: 'exact', head: true }),
    db.from('campaigns').select('id', { count: 'exact', head: true }),
    db.from('shipments').select('id', { count: 'exact', head: true }),
  ]);

  return {
    specimens: specimens.count ?? 0,
    campaigns: campaigns.count ?? 0,
    shipments: shipments.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const counts = await loadCounts();

  const cards = [
    { href: '/admin/especimenes', label: 'Especímenes registrados', value: counts.specimens, icon: Bug },
    { href: '/admin/multimedia', label: 'Multimedia gestionable', value: counts.specimens, icon: ImagePlay },
    { href: '/admin/campanas', label: 'Campañas', value: counts.campaigns, icon: Megaphone },
    { href: '/admin/embarques', label: 'Embarques registrados', value: counts.shipments, icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Panel Administrativo</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Ahora: rubro 1 (especímenes secos) × todas las regiones · luego esqueletos y plantas
          </p>
        </div>
        <Link
          href="/admin/espejo"
          className="text-sm text-sky-400 underline-offset-2 hover:underline"
        >
          Espejo Cloudinary ↔ Supabase →
        </Link>
      </div>

      {/* 1º — estructura principal */}
      <RubrosRegionesPanel />

      {/* 2º — KPIs operativos */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-400">2º · Inventario y operaciones</h2>
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
      </div>
    </div>
  );
}
