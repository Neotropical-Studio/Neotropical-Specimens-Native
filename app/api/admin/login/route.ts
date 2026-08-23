import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
} from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ message: 'Autenticación no configurada' }, { status: 503 });
    }

    if (email === adminEmail && password === adminPassword) {
      const response = NextResponse.json({ success: true });
      response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSession(adminEmail), {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_SESSION_TTL_SECONDS,
      });
      return response;
    }

    return NextResponse.json(
      { message: 'Correo o contraseña no válidos' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error al iniciar sesión administrativa:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
