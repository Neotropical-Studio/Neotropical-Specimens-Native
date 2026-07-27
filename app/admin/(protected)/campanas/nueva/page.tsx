import { getSupabaseAdmin } from '@/lib/supabase/client';
import CampaignForm from '../CampaignForm';

export const revalidate = 0;

async function loadOptions() {
  const db = getSupabaseAdmin();
  const [{ data: categories }, { data: regions }] = await Promise.all([
    db.from('categories').select('id, name').order('name'),
    db.from('global_regions').select('id, name').order('name'),
  ]);
  return { categories: categories ?? [], regions: regions ?? [] };
}

export default async function NuevaCampanaPage() {
  const { categories, regions } = await loadOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Nueva campaña</h1>
      <CampaignForm categories={categories} regions={regions} />
    </div>
  );
}
