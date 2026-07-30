import Link from 'next/link';

export const revalidate = 0;

export default function NuevoEmbarquePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Nuevo embarque</h1>
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
        No se puede crear: live solo tiene <code className="text-xs">id</code>,{' '}
        <code className="text-xs">tracking_code</code>, <code className="text-xs">created_at</code>{' '}
        y no existe <code className="text-xs">shipment_items</code> ni RPC{' '}
        <code className="text-xs">next_sequence</code>.
      </div>
      <Link href="/admin/embarques" className="text-sm text-emerald-400 hover:underline">
        ← Volver a embarques
      </Link>
    </div>
  );
}
