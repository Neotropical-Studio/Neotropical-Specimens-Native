'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
} from '@/lib/auth/session';

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!email || !password) return { error: 'Correo y contraseña son obligatorios' };
  if (!adminEmail || !adminPassword) return { error: 'Autenticación no configurada' };
  if (email !== adminEmail || password !== adminPassword) {
    return { error: 'Correo o contraseña incorrectos' };
  }

  (await cookies()).set(ADMIN_SESSION_COOKIE, await createAdminSession(adminEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  redirect('/admin');
}
