// Página pública de rastreo — schema live de shipments es stub
// (id, tracking_code, created_at). Sin status/shipment_code tipados.
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getI18n } from '@/lib/i18n/index';

export const revalidate = 0;

async function loadShipment(code: string) {
  const db = getSupabaseAdmin();
  const { data: shipment, error } = await db
    .from('shipments')
    .select('id, tracking_code, created_at')
    .eq('tracking_code', code)
    .maybeSingle();
  if (error) return null;
  if (!shipment) return null;

  const { data: permits } = await db
    .from('shipment_permits')
    .select('id, permit_details')
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
      <Header strings={i18n.strings} />
      <main className="min-h-screen bg-surface pt-[104px] text-text-dynamic">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="text-2xl font-bold">Rastreo de embarque</h1>
          <p className="mt-1 font-mono text-sm text-neutral-400">
            {(shipment.tracking_code as string | null) ?? code}
          </p>

          <dl className="mt-8 grid gap-4 text-sm">
            <div>
              <dt className="text-neutral-500">Creado</dt>
              <dd>
                {shipment.created_at
                  ? new Date(shipment.created_at as string).toLocaleString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Estado</dt>
              <dd>Registrado (schema stub — sin estados avanzados)</dd>
            </div>
          </dl>

          {permits.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold">Permisos</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-neutral-400">
                {permits.map((p) => (
                  <li key={p.id as string}>
                    {(p.permit_details as string | null) ?? String(p.id)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
