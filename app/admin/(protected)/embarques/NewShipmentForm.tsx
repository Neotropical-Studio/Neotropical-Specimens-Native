'use client';

import { useActionState } from 'react';
import FormField, { inputClass, buttonPrimaryClass } from '@/components/admin/FormField';
import { createShipmentAction, type ShipmentFormState } from './actions';

const initialState: ShipmentFormState = {};

export default function NewShipmentForm() {
  const [state, formAction, pending] = useActionState(createShipmentAction, initialState);
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.error && (
        <div className="rounded-md border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">{state.error}</div>
      )}
      <FormField label="Tipo" htmlFor="shipmentType" error={err('shipmentType')}>
        <select id="shipmentType" name="shipmentType" className={inputClass} defaultValue="export" required>
          <option value="export">Exportación</option>
          <option value="import">Importación</option>
        </select>
      </FormField>
      <FormField label="País de destino" htmlFor="destinationCountry">
        <input id="destinationCountry" name="destinationCountry" className={inputClass} />
      </FormField>
      <FormField label="Cliente / destinatario" htmlFor="destinationCustomer">
        <input id="destinationCustomer" name="destinationCustomer" className={inputClass} />
      </FormField>
      <FormField label="Transportista" htmlFor="carrier">
        <input id="carrier" name="carrier" className={inputClass} />
      </FormField>
      <FormField label="Notas" htmlFor="notes">
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </FormField>
      <button type="submit" disabled={pending} className={`${buttonPrimaryClass} w-fit`}>
        {pending ? 'Creando…' : 'Crear embarque'}
      </button>
    </form>
  );
}
