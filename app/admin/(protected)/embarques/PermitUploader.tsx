'use client';

import { useState, useTransition } from 'react';
import { Upload, Check, X } from 'lucide-react';
import { inputClass, buttonSecondaryClass } from '@/components/admin/FormField';
import { attachPermitAction, verifyPermitAction } from './actions';
import type { PermitCode } from '@/components/PermitSeal';

interface ExistingPermit {
  id: string;
  permit_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  document_cloudinary_id: string | null;
  status: string;
}

interface Props {
  shipmentId: string;
  permitCode: PermitCode;
  existing?: ExistingPermit;
}

// "Verificar" = revisión humana del documento + cambio de estado — no hay
// integración en vivo con las APIs de CITES/VUCE/SENASA/SERFOR en esta v1.
export default function PermitUploader({ shipmentId, permitCode, existing }: Props) {
  const [documentId, setDocumentId] = useState(existing?.document_cloudinary_id ?? '');
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', 'document_raw');
    formData.append('documentFolder', `documentos-legales/${shipmentId}/${permitCode}`);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setDocumentId(data.cloudinaryId);
    } finally {
      setUploading(false);
    }
  }

  const canVerify = existing && (existing.status === 'submitted' || existing.status === 'pending');

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-200">{permitCode}</span>
        {existing && <span className="text-xs capitalize text-neutral-500">{existing.status}</span>}
      </div>

      <form action={attachPermitAction.bind(null, shipmentId)} className="flex flex-col gap-2">
        <input type="hidden" name="permitCode" value={permitCode} />
        <input type="hidden" name="documentCloudinaryId" value={documentId} />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="permitNumber"
            placeholder="N° de permiso"
            defaultValue={existing?.permit_number ?? ''}
            className={inputClass}
          />
          <input name="issuedAt" type="date" defaultValue={existing?.issued_at ?? ''} className={inputClass} />
          <input name="expiresAt" type="date" defaultValue={existing?.expires_at ?? ''} className={inputClass} />
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 hover:border-emerald-500">
            <Upload size={13} />
            {uploading ? 'Subiendo…' : documentId ? 'Reemplazar' : 'Subir documento'}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
            />
          </label>
        </div>
        <button type="submit" className={buttonSecondaryClass}>
          Guardar permiso
        </button>
      </form>

      {canVerify && (
        <div className="flex gap-2 border-t border-neutral-800 pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => verifyPermitAction(shipmentId, existing!.id, true))}
            className="flex items-center gap-1 rounded-md border border-emerald-700 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-900/40"
          >
            <Check size={12} /> Aprobar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => verifyPermitAction(shipmentId, existing!.id, false))}
            className="flex items-center gap-1 rounded-md border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-900/40"
          >
            <X size={12} /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
