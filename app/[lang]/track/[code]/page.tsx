// Página pública de rastreo — el destino del QR de trazabilidad generado en
// /admin/embarques (Sección 4). Lee con getSupabaseAdmin() y proyecta SÓLO
// columnas seguras para el público: nada de precios, cliente ni notas
// internas, aunque la tabla `shipments` en sí no tenga política RLS pública.
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import PermitSeal, { type PermitCode } from '@/components/PermitSeal';
import StatusBadge from '@/components/admin/StatusBadge';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getI18n } from '@/lib/i18n/index';

export const revalidate = 0;

async function loadShipment(code: string) {
  const db = getSupabaseAdmin();
  const { data: shipment, error } = await db
    .from('shipments')
    .select('id, shipment_code, status, destination_country, carrier, tracking_number, created_at')
    .eq('shipment_code', code)
    .maybeSingle();
  if (error) throw error;
  if (!shipment) return null;

  const { data: permits } = await db
    .from('shipment_permits')
    .select('permit_code, status')
    .eq('shipment_id', shipment.id);

  return { shipment, permits: permits ?? [] };
}

export default async function TrackShipmentPage({
  params,
}: {
  params: Promise<{ lang: string; code: string }>;
}) {
  const { lang, code } = await params;
  const i18n = await getI18n(lang);
  const result = await loadShipment(code);
  if (!result) notFound();
  const { shipment, permits } = result;

  return (
    <>
      <Header strings={i18n.strings} lang={i18n.locale} locales={i18n.enabledLocales} />
      <main className="min-h-screen bg-surface pt-[104px] text-text-dynamic">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="text-2xl font-bold">Rastreo de embarque</h1>
          <p className="mt-1 font-mono text-sm text-neutral-400">{shipment.shipment_code}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-sm">
            <div>
              <p className="text-neutral-500">Estado</p>
              <StatusBadge status={shipment.status} />
            </div>
            <div>
              <p className="text-neutral-500">Destino</p>
              <p className="text-neutral-200">{shipment.destination_country ?? '—'}</p>
            </div>
            <div>
              <p className="text-neutral-500">Transportista</p>
              <p className="text-neutral-200">{shipment.carrier ?? '—'}</p>
            </div>
            <div>
              <p className="text-neutral-500">N° de seguimiento</p>
              <p className="text-neutral-200">{shipment.tracking_number ?? '—'}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm text-neutral-400">Permisos oficiales</p>
            <div className="flex flex-wrap gap-3">
              {permits.map((p) => (
                <div
                  key={p.permit_code}
                  className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5"
                >
                  <PermitSeal code={p.permit_code as PermitCode} />
                  <span className="text-xs capitalize text-neutral-300">{p.status}</span>
                </div>
              ))}
              {permits.length === 0 && <p className="text-xs text-neutral-500">Sin permisos registrados.</p>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
