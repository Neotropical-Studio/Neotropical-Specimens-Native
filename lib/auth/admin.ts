import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
  type AdminSessionPayload,
} from './session';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminSessionPayload['role'];
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const session = await verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
    if (!session) return null;
    return {
      id: session.id,
      email: session.email,
      fullName: session.email,
      role: session.role,
    };
  } catch (error) {
    console.error('Error al validar la sesión administrativa:', error);
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
