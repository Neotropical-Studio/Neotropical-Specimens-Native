'use client';

import { useRef, useState, useTransition } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { imageUrl, videoMp4, modelUrl } from '@/lib/cloudinary/url';
import { deleteMediaAssetAction } from './actions';

type MediaType = 'photo_webp' | 'video_mp4' | 'model_3d_glb';

interface Props {
  specimenId: string;
  kind: string;
  regionCode: string;
  mediaType: MediaType;
  view?: string;
  label: string;
  currentCloudinaryId?: string;
}

const RESOURCE_TYPE: Record<MediaType, 'image' | 'video' | 'raw'> = {
  photo_webp: 'image',
  video_mp4: 'video',
  model_3d_glb: 'raw',
};

const ACCEPT: Record<MediaType, string> = {
  photo_webp: 'image/*',
  video_mp4: 'video/*',
  model_3d_glb: '.glb,.gltf',
};

export default function MediaSlot({
  specimenId,
  kind,
  regionCode,
  mediaType,
  view,
  label,
  currentCloudinaryId,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('specimenId', specimenId);
    formData.append('kind', kind);
    formData.append('regionCode', regionCode);
    formData.append('mediaType', mediaType);
    if (view) formData.append('view', view);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al subir');
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDelete() {
    if (!currentCloudinaryId) return;
    startTransition(() => {
      deleteMediaAssetAction(specimenId, currentCloudinaryId, RESOURCE_TYPE[mediaType]);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>

      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-neutral-950">
        {currentCloudinaryId ? (
          mediaType === 'photo_webp' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(currentCloudinaryId, ['w_480'])}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : mediaType === 'video_mp4' ? (
            <video src={videoMp4(currentCloudinaryId)} controls className="h-full w-full object-contain" />
          ) : (
            <div className="p-4 text-center text-xs text-neutral-400">
              Modelo 3D cargado
              <br />
              <a
                href={modelUrl(currentCloudinaryId)}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline"
              >
                ver archivo
              </a>
            </div>
          )
        ) : (
          <span className="text-xs text-neutral-600">Sin recurso</span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-emerald-500 hover:text-emerald-300">
          <Upload size={13} />
          {uploading ? 'Subiendo…' : currentCloudinaryId ? 'Reemplazar' : 'Subir'}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT[mediaType]}
            className="hidden"
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        {currentCloudinaryId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="flex items-center justify-center rounded-md border border-neutral-700 px-2 text-red-400 hover:border-red-700"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
