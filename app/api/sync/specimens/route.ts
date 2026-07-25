import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { syncSpecimenFromSanity } from '@/lib/sync/upsertSpecimen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET = process.env.SYNC_WEBHOOK_SECRET!;

function authorized(token: string | null): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface SyncBody {
  id?: string;
  syncEventId?: number;
}

// Invocado por n8n (no directamente por el webhook de Sanity) tras orquestar
// el evento crudo que ya quedó en `sync_event` vía app/api/webhooks/sanity.
// No confía en el `operation` del evento: siempre redereferencia el doc en
// Sanity y decide upsert/delete según exista o no (ver syncSpecimenFromSanity).
export async function POST(req: NextRequest) {
  const token =
    req.headers.get('x-sync-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '') ?? null;

  if (!authorized(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as SyncBody;
  if (!body.id) {
    return NextResponse.json({ error: 'falta "id" (document id de Sanity)' }, { status: 400 });
  }

  try {
    const result = await syncSpecimenFromSanity(body.id);

    if (body.syncEventId) {
      await getSupabaseAdmin()
        .from('sync_event')
        .update({ processed: true })
        .eq('id', body.syncEventId);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'sync failed' },
      { status: 500 },
    );
  }
}
