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
  type CatalogueFamilyOption,
} from '@/components/admin/EspecimenesBrowse';
import {
  familyLabelsForScopeSync,
  listAllCatalogueFamilyOptions,
} from '@/lib/specimens/catalogueFamilyOverrides';
import { DRIED_SPECIMEN_REGION_ROOTS } from '@/scripts/sync-cloudinary/roots';
import { CATALOGUE_CATEGORIES, slugifyCatalogue } from '@/lib/specimens/catalogueNav';
import CatalogueFamilyEditor from '@/components/admin/CatalogueFamilyEditor';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function loadSpecimens() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('familia', { ascending: true })
    .order('genero', { ascending: true })
    .order('especie', { ascending: true })
    .limit(2000);
  if (error) throw error;
  const rows = (data ?? []) as SpecimenRow[];
  const mediaById = await fetchSpecimenMedia(
    db,
    rows.map((r) => r.id),
  );
  return attachMedia(rows, mediaById);
}

/**
 * Industrial: 1 query DB o bootstrap sync (cero Cloudinary en page load).
 * Nunca tira el admin por tabla faltante.
 */
async function loadCatalogueFamilyOptions(): Promise<CatalogueFamilyOption[]> {
  const fromDb = await listAllCatalogueFamilyOptions();
  if (fromDb && fromDb.length > 0) {
    return fromDb.map((f) => ({
      regionId: f.regionId,
      categoryId: f.categoryId,
      id: slugifyCatalogue(f.label),
      label: f.label,
    }));
  }

  const out: CatalogueFamilyOption[] = [];
  const cats = CATALOGUE_CATEGORIES.filter((c) => c.rubroId === 'dried-specimens');
  for (const reg of DRIED_SPECIMEN_REGION_ROOTS) {
    for (const cat of cats) {
      for (const label of familyLabelsForScopeSync(reg.id, cat.id)) {
        out.push({
          regionId: reg.id,
          categoryId: cat.id,
          id: slugifyCatalogue(label),
          label,
        });
      }
    }
  }
  return out;
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
  let catalogueFamilies: CatalogueFamilyOption[] = [];
  try {
    [rows, catalogueFamilies] = await Promise.all([
      loadSpecimens(),
      loadCatalogueFamilyOptions(),
    ]);
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

  return (
    <div className="flex flex-col gap-6">
      <CatalogueFamilyEditor />
      <EspecimenesBrowse specimens={specimens} catalogueFamilies={catalogueFamilies} />
    </div>
  );
}
