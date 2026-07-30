import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const revalidate = 0;

export default async function EditCampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('campaigns').select('id, name').eq('id', id).maybeSingle();
  if (error || !data) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">
        Campaña · {(data.name as string | null) ?? id}
      </h1>
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-100">
        Edición rica desactivada: live es stub. Aplica la sección B de{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
          supabase/sql/espejo_universal_industrial.sql
        </code>{' '}
        para habilitar el formulario.
      </div>
      <Link href="/admin/campanas" className="text-sm text-emerald-400 hover:underline">
        ← Volver a campañas
      </Link>
    </div>
  );
}
