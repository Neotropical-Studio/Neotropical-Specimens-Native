import { sql } from '@/lib/db';
import SpecimenForm from '../SpecimenForm';

export const revalidate = 0;

async function loadOptions() {
  let categories: Array<{ id: string; category_name?: string | null }> = [];
  let regions: Array<{ id: string; name?: string | null; region_name?: string | null }> = [];
  try {
    categories = (await sql`SELECT id, category_name FROM categories ORDER BY category_name`) as typeof categories;
  } catch (error) {
    console.error('Error cargando categorías desde Neon:', error);
  }
  try {
    regions = (await sql`
      SELECT id, name, region_name
      FROM global_regions
      ORDER BY COALESCE(name, region_name), id
    `) as typeof regions;
  } catch (error) {
    console.error('Error cargando regiones desde Neon:', error);
  }
  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.category_name ?? '—',
    })),
    regions: regions.map((r) => ({
      id: r.id,
      name: r.name ?? r.region_name ?? '—',
      region_name: r.region_name ?? null,
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
