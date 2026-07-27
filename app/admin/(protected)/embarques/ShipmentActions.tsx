'use client';

import { useState, useTransition } from 'react';
import { buttonPrimaryClass, buttonSecondaryClass, inputClass } from '@/components/admin/FormField';
import { updateShipmentStatusAction, generateShipmentQrAction } from './actions';

const STATUSES = ['draft', 'permits_pending', 'ready', 'in_transit', 'delivered', 'cancelled'];

interface Props {
  shipmentId: string;
  shipmentCode: string;
  status: string;
  hasQr: boolean;
}

export default function ShipmentActions({ shipmentId, shipmentCode, status, hasQr }: Props) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(status);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || value === status}
        onClick={() => startTransition(() => updateShipmentStatusAction(shipmentId, value))}
        className={buttonSecondaryClass}
      >
        Actualizar estado
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => generateShipmentQrAction(shipmentId, shipmentCode))}
        className={buttonPrimaryClass}
      >
        {hasQr ? 'Regenerar código QR' : 'Generar código y QR'}
      </button>
    </div>
  );
}
