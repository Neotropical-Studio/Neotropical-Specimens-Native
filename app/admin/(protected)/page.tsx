import Link from 'next/link';
import { Bug, ImagePlay, Megaphone, Truck } from 'lucide-react';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/client';
import AdminStructurePanel from '@/components/admin/AdminStructurePanel';

export const revalidate = 0;

async function loadCounts() {
  if (!isSupabaseAdminConfigured()) {
    return { specimens: 0, campaigns: 0, shipments: 0 };
  }
  try {
    const db = getSupabaseAdmin();
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
  } catch {
    return { specimens: 0, campaigns: 0, shipments: 0 };
  }
}

export default async function AdminDashboardPage() {
  const counts = await loadCounts();
  const missingServiceRole = !isSupabaseAdminConfigured();

  const cards = [
    { href: '/admin/especimenes', label: 'Especímenes registrados', value: counts.specimens, icon: Bug },
    { href: '/admin/multimedia', label: 'Multimedia gestionable', value: counts.specimens, icon: ImagePlay },
    { href: '/admin/campanas', label: 'Campañas', value: counts.campaigns, icon: Megaphone },
    { href: '/admin/embarques', label: 'Embarques registrados', value: counts.shipments, icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-8">
      {missingServiceRole ? (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-50">
          <p className="font-semibold text-amber-100">
            Falta SUPABASE_SERVICE_ROLE_KEY en Vercel (Production)
          </p>
          <p className="mt-2 text-amber-100/90">
            Sin esa variable no funcionan fichas, campañas, embarques ni Discover/Apply. La
            contraseña de login ya está bien — esto es configuración del servidor.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-amber-50/95">
            <li>
              Vercel → equipo <strong>neotropicalspecimens</strong> → proyecto{' '}
              <strong>neotropicalspecimens-native</strong>
            </li>
            <li>
              Settings → Environment Variables → Key{' '}
              <code className="text-amber-100">SUPABASE_SERVICE_ROLE_KEY</code>
            </li>
            <li>
              Value = clave <code className="text-amber-100">service_role</code> (Legacy) de
              Supabase → Environments: <strong>Production</strong> → Save
            </li>
            <li>Deployments → Redeploy del Production</li>
          </ol>
          <p className="mt-3">
            Mientras tanto puedes subir cards:{' '}
            <Link href="/admin/espejo" className="font-medium text-sky-300 underline">
              Ir a Espejo → Node Media (_card / _video)
            </Link>
          </p>
        </div>
      ) : null}

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

      <AdminStructurePanel />

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
