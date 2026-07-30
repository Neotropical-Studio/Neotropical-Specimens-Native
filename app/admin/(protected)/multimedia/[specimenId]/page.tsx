import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { fetchSpecimenMedia, type MediaRow } from '@/lib/specimens/view';
import MediaSlot from '../MediaSlot';

export const revalidate = 0;

/** Slots canónicos BLOQUE 3 — orden fijo. */
const MEDIA_SLOTS = [
  {
    key: 'cover',
    view: 'cover',
    label: 'Foto principal (cover)',
    mediaType: 'photo_webp' as const,
    order: 0,
    wide: true,
  },
  {
    key: 'dorsal',
    view: 'dorsal',
    label: 'WebP 1 · Dorsal',
    mediaType: 'photo_webp' as const,
    order: 1,
    wide: false,
  },
  {
    key: 'ventral',
    view: 'ventral',
    label: 'WebP 2 · Ventral',
    mediaType: 'photo_webp' as const,
    order: 2,
    wide: false,
  },
  {
    key: 'model',
    view: 'model',
    label: 'Modelo 3D',
    mediaType: 'model_3d_glb' as const,
    order: 8,
    wide: false,
  },
  {
    key: 'video',
    view: 'video',
    label: 'Video (Blender / mp4)',
    mediaType: 'video_mp4' as const,
    order: 9,
    wide: false,
  },
];

function isImage(m: MediaRow): boolean {
  const t = (m.media_type ?? '').toLowerCase();
  return t === 'image' || t === 'photo_webp';
}
function isVideo(m: MediaRow): boolean {
  const t = (m.media_type ?? '').toLowerCase();
  return t === 'video' || t === 'video_mp4';
}
function isModel(m: MediaRow): boolean {
  const t = (m.media_type ?? '').toLowerCase();
  return t === 'model' || t === 'model_3d_glb';
}

function mediaView(m: MediaRow): string | null {
  return (m as MediaRow & { view?: string | null }).view ?? null;
}

function findSlotId(
  media: MediaRow[],
  slot: (typeof MEDIA_SLOTS)[number],
  coverPublicId?: string | null,
): string | undefined {
  const byView = media.find((m) => (mediaView(m) ?? '').toLowerCase() === slot.view);
  if (byView) return byView.public_id ?? byView.media_url ?? undefined;

  if (slot.view === 'cover') {
    if (coverPublicId) return coverPublicId;
    const firstImg = media.filter(isImage).sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))[0];
    return firstImg?.public_id ?? firstImg?.media_url ?? undefined;
  }
  if (slot.view === 'dorsal') {
    const imgs = media.filter(isImage).sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
    const hit = imgs.find((m) => (m.display_order ?? 0) === 1) ?? imgs[0];
    return hit?.public_id ?? hit?.media_url ?? undefined;
  }
  if (slot.view === 'ventral') {
    const imgs = media.filter(isImage).sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
    const hit = imgs.find((m) => (m.display_order ?? 0) === 2) ?? imgs[1];
    return hit?.public_id ?? hit?.media_url ?? undefined;
  }
  if (slot.mediaType === 'video_mp4') {
    const v = media.find(isVideo);
    return v?.public_id ?? v?.media_url ?? undefined;
  }
  if (slot.mediaType === 'model_3d_glb') {
    const m = media.find(isModel);
    return m?.public_id ?? m?.media_url ?? undefined;
  }
  return undefined;
}

async function loadSpecimen(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(
      `
      id,
      species_name,
      rubro,
      region,
      familia,
      genero,
      especie,
      subespecie,
      region_id,
      cloudinary_public_id,
      media_url,
      taxonomy:taxonomy!taxonomy_id(order_name, family_name),
      region_join:global_regions!region_id(region_name, name)
    `,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function MultimediaManagerPage({
  params,
}: {
  params: Promise<{ specimenId: string }>;
}) {
  const { specimenId } = await params;
  const db = getSupabaseAdmin();
  const specimen = await loadSpecimen(specimenId);
  if (!specimen) notFound();

  const mediaById = await fetchSpecimenMedia(db, [specimenId]);
  const media = mediaById.get(specimenId) ?? [];

  const regionJoin = specimen.region_join as
    | { region_name?: string | null; name?: string | null }
    | { region_name?: string | null; name?: string | null }[]
    | null;
  const regionObj = Array.isArray(regionJoin) ? regionJoin[0] ?? null : regionJoin;
  const regionCode =
    regionObj?.region_name ??
    regionObj?.name ??
    (typeof specimen.region === 'string' ? specimen.region : null) ??
    'NEO';

  const tax = specimen.taxonomy as
    | { order_name?: string | null; family_name?: string | null }
    | { order_name?: string | null; family_name?: string | null }[]
    | null;
  const taxObj = Array.isArray(tax) ? tax[0] ?? null : tax;

  const rubro = String(specimen.rubro ?? '');
  const kind = rubro.includes('ZOO')
    ? 'zoology_skeleton'
    : rubro.includes('PLANT')
      ? 'plant'
      : 'dried_specimen';

  const code = `LEGACY-${String(specimen.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const coverPublicId =
    (specimen.cloudinary_public_id as string | null) ??
    (specimen.media_url as string | null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Medios · {specimen.species_name ?? code}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          <span className="font-mono text-neutral-300">ID {code}</span>
          {' · '}
          Región <span className="text-neutral-200">{regionCode}</span>
          {taxObj?.order_name || specimen.familia ? (
            <>
              {' · '}
              {taxObj?.order_name ?? '—'} / {specimen.familia ?? taxObj?.family_name ?? '—'}
            </>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Slots de la ficha de especie/subespecie: principal → 2 WebP → 3D → video. Cover en{' '}
          <code className="text-neutral-400">specimens</code> + filas en{' '}
          <code className="text-neutral-400">specimen_media</code>.
        </p>
        <Link
          href={`/admin/especimenes/${specimen.id}`}
          className="mt-2 inline-block text-xs text-emerald-400 underline hover:text-emerald-300"
        >
          ← Volver a la ficha
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MEDIA_SLOTS.map((slot) => (
          <div key={slot.key} className={slot.wide ? 'sm:col-span-2' : undefined}>
            <MediaSlot
              specimenId={specimen.id as string}
              kind={kind}
              regionCode={regionCode}
              mediaType={slot.mediaType}
              view={slot.view}
              label={slot.label}
              currentCloudinaryId={findSlotId(media, slot, coverPublicId)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
