// ============================================================================
// Autorización del panel /admin. La sesión (autenticación) vive en Supabase
// Auth; la autorización (¿es admin activo?) vive en `admin_users`, resuelta
// SIEMPRE con el cliente service_role — nunca se expone una política RLS
// pública sobre admin_users (mismo criterio que sync_event/translation_cache).
//
// middleware.ts sólo hace una verificación barata de "hay sesión" (edge, clave
// anon). Esta capa es la autoritativa: layout y cada Server Action bajo
// app/admin/** deben llamar a requireAdmin() — no basta con que el middleware
// haya dejado pasar la request.
// ============================================================================
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'super_admin' | 'editor' | 'viewer';
}

// Cliente Supabase ligado a las cookies de la petición actual — usable en
// Server Components (sólo lectura), Server Actions y Route Handlers (lectura
// y escritura, p. ej. signIn/signOut).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Un Server Component no puede escribir cookies (sólo Server
            // Actions/Route Handlers) — se ignora; la sesión igual se refresca
            // en la próxima petición que sí pueda escribir.
          }
        },
      },
    },
  );
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = getSupabaseAdmin();
  const { data } = await db
    .from('admin_users')
    .select('id, email, full_name, role, active')
    .eq('id', user.id)
    .maybeSingle();

  if (!data || !data.active) return null;

  return {
    id: data.id as string,
    email: data.email as string,
    fullName: (data.full_name as string) ?? null,
    role: data.role as AdminUser['role'],
  };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
