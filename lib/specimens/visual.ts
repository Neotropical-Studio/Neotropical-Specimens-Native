import type { ThemePalette } from '@/lib/theme/palette';

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function trimDark(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return `#${value.split('').map((c) => c + c).join('')}`;
  }
  return `#${value}`;
}

function ensureContrast(hex: string, fallback: ThemePalette): ThemePalette {
  const normalized = trimDark(hex);
  return {
    primary: normalized,
    accent: normalized,
    surface: fallback.surface,
    text: fallback.text,
  };
}

export async function extractDominantPaletteFromImage(
  src: string,
  fallback: ThemePalette,
): Promise<ThemePalette> {
  if (!src || typeof window === 'undefined') return fallback;

  const image = new Image();
  image.decoding = 'async';
  image.src = src;

  try {
    await image.decode();
  } catch {
    return fallback;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallback;

  const width = Math.min(160, image.naturalWidth || image.width || 160);
  const height = Math.min(160, image.naturalHeight || image.height || 160);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const pixels: Array<[number, number, number]> = [];
  const imageData = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < imageData.length; i += 4 * 8) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const alpha = imageData[i + 3];
    if (alpha > 80) pixels.push([r, g, b]);
  }

  if (!pixels.length) return fallback;

  const bucket = new Map<string, number>();
  for (const [r, g, b] of pixels) {
    const key = toHex([Math.round(r / 32) * 32, Math.round(g / 32) * 32, Math.round(b / 32) * 32]);
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }

  const pick = [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!pick) return fallback;

  const base = ensureContrast(pick, fallback);
  return {
    ...fallback,
    primary: base.primary,
    accent: base.accent,
    surface: fallback.surface,
    text: fallback.text,
  };
}
