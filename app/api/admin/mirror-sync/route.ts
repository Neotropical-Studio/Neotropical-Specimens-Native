// POST /api/admin/mirror-sync
// Espejo industrial Cloudinary ↔ Supabase.
// Body JSON: { mode?: 'discover' | 'apply' }  (default apply)
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { runBidirectionalMirror } from '@/lib/mirror/bidirectional';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const revalidate = 0;

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let mode: 'discover' | 'apply' = 'apply';
  try {
    const body = (await req.json()) as { mode?: string };
    if (body.mode === 'discover') mode = 'discover';
  } catch {
    // body vacío → apply
  }

  try {
    const db = getSupabaseAdmin();
    const result = await runBidirectionalMirror(db, {
      mode,
      triggeredBy: admin.email ?? admin.id,
      maxCloud: 400,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingKey = msg.includes('SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      { error: msg },
      { status: missingKey ? 503 : 500 },
    );
  }
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const db = getSupabaseAdmin();
    const result = await runBidirectionalMirror(db, {
      mode: 'discover',
      triggeredBy: admin.email ?? admin.id,
      maxCloud: 200,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingKey = msg.includes('SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      { error: msg },
      { status: missingKey ? 503 : 500 },
    );
  }
}
