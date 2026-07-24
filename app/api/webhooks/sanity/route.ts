import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET = process.env.SANITY_WEBHOOK_SECRET!;

function verify(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const [, sig] = signature.match(/v1=([^,]+)/) ?? [];
  if (!sig) return false;
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('sanity-webhook-signature');

  if (!verify(raw, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(raw) as {
    _type: string;
    _id: string;
    operation?: 'create' | 'update' | 'delete';
    [k: string]: unknown;
  };

  const db = getSupabaseAdmin();

  // Registro del evento para procesamiento adaptativo / n8n.
  await db.from('sync_event').insert({
    source: 'sanity',
    event_type: `${event._type}.${event.operation ?? 'update'}`,
    payload: event,
  });

  // Lógica adaptativa: propaga a n8n para orquestación en tiempo real.
  if (process.env.N8N_WEBHOOK_URL) {
    await fetch(`${process.env.N8N_WEBHOOK_URL}/sanity`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-n8n-token': process.env.N8N_WEBHOOK_TOKEN ?? '',
      },
      body: raw,
    }).catch(() => void 0);
  }

  return NextResponse.json({ ok: true, id: event._id });
}
