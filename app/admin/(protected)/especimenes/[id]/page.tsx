import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImagePlay } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { buttonSecondaryClass } from '@/components/admin/FormField';
import SpecimenForm from '../SpecimenForm';

export const revalidate = 0;

async function loadSpecimen(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select('id, specimen_code, stock, pricing, attributes, category_id, taxonomy(id, category_id, rank_hierarchy), global_regions(id, region_name, name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadOptions() {
  const db = getSupabaseAdmin();
  const [{ data: categories }, { data: regions }] = await Promise.all([
    db.from('categories').select('id, name, slug').order('name'),
    db.from('global_regions').select('id, name, region_name').order('name'),
  ]);
  return { categories: categories ?? [], regions: regions ?? [] };
}

export default async function EditEspecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [specimen, { categories, regions }] = await Promise.all([loadSpecimen(id), loadOptions()]);
  if (!specimen) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Editar espécimen · {specimen.specimen_code}</h1>
        <Link href={`/admin/multimedia/${specimen.id}`} className={buttonSecondaryClass}>
          <ImagePlay size={16} /> Gestionar multimedia
        </Link>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SpecimenForm categories={categories} regions={regions} specimen={specimen as any} />
    </div>
  );
}
