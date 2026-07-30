import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImagePlay } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { fetchSpecimenMedia } from '@/lib/specimens/view';
import { buttonSecondaryClass } from '@/components/admin/FormField';
import SpecimenForm from '../SpecimenForm';

export const revalidate = 0;

async function loadSpecimen(id: string) {
  const db = getSupabaseAdmin();
  const full = await db
    .from('specimens')
    .select(
      `
      id,
      specimen_code,
      species_name,
      familia,
      subfamilia,
      genero,
      especie,
      subespecie,
      sexo,
      calidad,
      color_dominante,
      origen,
      localidad,
      gps,
      dimensiones,
      peso_gramos,
      precio_menor,
      precio_mayor,
      status,
      rubro,
      categoria,
      region,
      region_id,
      cloudinary_public_id,
      media_url,
      attributes,
      metadata,
      taxonomy_id,
      taxonomy:taxonomy!taxonomy_id(id, order_name, family_name, subfamily_name, genus_name, species_name),
      region_join:global_regions!region_id(id, region_name, name, locality)
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (!full.error) return full.data;

  // Fallback sin columnas opcionales (specimen_code / attributes / metadata)
  const { data, error } = await db
    .from('specimens')
    .select(
      `
      id,
      species_name,
      familia,
      subfamilia,
      genero,
      especie,
      subespecie,
      sexo,
      calidad,
      color_dominante,
      origen,
      localidad,
      gps,
      dimensiones,
      peso_gramos,
      precio_menor,
      precio_mayor,
      status,
      rubro,
      categoria,
      region,
      region_id,
      cloudinary_public_id,
      media_url,
      taxonomy_id,
      taxonomy:taxonomy!taxonomy_id(id, order_name, family_name, subfamily_name, genus_name, species_name),
      region_join:global_regions!region_id(id, region_name, name, locality)
    `,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

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

function shortCode(id: string): string {
  return `LEGACY-${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export default async function EditEspecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  const [specimen, { categories, regions }, mediaById] = await Promise.all([
    loadSpecimen(id),
    loadOptions(),
    fetchSpecimenMedia(db, [id]),
  ]);
  if (!specimen) notFound();

  const code =
    (specimen as { specimen_code?: string | null }).specimen_code?.trim() ||
    shortCode(specimen.id as string);
  const attrsJson =
    ((specimen as { attributes?: Record<string, unknown> | null }).attributes as
      | Record<string, unknown>
      | null) ?? {};
  const metaJson =
    ((specimen as { metadata?: Record<string, unknown> | null }).metadata as
      | Record<string, unknown>
      | null) ?? {};
  const regionJoin = specimen.region_join as
    | { id: string; region_name?: string | null; name?: string | null; locality?: string | null }
    | { id: string; region_name?: string | null; name?: string | null; locality?: string | null }[]
    | null;
  const regionObj = Array.isArray(regionJoin) ? regionJoin[0] ?? null : regionJoin;

  const tax = specimen.taxonomy as
    | {
        id?: string;
        order_name?: string | null;
        family_name?: string | null;
        subfamily_name?: string | null;
        genus_name?: string | null;
        species_name?: string | null;
      }
    | {
        id?: string;
        order_name?: string | null;
        family_name?: string | null;
        subfamily_name?: string | null;
        genus_name?: string | null;
        species_name?: string | null;
      }[]
    | null;
  const taxObj = Array.isArray(tax) ? tax[0] ?? null : tax;

  const status = String(specimen.status ?? '');
  const stock = /out|agotado|0/i.test(status) ? 0 : 1;
  const media = mediaById.get(id) ?? [];

  const regionLabel =
    regionObj?.region_name ??
    regionObj?.name ??
    (typeof specimen.region === 'string' ? specimen.region : null) ??
    '—';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Editar ficha · {specimen.species_name ?? code}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            <span className="font-mono text-neutral-300">ID {code}</span>
            {' · '}
            Región <span className="text-neutral-200">{regionLabel}</span>
            {taxObj?.order_name || specimen.familia ? (
              <>
                {' · '}
                {taxObj?.order_name ?? '—'} / {specimen.familia ?? taxObj?.family_name ?? '—'}
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Una ficha por especie/subespecie dentro de su orden biológico y familia.
          </p>
        </div>
        <Link href={`/admin/multimedia/${specimen.id}`} className={buttonSecondaryClass}>
          <ImagePlay size={16} /> Multimedia
        </Link>
      </div>
      <SpecimenForm
        categories={categories}
        regions={regions}
        specimen={{
          id: specimen.id as string,
          specimen_code: code,
          category_id: null,
          categoria: (specimen.categoria as string) ?? null,
          regionFlat:
            typeof specimen.region === 'string' ? specimen.region : null,
          rubro: (specimen.rubro as string) ?? null,
          species_name: (specimen.species_name as string) ?? null,
          subespecie: (specimen.subespecie as string) ?? null,
          orden: taxObj?.order_name ?? (typeof metaJson.orden === 'string' ? metaJson.orden : null) ?? (typeof metaJson.order === 'string' ? metaJson.order : null),
          color_dominante: (specimen.color_dominante as string) ?? null,
          localidad: (specimen.localidad as string) ?? regionObj?.locality ?? null,
          gps: (specimen.gps as string) ?? null,
          dimensiones: (specimen.dimensiones as string) ?? null,
          peso_gramos: (specimen.peso_gramos as number) ?? null,
          cloudinary_public_id: (specimen.cloudinary_public_id as string) ?? null,
          media_url: (specimen.media_url as string) ?? null,
          global_regions: regionObj,
          taxonomy: {
            id: taxObj?.id ?? '',
            category_id: null,
            rank_hierarchy: {
              order: taxObj?.order_name ?? (typeof metaJson.orden === 'string' ? metaJson.orden : '') ?? '',
              family: (specimen.familia as string) ?? taxObj?.family_name ?? '',
              subfamily: (specimen.subfamilia as string) ?? taxObj?.subfamily_name ?? '',
              genus: (specimen.genero as string) ?? taxObj?.genus_name ?? '',
              species: (specimen.especie as string) ?? taxObj?.species_name ?? '',
              subspecies: (specimen.subespecie as string) ?? '',
            },
          },
          pricing: {
            retail_price: specimen.precio_menor as number | null,
            wholesale_price: specimen.precio_mayor as number | null,
            currency: 'USD',
          },
          stock,
          attributes: {
            common_name:
              (attrsJson.common_name as string) ??
              (typeof metaJson.common_name === 'string' ? metaJson.common_name : null),
            sex: specimen.sexo ?? attrsJson.sex,
            grade_code: specimen.calidad ?? attrsJson.grade_code,
            country_origin: specimen.origen ?? attrsJson.country_origin,
            specimen_kind:
              (attrsJson.specimen_kind as string) ??
              (String(specimen.rubro ?? '').includes('ZOO')
                ? 'zoology_skeleton'
                : String(specimen.rubro ?? '').includes('PLANT')
                  ? 'plant'
                  : 'dried_specimen'),
          },
          media: media.map((m) => ({
            view: (m as { view?: string | null }).view ?? null,
            media_type: m.media_type,
            public_id: m.public_id,
            media_url: m.media_url,
            display_order: m.display_order,
          })),
        }}
      />
    </div>
  );
}
