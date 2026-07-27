import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import CampaignForm from '../CampaignForm';

export const revalidate = 0;

async function loadCampaign(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadOptions() {
  const db = getSupabaseAdmin();
  const [{ data: categories }, { data: regions }] = await Promise.all([
    db.from('categories').select('id, name').order('name'),
    db.from('global_regions').select('id, name').order('name'),
  ]);
  return { categories: categories ?? [], regions: regions ?? [] };
}

export default async function EditCampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, { categories, regions }] = await Promise.all([loadCampaign(id), loadOptions()]);
  if (!campaign) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Editar campaña · {campaign.title}</h1>
      <CampaignForm categories={categories} regions={regions} campaign={campaign} />
    </div>
  );
}
