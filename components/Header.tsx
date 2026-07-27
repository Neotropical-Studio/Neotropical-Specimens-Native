'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Bug, Globe2, Menu, X } from 'lucide-react';
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

  const logoId = process.env.NEXT_PUBLIC_CLOUDINARY_LOGO_ID || 'neotropical-logo';
  const globeId = process.env.NEXT_PUBLIC_CLOUDINARY_GLOBE_ID || 'neotropical-globe';
  const logoSrc = cloudinaryImageUrl(logoId, ['w_180', 'h_50', 'c_scale']);
  const globeSrc = cloudinaryImageUrl(globeId, ['w_24', 'h_24', 'c_scale']);

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
            <Image
              src={logoSrc}
              alt="Neotropical Specimens Native"
              width={180}
              height={50}
              priority
              sizes="(max-width: 768px) 120px, 180px"
              className="h-10 w-auto object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-neutral-950 shadow-lg shadow-emerald-500/20">
              <Bug size={20} />
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
                className="h-5 w-5 object-contain"
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
