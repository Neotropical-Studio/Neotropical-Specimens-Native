'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Globe2, Menu, ShoppingBag, X } from 'lucide-react';
import { BRAND_GLOBE_URL, BRAND_LOGO_URL } from '@/lib/cloudinary/brand';
import { useCart } from '@/components/CartProvider';
import RegulatoryStrip from './RegulatoryStrip';

interface Props {
  strings: Record<string, string>;
  /** Idioma de ruta; si falta se infiere del pathname. */
  lang?: string;
}

export default function Header({ strings, lang: langProp }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [globeFailed, setGlobeFailed] = useState(false);
  const pathname = usePathname() || '/es';
  const lang = langProp || pathname.split('/').filter(Boolean)[0] || 'es';
  const { count, ready } = useCart();

  const logoSrc = typeof BRAND_LOGO_URL === 'string' ? BRAND_LOGO_URL : '';
  const globeSrc = typeof BRAND_GLOBE_URL === 'string' ? BRAND_GLOBE_URL : '';

  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  const homeHref = `/${lang}`;
  const cartHref = `/${lang}/cart`;

  const catalogueHref = `${homeHref}/catalogue`;
  const nav = [
    { label: t('nav.catalog', 'Catálogo'), href: catalogueHref },
    { label: t('nav.regions', 'Regiones'), href: `${homeHref}#regiones` },
    { label: t('nav.wholesale', 'Mayorista'), href: `${homeHref}#mayorista` },
    { label: t('nav.contact', 'Contacto'), href: `${homeHref}#contacto` },
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
      <RegulatoryStrip strings={strings} />

      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4">
        <Link href={homeHref} className="flex items-center gap-2.5">
          {logoSrc.length > 0 && !logoFailed ? (
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-amber-400/40">
              <Image
                src={logoSrc}
                alt="Neotropical Specimens — House Insects of Peru E.I.R.L."
                fill
                priority
                sizes="48px"
                unoptimized
                className="object-contain"
                onError={() => setLogoFailed(true)}
              />
            </span>
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full border border-amber-400/30 bg-neutral-900 text-sm font-black tracking-tight text-amber-300">
              NS
            </span>
          )}
          <span className="flex flex-col leading-none">
            <span className="text-sm font-extrabold tracking-tight text-white">Neotropical Specimens</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">Native Collection</span>
          </span>
        </Link>

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
          <Link
            href={cartHref}
            className="relative ml-1 grid h-10 w-10 place-items-center rounded-lg text-neutral-200 transition hover:bg-white/5 hover:text-white"
            aria-label={t('nav.cart', 'Carrito')}
          >
            <ShoppingBag size={18} />
            {ready && count > 0 ? (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 font-mono text-[10px] font-bold text-emerald-950">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Link>
          <Link
            href={catalogueHref}
            className="ml-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            {globeSrc.length > 0 && !globeFailed ? (
              <Image
                src={globeSrc}
                alt=""
                width={24}
                height={24}
                sizes="24px"
                unoptimized
                className="h-5 w-5 rounded-full object-cover"
                onError={() => setGlobeFailed(true)}
              />
            ) : (
              <Globe2 size={16} aria-hidden="true" />
            )}
            <span>{t('nav.explore', 'Explorar')}</span>
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <Link
            href={cartHref}
            className="relative grid h-10 w-10 place-items-center rounded-lg text-white transition hover:bg-white/10"
            aria-label={t('nav.cart', 'Carrito')}
          >
            <ShoppingBag size={20} />
            {ready && count > 0 ? (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 font-mono text-[10px] font-bold text-emerald-950">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t('nav.menu', 'Menú')}
            className="grid h-10 w-10 place-items-center rounded-lg text-white transition hover:bg-white/10"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

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
            <Link
              href={cartHref}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-white/5"
            >
              {t('nav.cart', 'Carrito')}
              {ready && count > 0 ? ` (${count})` : ''}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
