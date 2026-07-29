'use client';

// IngestionEngine — motor de ingesta real para el admin.
// · Drag-and-drop de múltiples archivos
// · Detecta tipo y código desde el nombre del archivo
// · Llama a /api/admin/ingest-batch por cada archivo (con bg removal para fotos)
// · Pipeline visual de 4 pasos por archivo
// Convención de nombre:   {CODE}[_{vista}].{ext}
//   BR-001_dorsal.webp  →  code=BR-001, vista=dorsal, tipo=imagen
//   BR-001.glb          →  code=BR-001, tipo=modelo 3D
//   HE-032.mp4          →  code=HE-032, tipo=video
import { useCallback, useRef, useState } from 'react';
import { CheckCircle, XCircle, Loader2, UploadCloud, ImageIcon, Box, Video } from 'lucide-react';

type AssetType = 'image' | 'model' | 'video';
type StepStatus = 'idle' | 'running' | 'done' | 'error';

interface PipelineItem {
  id:        string;
  fileName:  string;
  code:      string;
  view:      string;
  assetType: AssetType;
  removeBg:  boolean;
  steps: {
    parse:  StepStatus;
    upload: StepStatus;
    db:     StepStatus;
  };
  error?: string;
  publicId?: string;
}

const EXT_TYPE: Record<string, AssetType> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', tiff: 'image',
  glb: 'model', gltf: 'model',
  mp4: 'video', mov: 'video',
};

const VIEW_ALIASES: Record<string, string> = {
  d: 'dorsal', dorsal: 'dorsal',
  v: 'ventral', ventral: 'ventral',
  l: 'lateral', lateral: 'lateral',
  m: 'macro',   macro: 'macro',
};

const ASSET_ICONS: Record<AssetType, React.ReactNode> = {
  image: <ImageIcon size={13} />,
  model: <Box size={13} />,
  video: <Video size={13} />,
};

const ASSET_LABELS: Record<AssetType, string> = {
  image: 'Foto',
  model: '3D',
  video: 'Video',
};

function parseFile(file: File): Omit<PipelineItem, 'id' | 'steps'> | null {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';
  const assetType = EXT_TYPE[ext];
  if (!assetType) return null;

  const stem = file.name.replace(/\.[^.]+$/, '');
  const m = stem.match(/^([A-Za-z]{2,4}-\d{3,4})(?:_([a-z]+))?$/i);
  if (!m) return null;

  const code = m[1].toUpperCase();
  const viewRaw = (m[2] || '').toLowerCase();
  const view = VIEW_ALIASES[viewRaw] ?? 'dorsal';

  return {
    fileName:  file.name,
    code,
    view,
    assetType,
    removeBg: assetType === 'image',
  };
}

function StepDot({ status, label }: { status: StepStatus; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] font-mono transition-colors ${
      status === 'done'    ? 'text-emerald-400' :
      status === 'running' ? 'text-amber-400' :
      status === 'error'   ? 'text-red-400' :
      'text-neutral-600'
    }`}>
      {status === 'running' ? <Loader2 size={10} className="animate-spin" /> :
       status === 'done'    ? <CheckCircle size={10} /> :
       status === 'error'   ? <XCircle size={10} /> :
       <span className="h-2 w-2 rounded-full border border-neutral-700 inline-block" />}
      {label}
    </span>
  );
}

export default function IngestionEngine() {
  const [items, setItems]       = useState<PipelineItem[]>([]);
  const [running, setRunning]   = useState(false);
  const [removeBg, setRemoveBg] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef  = useRef<HTMLDivElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function setStep(id: string, step: keyof PipelineItem['steps'], status: StepStatus) {
    setItems((prev) =>
      prev.map((it) => it.id === id ? { ...it, steps: { ...it.steps, [step]: status } } : it)
    );
  }
  function setError(id: string, msg: string) {
    setItems((prev) =>
      prev.map((it) => it.id === id
        ? { ...it, error: msg, steps: { ...it.steps, upload: 'error', db: 'error' } }
        : it
      )
    );
  }
  function setPublicId(id: string, pid: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, publicId: pid } : it));
  }

  // ── Process one file ───────────────────────────────────────────────────────
  async function processOne(item: PipelineItem, file: File) {
    setStep(item.id, 'parse', 'done');
    setStep(item.id, 'upload', 'running');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('specimenCode', item.code);
    fd.append('view', item.view);
    fd.append('removeBg', String(item.removeBg && removeBg));

    try {
      const res  = await fetch('/api/admin/ingest-batch', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setStep(item.id, 'upload', 'done');
      setStep(item.id, 'db', 'running');
      setPublicId(item.id, data.publicId);
      // db write is synchronous in the API — if we got ok:true it's already saved
      setStep(item.id, 'db', 'done');
    } catch (err) {
      setError(item.id, (err as Error).message);
    }
  }

  // ── Add files ──────────────────────────────────────────────────────────────
  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const parsed: { item: PipelineItem; file: File }[] = [];

    for (const file of files) {
      const p = parseFile(file);
      if (!p) continue;
      const item: PipelineItem = {
        id:    `${file.name}-${Date.now()}-${Math.random()}`,
        ...p,
        steps: { parse: 'running', upload: 'idle', db: 'idle' },
      };
      parsed.push({ item, file });
    }

    if (!parsed.length) return;
    setItems((prev) => [...prev, ...parsed.map((x) => x.item)]);

    // process sequentially to avoid overwhelming the server
    setRunning(true);
    (async () => {
      for (const { item, file } of parsed) {
        await processOne(item, file);
      }
      setRunning(false);
    })();
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragRef.current?.classList.remove('border-emerald-400');
    addFiles(e.dataTransfer.files);
  }, [removeBg]); // eslint-disable-line react-hooks/exhaustive-deps

  const done    = items.filter((i) => i.steps.db === 'done').length;
  const errors  = items.filter((i) => i.error).length;
  const pending = items.filter((i) => i.steps.db === 'idle' && !i.error).length;

  return (
    <div className="space-y-6">
      {/* ── Upload zone ─────────────────────────────────────────────────── */}
      <div
        ref={dragRef}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); dragRef.current?.classList.add('border-emerald-400'); }}
        onDragLeave={() => dragRef.current?.classList.remove('border-emerald-400')}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-900/40 py-12 transition-colors hover:border-emerald-600"
      >
        <UploadCloud size={32} className="text-neutral-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-300">Arrastra archivos aquí o haz clic</p>
          <p className="mt-1 text-xs text-neutral-500">
            Fotos (JPG/PNG/WebP) · Modelos 3D (.glb) · Video (MP4)
          </p>
          <p className="mt-1 font-mono text-[10px] text-neutral-600">
            Nombre: <span className="text-emerald-700">BR-001_dorsal.webp</span> &nbsp;·&nbsp; <span className="text-emerald-700">BR-001.glb</span>
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.glb,.gltf,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* ── Options ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-neutral-300">
          <input
            type="checkbox"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
            className="accent-emerald-500"
          />
          Eliminación de fondo automática (Cloudinary AI) — solo fotos
        </label>
        {items.length > 0 && (
          <button
            onClick={() => setItems([])}
            className="ml-auto text-xs text-neutral-500 hover:text-white"
          >
            Limpiar lista
          </button>
        )}
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-xs font-mono">
          <span className="text-neutral-400">Total: {items.length}</span>
          <span className="text-emerald-400">✔ {done}</span>
          {errors > 0 && <span className="text-red-400">✘ {errors}</span>}
          {pending > 0 && <span className="text-amber-400 animate-pulse">⏳ {pending}</span>}
          {running && <span className="ml-auto flex items-center gap-1 text-amber-400"><Loader2 size={11} className="animate-spin" /> Procesando…</span>}
          {!running && items.length > 0 && <span className="ml-auto text-emerald-400">Listo</span>}
        </div>
      )}

      {/* ── Pipeline list ────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-colors ${
                item.error
                  ? 'border-red-900/50 bg-red-950/20'
                  : item.steps.db === 'done'
                    ? 'border-emerald-900/40 bg-emerald-950/10'
                    : 'border-neutral-800 bg-neutral-900/50'
              }`}
            >
              {/* Type icon */}
              <span className={`shrink-0 ${
                item.assetType === 'model' ? 'text-purple-400' :
                item.assetType === 'video' ? 'text-blue-400' : 'text-emerald-400'
              }`}>
                {ASSET_ICONS[item.assetType]}
              </span>

              {/* Code + view */}
              <span className="w-24 shrink-0 font-mono font-bold text-white">{item.code}</span>
              <span className="w-16 shrink-0 text-neutral-400">{item.view}</span>
              <span className="w-12 shrink-0 text-neutral-500">{ASSET_LABELS[item.assetType]}</span>

              {/* Steps */}
              <div className="flex flex-1 gap-3">
                <StepDot status={item.steps.parse}  label="Detectar" />
                <StepDot status={item.steps.upload} label={item.assetType === 'image' && removeBg ? 'Cloudinary+BG' : 'Cloudinary'} />
                <StepDot status={item.steps.db}     label="Supabase" />
              </div>

              {/* Error or public_id */}
              {item.error ? (
                <span className="ml-auto max-w-[180px] truncate text-red-400" title={item.error}>{item.error}</span>
              ) : item.publicId ? (
                <span className="ml-auto max-w-[180px] truncate font-mono text-neutral-500" title={item.publicId}>
                  {item.publicId}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
