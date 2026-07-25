'use client';

// ============================================================================
// Selector de idioma. La lista NO está en el repo: llega desde Sanity
// (siteSettings.enabledLocales) resuelta en servidor, así que añadir idiomas no
// requiere desplegar. Reescribe el segmento /[lang]/ de la ruta actual y fija
// NEXT_LOCALE para que el middleware respete la elección en visitas futuras.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Globe } from 'lucide-react';
import type { EnabledLocale } from '@/lib/i18n/locales';

interface Props {
  lang: string;
  locales: EnabledLocale[];
  label: string;
}

export default function LocaleSwitcher({ lang, locales, label }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Con un solo idioma habilitado el selector no aporta nada.
  if (locales.length < 2) return null;

  const current = locales.find((l) => l.code === lang);

  const pick = (code: string) => {
    setOpen(false);
    if (code === lang) return;
    // La cookie es la preferencia explícita: gana sobre la geo en el borde.
    document.cookie = `NEXT_LOCALE=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
    const rest = (pathname ?? `/${lang}`).split('/').slice(2).join('/');
    router.push(`/${code}${rest ? `/${rest}` : ''}`);
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
      >
        <Globe size={16} />
        <span className="uppercase">{lang}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute end-0 top-full z-50 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-white/10 bg-neutral-950/95 p-1 shadow-2xl backdrop-blur-lg"
        >
          {locales.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => pick(l.code)}
              dir={l.dir}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition ${
                l.code === lang
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="truncate">{l.label}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[10px] uppercase text-neutral-500">{l.code}</span>
                {l.code === lang && <Check size={14} />}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Etiqueta accesible del idioma activo para lectores de pantalla */}
      <span className="sr-only">{current?.label ?? lang}</span>
    </div>
  );
}
