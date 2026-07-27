'use client';

import { useActionState } from 'react';
import { signInAction, type SignInState } from './actions';
import FormField, { inputClass, buttonPrimaryClass } from '@/components/admin/FormField';

const initialState: SignInState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

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
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonPrimaryClass}>
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
