'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Globe2, Menu, X } from 'lucide-react';
import type { EnabledLocale } from '@/lib/i18n/locales';
import { cloudinaryImageUrl } from '@/lib/cloudinary/url';
import RegulatoryStrip from './RegulatoryStrip';

interface Props {
  strings: Record<string, string>;
  lang: string;
  locales: EnabledLocale[];
}

export default function Header({ strings, lang, locales }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [globeFailed, setGlobeFailed] = useState(false);

  // Sello oficial real de la empresa (Cloudinary, carpeta `LOGOS/LOGOS
  // SPECIEMENES SECOS BIOLOGICOS NO-CITES/logo_ztmh8j.png`) — nunca un ícono
  // genérico inventado. El recorte 1:1 centrado deja fuera el texto de
  // certificación de borde (ilegible al tamaño del header) sin tocar el
  // arte real. `NEXT_PUBLIC_CLOUDINARY_LOGO_ID`/`..._GLOBE_ID` permiten
  // reemplazarlo por otra pieza real sin tocar código.
  const logoId = process.env.NEXT_PUBLIC_CLOUDINARY_LOGO_ID || 'logo_ztmh8j';
  const globeId = process.env.NEXT_PUBLIC_CLOUDINARY_GLOBE_ID || 'Rotating_earth__large_vwcedm';
  // c_fit: conserva el anillo dorado oficial ("NEOTROPICAL SPECIMENS" /
  // "HOUSE INSECTS OF PERU") sin recortar el sello de Cloudinary.
  const logoSrc = cloudinaryImageUrl(logoId, ['w_192', 'h_192', 'c_fit']);
  const globeSrc = cloudinaryImageUrl(globeId, ['w_48', 'h_48', 'c_fill', 'g_center']);

  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  const nav = [
    { label: t('nav.catalog', 'Catálogo'), href: '#catalogo' },
    { label: t('nav.regions', 'Regiones'), href: '#regiones' },
    { label: t('nav.wholesale', 'Mayorista'), href: '#mayorista' },
    { label: t('nav.contact', 'Contacto'), href: '#contacto' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-neutral-950/80 backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <RegulatoryStrip lang={lang} locales={locales} strings={strings} />

      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-2.5">
          {logoSrc && !logoFailed ? (
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-amber-400/40">
              <Image
                src={logoSrc}
                alt="Neotropical Specimens — House Insects of Peru E.I.R.L."
                fill
                priority
                sizes="48px"
                className="object-contain"
                onError={() => setLogoFailed(true)}
              />
            </span>
          ) : (
            // Mientras el sello real no cargue (red lenta / caché fría), un
            // monograma tipográfico neutro — nunca un ícono decorativo
            // inventado que aparente ser la marca oficial.
            <span className="grid h-11 w-11 place-items-center rounded-full border border-amber-400/30 bg-neutral-900 text-sm font-black tracking-tight text-amber-300">
              NS
            </span>
          )}
          <span className="flex flex-col leading-none">
            <span className="text-sm font-extrabold tracking-tight text-white">Neotropical Specimens</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">Native Collection</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
            >
              {n.label}
            </a>
          ))}
          <a
            href="#catalogo"
            className="ml-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            {globeSrc && !globeFailed ? (
              <Image
                src={globeSrc}
                alt=""
                width={24}
                height={24}
                sizes="24px"
                unoptimized // preserva la animación del GIF real (globo rotando)
                className="h-5 w-5 rounded-full object-cover"
                onError={() => setGlobeFailed(true)}
              />
            ) : (
              <Globe2 size={16} aria-hidden="true" />
            )}
            <span>{t('nav.explore', 'Explorar')}</span>
          </a>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t('nav.menu', 'Menú')}
            className="grid h-10 w-10 place-items-center rounded-lg text-white transition hover:bg-white/10"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {open && (
        <div className="border-t border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur-lg md:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
