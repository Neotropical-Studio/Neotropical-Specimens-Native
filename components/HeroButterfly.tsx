'use client';

// ============================================================================
// Showcase del hero: rotación ~10s + paleta camaleónica.
// Morpho godarty → WebP/PNG con alfa real (flota sobre el fondo). Resto → foto.
// Sin marco; object-contain para no distorsionar proporciones.
// ============================================================================
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { cloudinaryImageUrl, resolveCloudinaryPublicId } from '@/lib/cloudinary/url';
import {
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_PNG,
  MORPHO_HERO_URL,
  MORPHO_VENTRAL_PNG,
  MORPHO_VENTRAL_URL,
} from '@/lib/cloudinary/specimens';
import {
  isMorphoGodartyDidiusTingomarensis,
  MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID,
} from '@/lib/specimens/native/morphoGodartyDidiusTingomarensis';
import { hexA, type ThemePalette } from '@/lib/theme/palette';
import type { SpecimenView } from '@/lib/specimens/view';

interface Props {
  active: SpecimenView;
  featured: SpecimenView[];
  index: number;
  palette: ThemePalette;
  lang: string;
  strings: Record<string, string>;
}

function isMorphoShowcaseSlide(active: SpecimenView): boolean {
  if (active.id.startsWith(`${MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_SPECIMEN_ID}`)) return true;
  return isMorphoGodartyDidiusTingomarensis({
    id: active.id,
    scientificName: active.scientificName,
  });
}

function isMorphoVentralSlide(active: SpecimenView): boolean {
  return (
    active.id.endsWith(':ventral') ||
    (active.primaryImage ?? '').includes('ventral') ||
    (active.scientificName ?? '').toLowerCase().includes('ventral')
  );
}

function resolveHeroSrc(active: SpecimenView): string {
  if (isMorphoShowcaseSlide(active)) {
    return isMorphoVentralSlide(active) ? MORPHO_VENTRAL_URL : MORPHO_HERO_URL;
  }

  const raw = (active.primaryImage ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('/') || raw.startsWith('http')) return raw;

  const publicId = resolveCloudinaryPublicId(raw);
  if (!publicId) return raw;

  return cloudinaryImageUrl(publicId, ['f_png', 'q_auto:best', 'w_900', 'c_fit']) || raw;
}

function productHref(lang: string, active: SpecimenView): string {
  // Slides sintéticos de catálogo no tienen ficha; Morpho ventral → ficha Morpho.
  if (active.id.startsWith('catalogue-node:')) return `/${lang}/catalogue`;
  const baseId = active.id.includes(':')
    ? active.id.slice(0, active.id.indexOf(':'))
    : active.id;
  return `/${lang}/product/${baseId}`;
}

export default function HeroButterfly({ active, featured, index, palette, lang, strings }: Props) {
  const t = (key: string, fallback: string) => strings[key] ?? fallback;
  const safeActive = active?.id ? active : null;
  const preferred = safeActive ? resolveHeroSrc(safeActive) : '';
  const [src, setSrc] = useState(preferred);
  const [failedOnce, setFailedOnce] = useState(false);
  const isGodarty = safeActive ? isMorphoShowcaseSlide(safeActive) : false;
  const isVentral = safeActive ? isMorphoVentralSlide(safeActive) : false;

  useEffect(() => {
    setSrc(preferred);
    setFailedOnce(false);
  }, [preferred, safeActive?.id]);

  if (!safeActive || !src) return null;
  const href = productHref(lang, safeActive);

  return (
    <Link
      href={href}
      className="group relative flex w-80 max-w-full shrink-0 items-center justify-center overflow-visible bg-transparent sm:w-96"
      style={{ minHeight: '20rem' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={safeActive.id}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative flex w-full flex-col items-center"
        >
          <div className="relative flex h-72 w-full items-center justify-center bg-transparent sm:h-80">
            <Image
              src={src}
              alt={safeActive.scientificName}
              width={720}
              height={720}
              priority
              sizes="384px"
              className="max-h-full max-w-full bg-transparent object-contain object-center transition-transform duration-700 group-hover:scale-105"
              unoptimized
              onError={() => {
                if (failedOnce) return;
                setFailedOnce(true);
                if (isGodarty) {
                  setSrc(isVentral ? MORPHO_VENTRAL_PNG : MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_PNG);
                  return;
                }
                const id = resolveCloudinaryPublicId(safeActive.primaryImage ?? '');
                if (id) setSrc(cloudinaryImageUrl(id, ['f_png', 'c_fit']) || safeActive.primaryImage || '');
              }}
            />
          </div>
          <div
            className="pointer-events-none relative z-10 mt-1 w-full px-2 pb-2 pt-3 transition-colors duration-[1200ms]"
            style={{ background: `linear-gradient(to top, ${hexA(palette.surface, 0.92)}, transparent)` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              {safeActive.rubroLabel ?? safeActive.family ?? t('hero_butterfly.featured', 'Espécimen destacado')}
            </p>
            <p className="mt-1 text-lg font-bold italic leading-tight text-white">{safeActive.scientificName}</p>
            {(safeActive.family || safeActive.commonName) && (
              <p className="text-sm text-neutral-300">
                {[safeActive.family, safeActive.commonName].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {featured.length > 1 && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex gap-1">
          {featured.map((f, i) => (
            <span
              key={f.id}
              className="h-1.5 rounded-full transition-all duration-500"
              style={
                i === index
                  ? { width: '1.25rem', backgroundColor: palette.accent }
                  : { width: '0.375rem', backgroundColor: 'rgba(255,255,255,0.3)' }
              }
            />
          ))}
        </div>
      )}
    </Link>
  );
}
