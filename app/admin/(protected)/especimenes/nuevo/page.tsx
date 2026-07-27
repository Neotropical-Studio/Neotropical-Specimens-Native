import { getSupabaseAdmin } from '@/lib/supabase/client';
import SpecimenForm from '../SpecimenForm';

export const revalidate = 0;

async function loadOptions() {
  const db = getSupabaseAdmin();
  const [{ data: categories }, { data: regions }] = await Promise.all([
    db.from('categories').select('id, name, slug').order('name'),
    db.from('global_regions').select('id, name, region_name').order('name'),
  ]);
  return { categories: categories ?? [], regions: regions ?? [] };
}

export default async function NuevoEspecimenPage() {
  const { categories, regions } = await loadOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Nuevo espécimen</h1>
      <SpecimenForm categories={categories} regions={regions} />
    </div>
  );
}
