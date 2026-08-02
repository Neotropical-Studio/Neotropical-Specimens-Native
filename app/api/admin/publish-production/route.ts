import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import {
  publishProduction,
  type PublishMode,
} from '@/lib/admin/publish-production';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/publish-production
 * body: { mode?: 'cache' | 'redeploy', reason?: string }
 *
 * cache   → revalida catálogo/tienda en este deployment (fotos/videos/cambios).
 * redeploy → cache + Deploy Hook de Vercel (rebuild Production).
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const mode: PublishMode = body.mode === 'redeploy' ? 'redeploy' : 'cache';
  const reason =
    typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim()
      : `manual:${admin.email}`;

  const result = await publishProduction({ mode, reason });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({
    ok: true,
    deployHookConfigured: Boolean(process.env.VERCEL_DEPLOY_HOOK_URL?.trim()),
    modes: ['cache', 'redeploy'],
  });
}
