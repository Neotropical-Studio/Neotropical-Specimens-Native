'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Save, Trash2 } from 'lucide-react';
import { imageUrl, videoMp4, modelUrl } from '@/lib/cloudinary/url';
import UniversalMediaCapture, {
  type UniversalMediaKind,
} from '@/components/admin/UniversalMediaCapture';
import { acceptForKind } from '@/lib/media/universal-capture';
import { deleteMediaAssetAction } from './actions';
import PublishProductionButton from '@/components/admin/PublishProductionButton';

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

const KIND: Record<MediaType, UniversalMediaKind> = {
  photo_webp: 'image',
  video_mp4: 'video',
  model_3d_glb: 'any',
};

function acceptForMediaType(mediaType: MediaType): string {
  if (mediaType === 'photo_webp') return acceptForKind('image');
  if (mediaType === 'video_mp4') return acceptForKind('video');
  return acceptForKind('model3d');
}

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
  const [ok, setOk] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clearPending() {
    setPendingFile(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
  }

  function receiveFile(file: File) {
    setError(null);
    setOk(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  async function grabarFile(file: File) {
    setUploading(true);
    setError(null);
    setOk(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('specimenId', specimenId);
    formData.append('kind', kind);
    formData.append('regionCode', regionCode);
    formData.append('mediaType', mediaType);
    if (view) formData.append('view', view);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = (await res.json()) as {
        error?: string;
        publicId?: string;
        production?: { ok?: boolean };
      };
      if (!res.ok) throw new Error(data.error ?? 'Error al subir');
      const at = new Date().toLocaleString('es-PE', { hour12: false });
      const prodNote =
        data.production?.ok === false
          ? ' · prod: revisar'
          : ' · producción actualizada';
      setOk(`GRABADO · ${label} · ${data.publicId ?? 'ok'} · ${at}${prodNote}`);
      clearPending();
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleGrabar() {
    if (!pendingFile) return;
    await grabarFile(pendingFile);
  }

  function handleDelete() {
    if (!currentCloudinaryId) return;
    if (!window.confirm(`¿Eliminar este medio?\n${currentCloudinaryId}`)) return;
    startTransition(() => {
      deleteMediaAssetAction(specimenId, currentCloudinaryId, RESOURCE_TYPE[mediaType]);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>

      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-neutral-950">
        {pendingPreview ? (
          mediaType === 'video_mp4' ? (
            <video src={pendingPreview} controls playsInline className="h-full w-full object-contain" />
          ) : mediaType === 'photo_webp' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pendingPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-amber-300">Archivo listo · tocá GRABAR</span>
          )
        ) : currentCloudinaryId ? (
          mediaType === 'photo_webp' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(currentCloudinaryId, ['w_480'])}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : mediaType === 'video_mp4' ? (
            <video
              src={videoMp4(currentCloudinaryId)}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
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

      {pendingFile ? (
        <p className="rounded border border-amber-800/60 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
          Pendiente: {pendingFile.name} — todavía no está en el website. Tocá GRABAR.
        </p>
      ) : null}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {ok && (
        <p className="flex items-center gap-1.5 rounded border border-emerald-800 bg-emerald-950/40 px-2 py-1.5 text-xs text-emerald-300">
          <CheckCircle2 size={12} /> {ok}
        </p>
      )}

      <UniversalMediaCapture
        kind={KIND[mediaType]}
        accept={acceptForMediaType(mediaType)}
        disabled={uploading}
        size="sm"
        onFile={receiveFile}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleGrabar()}
          disabled={uploading || !pendingFile}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-800 px-3 py-2 text-xs font-semibold text-white touch-manipulation hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[44px]"
        >
          <Save size={13} />
          {uploading ? 'Grabando…' : 'GRABAR'}
        </button>
        {pendingFile ? (
          <button
            type="button"
            onClick={clearPending}
            disabled={uploading}
            className="inline-flex min-h-[48px] items-center rounded-xl border border-neutral-700 px-3 py-2 text-xs text-neutral-400 touch-manipulation sm:min-h-[44px]"
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending || uploading || !currentCloudinaryId || !!pendingFile}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs font-semibold text-red-200 touch-manipulation hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[44px]"
        >
          <Trash2 size={13} />
          {pending
            ? 'Eliminando…'
            : mediaType === 'video_mp4'
              ? 'Eliminar video'
              : mediaType === 'photo_webp'
                ? 'Eliminar foto'
                : 'Eliminar 3D'}
        </button>
      </div>

      <PublishProductionButton
        variant="field"
        reason={`media-slot:${specimenId}:${view ?? mediaType}`}
      />
    </div>
  );
}
