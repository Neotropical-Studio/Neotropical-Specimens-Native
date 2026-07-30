import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const revalidate = 0;

export default async function EmbarqueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('shipments')
    .select('id, tracking_code, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) notFound();

  const { data: permits } = await db
    .from('shipment_permits')
    .select('id, permit_details, shipment_id')
    .eq('shipment_id', id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Embarque · {(data.tracking_code as string | null) ?? id.slice(0, 8)}
        </h1>
        <p className="text-sm text-neutral-400">
          Creado:{' '}
          {data.created_at ? new Date(data.created_at as string).toLocaleString() : '—'}
        </p>
      </div>

      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
        Schema live de logística es stub: no hay ítems, estados ni permisos tipados. Edición
        desactivada para evitar 500.
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-emerald-400">Permisos (stub)</h2>
        {(permits ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">Sin filas en shipment_permits.</p>
        ) : (
          <ul className="list-inside list-disc text-sm text-neutral-300">
            {(permits ?? []).map((p) => (
              <li key={p.id as string}>{(p.permit_details as string | null) ?? p.id}</li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/admin/embarques" className="text-sm text-emerald-400 hover:underline">
        ← Volver a embarques
      </Link>
    </div>
  );
}
