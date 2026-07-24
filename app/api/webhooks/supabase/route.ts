import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECRET = process.env.SUPABASE_WEBHOOK_SECRET!;

function authorized(token: string | null): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface DbWebhook {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-supabase-signature') ?? req.headers.get('authorization')?.replace('Bearer ', '') ?? null;

  if (!authorized(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const event = (await req.json()) as DbWebhook;

  // Disparo adaptativo hacia n8n según tabla/tipo.
  if (process.env.N8N_WEBHOOK_URL) {
    await fetch(`${process.env.N8N_WEBHOOK_URL}/supabase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-n8n-token': process.env.N8N_WEBHOOK_TOKEN ?? '',
      },
      body: JSON.stringify(event),
    }).catch(() => void 0);
  }

  return NextResponse.json({ ok: true, table: event.table, type: event.type });
}
