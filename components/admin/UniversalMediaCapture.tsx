'use client';

/**
 * UI regenerativa de captura — botones salen de listCaptureSources().
 * Sin lista fija de iPhone/Android/PC: el SO del dispositivo decide.
 * Futuras fuentes: lib/media/universal-capture.ts o env NEXT_PUBLIC_MEDIA_*.
 */
import { useMemo, useRef } from 'react';
import { Camera, FolderOpen, ScanLine, Video } from 'lucide-react';
import {
  acceptForKind,
  cameraAcceptForKind,
  listCaptureSources,
  mediaCaptureHint,
  type CaptureSourceDef,
  type UniversalMediaKind,
} from '@/lib/media/universal-capture';

export type { UniversalMediaKind };

type Props = {
  kind: UniversalMediaKind;
  /** Si se omite, se usa accept regenerativo (wildcards / env). */
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  size?: 'sm' | 'md';
  className?: string;
};

const BTN =
  'inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold touch-manipulation active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[44px] sm:text-sm';

const TONE: Record<CaptureSourceDef['tone'], string> = {
  neutral: 'border-neutral-600 bg-neutral-900 text-neutral-100 hover:border-emerald-500 hover:bg-neutral-800',
  sky: 'border-sky-700 bg-sky-950 text-sky-100 hover:bg-sky-900',
  violet: 'border-violet-700 bg-violet-950 text-violet-100 hover:bg-violet-900',
  emerald: 'border-emerald-700 bg-emerald-950 text-emerald-100 hover:bg-emerald-900',
};

function SourceIcon({
  icon,
  size,
}: {
  icon: CaptureSourceDef['icon'];
  size: number;
}) {
  switch (icon) {
    case 'scan':
      return <ScanLine size={size} />;
    case 'camera':
      return <Camera size={size} />;
    case 'video':
      return <Video size={size} />;
    default:
      return <FolderOpen size={size} />;
  }
}

export default function UniversalMediaCapture({
  kind,
  accept,
  disabled,
  onFile,
  size = 'md',
  className = '',
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const sources = useMemo(() => listCaptureSources(kind), [kind]);
  const resolvedAccept = accept ?? acceptForKind(kind);
  const camAccept = cameraAcceptForKind(kind);
  const compact = size === 'sm';
  const iconSize = compact ? 14 : 16;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  }

  function openSource(src: CaptureSourceDef) {
    if (src.capture) cameraRef.current?.click();
    else galleryRef.current?.click();
  }

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <div className="flex w-full flex-wrap gap-2">
        {sources.map((src) => (
          <button
            key={src.id}
            type="button"
            disabled={disabled}
            onClick={() => openSource(src)}
            className={`${BTN} ${TONE[src.tone]} ${compact ? 'min-h-[44px] text-[11px]' : ''}`}
          >
            <SourceIcon icon={src.icon} size={iconSize} />
            {src.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-neutral-500 sm:text-[11px]">
        {mediaCaptureHint()}
      </p>

      <input
        ref={galleryRef}
        type="file"
        className="hidden"
        accept={resolvedAccept}
        disabled={disabled}
        onChange={handleChange}
      />
      <input
        ref={cameraRef}
        type="file"
        className="hidden"
        accept={camAccept}
        capture="environment"
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}
