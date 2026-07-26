'use client';

import type { EnabledLocale } from '@/lib/i18n/locales';
import LocaleSwitcher from './LocaleSwitcher';
import PermitSeal, { type PermitCode } from './PermitSeal';

const PERMITS: PermitCode[] = ['CITES', 'VUCE', 'SENASA', 'SERFOR'];

interface Props {
  lang: string;
  locales: EnabledLocale[];
  strings: Record<string, string>;
}

export default function RegulatoryStrip({ lang, locales, strings }: Props) {
  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  return (
    <div className="flex h-9 items-center border-b border-white/5 bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
          <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-500 sm:inline">
            {t('permits.label', 'Permisos oficiales')}
          </span>
          <ul className="flex shrink-0 items-center gap-3">
            {PERMITS.map((code) => (
              <li key={code} className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-neutral-400">
                <PermitSeal code={code} size="sm" />
                {code}
              </li>
            ))}
          </ul>
        </div>

        <LocaleSwitcher lang={lang} locales={locales} label={t('nav.language', 'Idioma')} />
      </div>
    </div>
  );
}
