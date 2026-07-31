import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getSupabaseAdminConfigStatus } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Diagnóstico seguro: qué env ve el runtime (sin secretos). */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({
    ok: true,
    admin: admin.email,
    env: getSupabaseAdminConfigStatus(),
  });
}
