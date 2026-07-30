import { getSupabaseAdmin } from '@/lib/supabase/client';
import SpecimenForm from '../SpecimenForm';

export const revalidate = 0;

async function loadOptions() {
  const db = getSupabaseAdmin();
  const [{ data: categories }, { data: regions }] = await Promise.all([
    db.from('categories').select('id, category_name').order('category_name'),
    db.from('global_regions').select('id, name, region_name').order('name'),
  ]);
  return {
    categories: (categories ?? []).map((c) => ({
      id: c.id as string,
      name: (c.category_name as string) ?? '—',
    })),
    regions: (regions ?? []).map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? (r.region_name as string | null) ?? '—',
      region_name: (r.region_name as string | null) ?? null,
    })),
  };
}

export default async function NuevoEspecimenPage() {
  const { categories, regions } = await loadOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Nueva ficha de especie / subespecie</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Jerarquía:{' '}
          <span className="text-neutral-200">
            Rubro › Región › Categoría › Orden › Familia › especie
          </span>
          . Secciones: Información general → Taxonomía → Variantes → Origen → Precio → Medios.
        </p>
      </div>
      <SpecimenForm categories={categories} regions={regions} />
    </div>
  );
}
