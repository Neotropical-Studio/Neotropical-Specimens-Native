import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/auth/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proteger la ruta /admin (excepto /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    // Si no hay sesión activa, redirige al login
    if (!(await verifyAdminSession(adminSession))) {
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
