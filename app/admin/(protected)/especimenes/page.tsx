import { getSupabaseAdmin } from '@/lib/supabase/client';
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
  const rows = await loadSpecimens();
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
