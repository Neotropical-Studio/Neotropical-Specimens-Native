'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInAction, type SignInState } from './actions';
import FormField, { inputClass, buttonPrimaryClass } from '@/components/admin/FormField';

const initialState: SignInState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const search = useSearchParams();
  const configError = search.get('error') === 'config';

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Correo" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </FormField>
      <FormField label="Contraseña" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </FormField>
      {configError && (
        <p className="text-sm text-amber-300">
          El deploy no tiene SUPABASE_SERVICE_ROLE_KEY. Sin esa variable el panel no puede
          autorizar administradores.
        </p>
      )}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonPrimaryClass}>
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
