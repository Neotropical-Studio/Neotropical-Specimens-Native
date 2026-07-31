'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/admin';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/client';

export interface SignInState {
  error?: string;
}

export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Correo y contraseña son obligatorios' };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { error: 'Configuración de Supabase incompleta (URL/anon key en Vercel).' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (msg.includes('email not confirmed') || error.code === 'email_not_confirmed') {
      return { error: 'Debes confirmar el correo antes de entrar (revisa tu bandeja).' };
    }
    return { error: 'Correo o contraseña incorrectos' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No se pudo establecer la sesión. Intenta de nuevo.' };
  }

  // Auth ok — verificar fila activa en admin_users.
  // 1) service_role si existe  2) si no, lectura con el JWT (RLS select-own).
  let allowed = false;
  let verifyError: string | null = null;

  if (isSupabaseAdminConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const { data, error: adminErr } = await db
        .from('admin_users')
        .select('id, active')
        .eq('id', user.id)
        .maybeSingle();
      if (adminErr) {
        verifyError =
          'Inicio de sesión correcto, pero no se pudo verificar el permiso de administrador.';
      } else if (data?.active) {
        allowed = true;
      } else {
        verifyError =
          'Inicio de sesión correcto, pero esta cuenta no está autorizada en el panel (admin_users).';
      }
    } catch {
      verifyError =
        'Inicio de sesión correcto, pero falló la verificación con service_role.';
    }
  }

  if (!allowed) {
    const { data, error: sessionErr } = await supabase
      .from('admin_users')
      .select('id, active')
      .eq('id', user.id)
      .maybeSingle();

    if (!sessionErr && data?.active) {
      allowed = true;
      verifyError = null;
    } else if (!allowed) {
      await supabase.auth.signOut();
      if (verifyError) return { error: verifyError };
      return {
        error:
          'Inicio de sesión correcto, pero no hay permiso de administrador (falta fila en admin_users o política RLS). Ejecuta la migración 0011_admin_users_select_own.sql en Supabase.',
      };
    }
  }

  redirect('/admin');
}
