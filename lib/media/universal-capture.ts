// ============================================================================
// Captura universal regenerativa — CERO hardcode de dispositivos ni redes.
// El navegador + OS del cliente (celular, iPhone, iPad, tablet, PC, Mac…)
// decide cámara / galería / escáner. Esta capa solo declara *fuentes*
// configurables; futuras fuentes se agregan aquí o por env, sin tocar UI.
// ============================================================================

import {
  ACCEPT_ANY_MEDIA,
  ACCEPT_CARD,
  ACCEPT_MODEL3D,
  ACCEPT_VIDEO,
  type MediaKind,
} from '@/lib/media/kinds';

export type UniversalMediaKind = 'image' | 'video' | 'any';

/** Fuente de entrada — regenerativa: lista abierta, no tabla de marcas. */
export type CaptureSourceId = string;

export type CaptureSourceDef = {
  id: CaptureSourceId;
  /** Texto UI (puede override por env). */
  label: string;
  /** Para qué kinds se muestra. */
  kinds: readonly UniversalMediaKind[];
  /**
   * undefined = galería/archivos (cualquier origen del SO).
   * environment = cámara trasera / escáner en móvil.
   * user = cámara frontal si el SO lo soporta.
   */
  capture?: 'environment' | 'user';
  tone: 'neutral' | 'sky' | 'violet' | 'emerald';
  icon: 'folder' | 'scan' | 'camera' | 'video';
};

/**
 * Fuentes por defecto. Ampliar aquí = aparece en Espejo + Multimedia
 * sin redeploy de lógica de botones fijos.
 */
export const DEFAULT_CAPTURE_SOURCES: readonly CaptureSourceDef[] = [
  {
    id: 'gallery',
    label: 'Galería / archivos',
    kinds: ['image', 'video', 'any'],
    tone: 'neutral',
    icon: 'folder',
  },
  {
    id: 'camera_scan',
    label: 'Cámara / escanear',
    kinds: ['image', 'any'],
    capture: 'environment',
    tone: 'sky',
    icon: 'scan',
  },
  {
    id: 'camera_video',
    label: 'Grabar video',
    kinds: ['video'],
    capture: 'environment',
    tone: 'violet',
    icon: 'video',
  },
] as const;

/** Hint libre — override: NEXT_PUBLIC_MEDIA_CAPTURE_HINT */
export function mediaCaptureHint(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MEDIA_CAPTURE_HINT?.trim();
  if (fromEnv) return fromEnv;
  return (
    'Cualquier dispositivo con navegador · Wi‑Fi, datos u otra red · ' +
    'elegí / escaneá / grabá → revisá → GRABAR. Sin lista fija de marcas.'
  );
}

/** Fuentes activas (filtradas por kind). Override labels vía JSON env opcional. */
export function listCaptureSources(kind: UniversalMediaKind): CaptureSourceDef[] {
  const overrides = parseLabelOverrides();
  return DEFAULT_CAPTURE_SOURCES.filter((s) => s.kinds.includes(kind)).map((s) => ({
    ...s,
    label: overrides[s.id] ?? s.label,
  }));
}

function parseLabelOverrides(): Record<string, string> {
  const raw = process.env.NEXT_PUBLIC_MEDIA_CAPTURE_LABELS?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/** Accept abierto por kind — wildcards MIME, futuros codecs sin tocar código. */
export function acceptForKind(kind: UniversalMediaKind | MediaKind): string {
  const envCard = process.env.NEXT_PUBLIC_MEDIA_ACCEPT_CARD?.trim();
  const envVideo = process.env.NEXT_PUBLIC_MEDIA_ACCEPT_VIDEO?.trim();
  const envAny = process.env.NEXT_PUBLIC_MEDIA_ACCEPT_ANY?.trim();

  if (kind === 'image') return envCard || ACCEPT_CARD;
  if (kind === 'video') return envVideo || ACCEPT_VIDEO;
  if (kind === 'model3d') return ACCEPT_MODEL3D;
  return envAny || ACCEPT_ANY_MEDIA;
}

/** Accept del input cámara: MIME abierto, no codecs fijos. */
export function cameraAcceptForKind(kind: UniversalMediaKind): string {
  if (kind === 'video') return 'video/*';
  if (kind === 'image') return 'image/*';
  return acceptForKind('any');
}
