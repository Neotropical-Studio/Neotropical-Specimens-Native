import Link from 'next/link';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/client';
import {
  SPECIMEN_SELECT,
  attachMedia,
  fetchSpecimenMedia,
  toSpecimenView,
  type SpecimenRow,
} from '@/lib/specimens/view';
import EspecimenesBrowse, {
  type AdminSpecimenRow,
} from '@/components/admin/EspecimenesBrowse';

export const revalidate = 0;

async function loadSpecimens() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('familia', { ascending: true })
    .order('genero', { ascending: true })
    .order('especie', { ascending: true })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as SpecimenRow[];
  const mediaById = await fetchSpecimenMedia(
    db,
    rows.map((r) => r.id),
  );
  return attachMedia(rows, mediaById);
}

export default async function EspecimenesPage() {
  if (!isSupabaseAdminConfigured()) {
    return (
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-6 text-sm text-amber-50">
        <p className="font-semibold">No se pueden cargar fichas sin SERVICE_ROLE</p>
        <p className="mt-2 text-amber-100/90">
          Añade <code>SUPABASE_SERVICE_ROLE_KEY</code> en Vercel Production y haz Redeploy.
          Mientras tanto sube cards en{' '}
          <Link href="/admin/espejo" className="text-sky-300 underline">
            /admin/espejo
          </Link>
          .
        </p>
      </div>
    );
  }

  let rows;
  try {
    rows = await loadSpecimens();
  } catch (e) {
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-6 text-sm text-red-100">
        Error cargando especímenes:{' '}
        {e instanceof Error ? e.message : String(e)}
      </div>
    );
  }

  const specimens: AdminSpecimenRow[] = rows.map((row) => {
    const view = toSpecimenView(row);
    return {
      ...view,
      speciesEpithet: row.especie ?? null,
      subspecies: row.subespecie ?? null,
    };
  });

  return <EspecimenesBrowse specimens={specimens} />;
}
