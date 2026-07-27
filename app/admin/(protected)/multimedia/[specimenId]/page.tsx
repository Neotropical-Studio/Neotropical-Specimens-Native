import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import MediaSlot from '../MediaSlot';

export const revalidate = 0;

const PHOTO_VIEWS = [
  { view: 'dorsal', label: 'Dorsal' },
  { view: 'ventral', label: 'Ventral' },
  { view: 'lateral', label: 'Lateral' },
  { view: 'macro', label: 'Macro' },
];

interface MediaAsset {
  type?: string;
  view?: string;
  cloudinary_id?: string;
}

async function loadSpecimen(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select('id, specimen_code, attributes, media_assets, global_regions(region_name, name)')
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
  const specimen = await loadSpecimen(specimenId);
  if (!specimen) notFound();

  const attributes = (specimen.attributes as Record<string, unknown>) ?? {};
  const kind = (attributes.specimen_kind as string) ?? 'dried_specimen';
  const regionCode =
    (specimen.global_regions as { region_name?: string | null; name?: string | null } | null)?.region_name ??
    (specimen.global_regions as { region_name?: string | null; name?: string | null } | null)?.name ??
    'NEO';
  const mediaAssets: MediaAsset[] = Array.isArray(specimen.media_assets) ? specimen.media_assets : [];

  const findAsset = (type: string, view?: string) =>
    mediaAssets.find((m) => m.type === type && (view ? m.view === view : true))?.cloudinary_id;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Multimedia · {specimen.specimen_code}</h1>
        <p className="text-sm text-neutral-400">Carpeta Cloudinary por tipo de espécimen + región ({regionCode}).</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-emerald-400">Fotos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PHOTO_VIEWS.map(({ view, label }) => (
            <MediaSlot
              key={view}
              specimenId={specimen.id}
              kind={kind}
              regionCode={regionCode}
              mediaType="photo_webp"
              view={view}
              label={label}
              currentCloudinaryId={findAsset('photo_webp', view)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-emerald-400">Video corto inmersivo</h2>
          <MediaSlot
            specimenId={specimen.id}
            kind={kind}
            regionCode={regionCode}
            mediaType="video_mp4"
            label="Video"
            currentCloudinaryId={findAsset('video_mp4')}
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-emerald-400">Modelo 3D (Blender/GLTF)</h2>
          <MediaSlot
            specimenId={specimen.id}
            kind={kind}
            regionCode={regionCode}
            mediaType="model_3d_glb"
            label="Modelo 3D"
            currentCloudinaryId={findAsset('model_3d_glb')}
          />
        </div>
      </div>
    </div>
  );
}
