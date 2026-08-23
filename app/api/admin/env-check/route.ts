import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Diagnóstico seguro público: solo booleanos (sin secretos ni email). */
export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      hasAdminEmail: Boolean(process.env.ADMIN_EMAIL?.trim()),
      hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
