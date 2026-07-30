import Link from 'next/link';

export const revalidate = 0;

/** Live campaigns = stub (id, name). Formulario rico desactivado hasta sección B del SQL. */
export default function NuevaCampanaPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Nueva campaña</h1>
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
        <p>
          El schema live de <code className="text-xs">campaigns</code> solo tiene{' '}
          <code className="text-xs">id</code> + <code className="text-xs">name</code>. Para crear
          campañas con fechas, banner y descuento, aplica la sección B de{' '}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
            supabase/sql/espejo_universal_industrial.sql
          </code>
          .
        </p>
      </div>
      <Link href="/admin/campanas" className="text-sm text-emerald-400 hover:underline">
        ← Volver a campañas
      </Link>
    </div>
  );
}
