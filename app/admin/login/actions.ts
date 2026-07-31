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

  if (!isSupabaseAdminConfigured()) {
    return {
      error:
        'El servidor no tiene SUPABASE_SERVICE_ROLE_KEY configurada. No se puede verificar el acceso de administrador.',
    };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { error: 'Configuración de Supabase incompleta (URL/anon key).' };
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

  // Auth ok ≠ acceso al panel: hace falta fila activa en admin_users.
  try {
    const db = getSupabaseAdmin();
    const { data: adminRow, error: adminErr } = await db
      .from('admin_users')
      .select('id, active')
      .eq('id', user.id)
      .maybeSingle();

    if (adminErr) {
      await supabase.auth.signOut();
      return {
        error:
          'Inicio de sesión correcto, pero no se pudo verificar el permiso de administrador. Contacta al equipo técnico.',
      };
    }

    if (!adminRow || !adminRow.active) {
      await supabase.auth.signOut();
      return {
        error:
          'Inicio de sesión correcto, pero esta cuenta no está autorizada en el panel (falta en admin_users o está inactiva).',
      };
    }
  } catch {
    await supabase.auth.signOut();
    return {
      error:
        'Inicio de sesión correcto, pero falló la verificación de administrador (revisa SUPABASE_SERVICE_ROLE_KEY en el deploy).',
    };
  }

  redirect('/admin');
}
