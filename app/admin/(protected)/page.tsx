import Link from 'next/link';
import { Bug, ImagePlay, Megaphone, Truck } from 'lucide-react';
import {
  getSupabaseAdmin,
  getSupabaseAdminConfigStatus,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/client';
import AdminStructurePanel from '@/components/admin/AdminStructurePanel';
import AdminModulesProbe from '@/components/admin/AdminModulesProbe';
import PublishProductionButton from '@/components/admin/PublishProductionButton';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

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
  const cfg = getSupabaseAdminConfigStatus();
  const missingServiceRole = !cfg.hasUrl || !cfg.hasServiceRole;

  const cards = [
    { href: '/admin/especimenes', label: 'Especímenes registrados', value: counts.specimens, icon: Bug },
    { href: '/admin/multimedia', label: 'Multimedia gestionable', value: counts.specimens, icon: ImagePlay },
    { href: '/admin/campanas', label: 'Campañas', value: counts.campaigns, icon: Megaphone },
    { href: '/admin/embarques', label: 'Embarques registrados', value: counts.shipments, icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PublishProductionButton variant="panel" />
      {missingServiceRole ? (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-50">
          <p className="font-semibold text-amber-100">
            El servidor no ve SUPABASE_SERVICE_ROLE_KEY en runtime
          </p>
          <p className="mt-2 text-amber-100/90">
            Esto no es la contraseña de login. Es la variable de entorno de Vercel Production.
          </p>
          <p className="mt-2 rounded bg-black/30 px-2 py-1.5 font-mono text-[11px] text-amber-200">
            Diagnóstico: URL={cfg.hasUrl ? 'OK' : 'FALTA'} · ANON={cfg.hasAnon ? 'OK' : 'FALTA'} ·
            SERVICE_ROLE={cfg.hasServiceRole ? `OK (${cfg.serviceRoleLen} chars)` : 'FALTA'} · JWT=
            {cfg.serviceRoleLooksLikeJwt ? 'OK' : 'NO (debe empezar eyJ)'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-2 text-xs text-emerald-200">
          SERVICE_ROLE detectada ({cfg.serviceRoleLen} chars) · admin DB listo
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Panel Administrativo</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Probá cada módulo abajo · chips de familias/categorías ya abren el catálogo
          </p>
        </div>
        <Link
          href="/admin/espejo"
          className="text-sm text-sky-400 underline-offset-2 hover:underline"
        >
          Espejo Cloudinary ↔ Supabase →
        </Link>
      </div>

      <AdminModulesProbe />

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
