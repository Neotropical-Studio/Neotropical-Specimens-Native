import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLOUDINARY_CLOUD_NAME =
  (typeof process.env.CLOUDINARY_CLOUD_NAME === 'string' &&
    process.env.CLOUDINARY_CLOUD_NAME.trim()) ||
  (typeof process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME === 'string' &&
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.trim()) ||
  'juufg4mn';
const BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;

// Transformación por tipo de recurso. Solo las imágenes reciben f_auto/q_auto/strip.
const IMAGE_TX = 'f_auto,q_auto,fl_strip_profile';

// Cabeceras seguras del upstream que se reenvían (nunca `server`, `via`, etc.).
const PASSTHROUGH = [
  'content-type',
  'content-length',
  'accept-ranges',
  'content-range',
  'etag',
  'last-modified',
];

type ResourceType = 'image' | 'video' | 'raw';

// Detecta el tipo desde el primer segmento (image|video|raw) o por extensión.
function classify(segments: string[]): { type: ResourceType; rest: string[] } {
  const head = segments[0];
  if (head === 'image' || head === 'video' || head === 'raw') {
    return { type: head, rest: segments.slice(1) };
  }
  const last = segments[segments.length - 1]?.toLowerCase() ?? '';
  if (/\.(m3u8|ts|mp4|webm|mov)$/.test(last)) return { type: 'video', rest: segments };
  if (/\.(glb|gltf|bin|usdz|drc)$/.test(last)) return { type: 'raw', rest: segments };
  return { type: 'image', rest: segments };
}

function encodePathSegment(segment: string): string {
  // Cloudinary exige comas literales en el bloque de transformaciones
  // (f_auto,q_auto,…). encodeURIComponent las convertiría en %2C y el
  // delivery devolvería 404.
  return encodeURIComponent(segment).replace(/%2C/gi, ',');
}

function buildTarget(segments: string[], search: string): string {
  const { type, rest } = classify(segments);
  // Si el cliente ya envía "upload/...", respetamos su ruta; si no, la componemos.
  const hasUploadPrefix = rest[0] === 'upload' || rest[0] === 'authenticated';
  const path = rest.map(encodePathSegment).join('/');

  if (hasUploadPrefix) {
    return `${BASE}/${type}/${path}${search}`;
  }

  const tx = type === 'image' ? `${IMAGE_TX}/` : '';
  return `${BASE}/${type}/upload/${tx}${path}${search}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const search = request.nextUrl.search;
  const targetUrl = buildTarget(path, search);

  try {
    const range = request.headers.get('range');
    const upstream = await fetch(targetUrl, {
      headers: range ? { range } : undefined,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse('Media Resource Not Found', { status: upstream.status });
    }

    const headers = new Headers();
    for (const key of PASSTHROUGH) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new NextResponse('Internal Proxy Error', { status: 500 });
  }
}

export async function HEAD(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const res = await GET(request, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
