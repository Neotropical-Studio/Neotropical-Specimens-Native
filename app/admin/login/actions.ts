'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export interface SignInState {
  error?: string;
}

export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Correo y contraseña son obligatorios' };
  }

  const supabase = await createSupabaseServerClient();
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

  redirect('/admin');
}
