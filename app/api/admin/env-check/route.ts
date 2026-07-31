import { NextResponse } from 'next/server';
import { getSupabaseAdminConfigStatus } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Diagnóstico seguro público: solo booleanos (sin secretos ni email). */
export async function GET() {
  const status = getSupabaseAdminConfigStatus();
  return NextResponse.json({
    ok: true,
    hasUrl: status.hasUrl,
    hasAnonKey: status.hasAnon,
    hasServiceRole: status.hasServiceRole,
  });
}
