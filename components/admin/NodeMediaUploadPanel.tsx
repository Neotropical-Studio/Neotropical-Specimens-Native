'use client';

import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Upload, Video } from 'lucide-react';
import type { NodeMediaLevel, NodeMediaUploadTarget } from '@/lib/mirror/contract';

type Props = {
  targets: NodeMediaUploadTarget[];
};

const LEVEL_LABEL: Record<NodeMediaLevel, string> = {
  rubro: '1 · Rubros (_card/_video)',
  region: '2 · Regiones secos ×5 (_card/_video)',
  categoria: '3 · Categorías secos × regiones',
  familia: '4 · Familias/taxones (_card/_video c/u)',
};

export default function NodeMediaUploadPanel({ targets }: Props) {
  const [level, setLevel] = useState<NodeMediaLevel>('rubro');
  const [targetId, setTargetId] = useState(() => targets.find((t) => t.level === 'rubro')?.id ?? '');
  const [slot, setSlot] = useState<'card' | 'video'>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => targets.filter((t) => t.level === level),
    [targets, level],
  );

  const selected = targets.find((t) => t.id === targetId) ?? filtered[0] ?? null;

  function onLevelChange(next: NodeMediaLevel) {
    setLevel(next);
    const first = targets.find((t) => t.level === next);
    setTargetId(first?.id ?? '');
    setError(null);
    setOk(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setBusy(true);
    setError(null);
    setOk(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('targetId', selected.id);
    fd.append('slot', slot);

    try {
      const res = await fetch('/api/admin/node-media', { method: 'POST', body: fd });
      const json = (await res.json()) as { error?: string; publicId?: string; folder?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setOk(`Subido: ${json.publicId} → ${json.folder}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const folderPreview = selected
    ? slot === 'card'
      ? selected.cardFolder
      : selected.videoFolder
    : '—';

  return (
    <div className="rounded-lg border border-sky-900/60 bg-sky-950/20 p-4">
      <div className="mb-3 flex items-start gap-2">
        <Upload className="mt-0.5 shrink-0 text-sky-400" size={18} />
        <div>
          <h2 className="text-sm font-semibold text-sky-200">Subir Card + Video desde el admin</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Elige el nodo (rubro / región / categoría / familia) y sube la imagen o el video. Se
            guarda solo en <code className="text-neutral-300">_card</code> o{' '}
            <code className="text-neutral-300">_video</code> de ese path — no puedes elegir otra
            carpeta.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Nivel
          <select
            value={level}
            onChange={(e) => onLevelChange(e.target.value as NodeMediaLevel)}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
          >
            {(Object.keys(LEVEL_LABEL) as NodeMediaLevel[]).map((k) => (
              <option key={k} value={k}>
                {LEVEL_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400 sm:col-span-2 lg:col-span-2">
          Nodo
          <select
            value={selected?.id ?? ''}
            onChange={(e) => {
              setTargetId(e.target.value);
              setError(null);
              setOk(null);
            }}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
          >
            {filtered.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Slot
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value as 'card' | 'video')}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
          >
            <option value="card">Card (imagen)</option>
            <option value="video">Video de ingreso</option>
          </select>
        </label>
      </div>

      <p className="mt-3 break-all rounded border border-neutral-800 bg-neutral-950/80 px-3 py-2 font-mono text-[11px] text-amber-200/90">
        Destino fijo: {folderPreview}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded border border-sky-600 bg-sky-950 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-900 disabled:opacity-50"
        >
          {slot === 'video' ? <Video size={16} /> : <ImagePlus size={16} />}
          {busy ? 'Subiendo…' : slot === 'video' ? 'Elegir video' : 'Elegir imagen card'}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={slot === 'video' ? 'video/*' : 'image/*'}
          onChange={(e) => void handleFile(e)}
        />
      </div>

      {error && (
        <p className="mt-3 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-3 rounded border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
          {ok}
        </p>
      )}
    </div>
  );
}
