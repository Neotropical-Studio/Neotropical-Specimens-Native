// ============================================================================
// Autorización del panel /admin.
// - Sesión: Supabase Auth (cookies / anon key)
// - Permiso: fila activa en admin_users
//   1) Preferido: service_role (bypass RLS) si SUPABASE_SERVICE_ROLE_KEY está
//   2) Fallback: el propio JWT del usuario + política RLS select-own
//     (migración 0011). Así el login no se bloquea si Vercel aún no tiene
//     la service role — subir _card vía Cloudinary solo necesita getCurrentAdmin().
// ============================================================================
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'super_admin' | 'editor' | 'viewer';
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies.
        }
      },
    },
  });
}

async function readAdminRow(
  userId: string,
  via: 'service' | 'session',
): Promise<AdminUser | null> {
  try {
    if (via === 'service') {
      if (!isSupabaseAdminConfigured()) return null;
      const db = getSupabaseAdmin();
      const { data, error } = await db
        .from('admin_users')
        .select('id, email, full_name, role, active')
        .eq('id', userId)
        .maybeSingle();
      if (error || !data || !data.active) return null;
      return {
        id: data.id as string,
        email: data.email as string,
        fullName: (data.full_name as string) ?? null,
        role: data.role as AdminUser['role'],
      };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, active')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data || !data.active) return null;
    return {
      id: data.id as string,
      email: data.email as string,
      fullName: (data.full_name as string) ?? null,
      role: data.role as AdminUser['role'],
    };
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Prefer service_role when available; else session + RLS.
    const viaService = await readAdminRow(user.id, 'service');
    if (viaService) return viaService;
    return readAdminRow(user.id, 'session');
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
