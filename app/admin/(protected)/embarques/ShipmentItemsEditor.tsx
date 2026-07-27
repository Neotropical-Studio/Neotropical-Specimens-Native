'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { inputClass, buttonSecondaryClass } from '@/components/admin/FormField';
import { addShipmentItemAction, removeShipmentItemAction } from './actions';

interface SpecimenOption {
  id: string;
  code: string;
  label: string;
}

interface ShipmentItem {
  id: string;
  quantity: number;
  specimenCode: string;
  specimenLabel: string;
}

interface Props {
  shipmentId: string;
  specimenOptions: SpecimenOption[];
  items: ShipmentItem[];
}

export default function ShipmentItemsEditor({ shipmentId, specimenOptions, items }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <form action={addShipmentItemAction.bind(null, shipmentId)} className="flex flex-wrap items-end gap-3">
        <select name="specimenId" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Elegir espécimen…
          </option>
          {specimenOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.label}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min={1} defaultValue={1} className={`${inputClass} w-24`} />
        <button type="submit" className={buttonSecondaryClass}>
          Añadir
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs uppercase text-neutral-400">Espécimen</th>
              <th className="px-3 py-2 text-left text-xs uppercase text-neutral-400">Cantidad</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 text-neutral-200">
                  {it.specimenCode} {it.specimenLabel && `· ${it.specimenLabel}`}
                </td>
                <td className="px-3 py-2 text-neutral-400">{it.quantity}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => removeShipmentItemAction(shipmentId, it.id))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-neutral-500">
                  Sin especímenes en este embarque.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
