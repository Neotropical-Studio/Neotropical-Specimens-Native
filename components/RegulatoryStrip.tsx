'use client';

import { PERMIT_ORDER } from '@/lib/cloudinary/permits';
import PermitSeal from './PermitSeal';

interface Props {
  strings: Record<string, string>;
}

export default function RegulatoryStrip({ strings }: Props) {
  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  return (
    <div className="flex h-10 items-center border-b border-white/5 bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center px-4">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
          <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-500 sm:inline">
            {t('permits.label', 'Permisos oficiales')}
          </span>
          {/* Logos institucionales reales (Cloudinary) — sin texto genérico
              duplicado al lado: el alt/title del sello ya identifica la entidad. */}
          <ul className="flex shrink-0 items-center gap-2.5" aria-label={t('permits.label', 'Permisos oficiales')}>
            {PERMIT_ORDER.map((code) => (
              <li key={code}>
                <PermitSeal code={code} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
