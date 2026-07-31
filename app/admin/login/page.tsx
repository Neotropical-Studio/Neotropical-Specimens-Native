import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = { title: 'Iniciar sesión · Admin' };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
        <h1 className="mb-1 text-lg font-semibold text-white">Panel Administrativo</h1>
        <p className="mb-6 text-sm text-neutral-400">Neotropical Specimens Native</p>
        <Suspense fallback={<p className="text-sm text-neutral-500">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
