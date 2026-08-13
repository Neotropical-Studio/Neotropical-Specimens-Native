// app/api/health/route.ts
// Sonda de salud para el failover automático del borde (health checks de Caddy,
// del balanceador o del túnel). Distingue dos cosas que NO deben confundirse:
//
//   · el nodo sirve render  → status 200 (aunque las dependencias fallen)
//   · el nodo está degradado → 200 con degraded:true, para que el balanceador
//     lo despriorice sin sacarlo del pool
//   · el nodo no puede servir → 503, y el borde lo saca y reenvía al siguiente
//
// Sacar un nodo del pool porque Supabase tarda dejaría la región SIN render
// cuando el fallo es de un tercero: la portada cacheada sigue siendo útil.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGION = process.env.EDGE_REGION ?? 'unknown';
const PROBE_TIMEOUT_MS = Number(process.env.HEALTH_PROBE_TIMEOUT_MS ?? 1500);

type ProbeState = 'ok' | 'slow' | 'down' | 'skipped';

interface Probe {
  name: string;
  state: ProbeState;
  ms: number;
}

// Comprueba alcanzabilidad, no corrección: un HTTP cualquiera basta.
async function probe(name: string, url: string | null): Promise<Probe> {
  if (!url) return { name, state: 'skipped', ms: 0 };
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: 'no-store',
    });
    const ms = Date.now() - started;
    // 4xx incluido: responder ya prueba que hay ruta hasta el servicio.
    if (!res.ok && res.status >= 500) return { name, state: 'down', ms };
    return { name, state: ms > PROBE_TIMEOUT_MS * 0.6 ? 'slow' : 'ok', ms };
  } catch {
    return { name, state: 'down', ms: Date.now() - started };
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;

    const probes = await Promise.all([
      probe('supabase', supabaseUrl ? `${supabaseUrl}/rest/v1/` : null),
    ]);

    // El render sólo depende del proceso Next: si responde, el nodo sirve.
    const degraded = probes.some((p) => p.state === 'down' || p.state === 'slow');

    return NextResponse.json(
      {
        ok: true,
        status: 'ok',
        degraded,
        region: REGION,
        renders: true,
        probes,
        ts: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          // Permite al borde enrutar por estado sin abrir el cuerpo JSON.
          'x-edge-region': REGION,
          'x-edge-degraded': degraded ? '1' : '0',
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

// Sonda de liveness mínima para los health checks que sólo miran el código.
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store', 'x-edge-region': REGION },
  });
}
