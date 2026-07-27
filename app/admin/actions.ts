'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/admin';

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
