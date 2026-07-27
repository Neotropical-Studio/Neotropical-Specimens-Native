'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/admin';

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
    return { error: 'Credenciales inválidas' };
  }

  redirect('/admin');
}
