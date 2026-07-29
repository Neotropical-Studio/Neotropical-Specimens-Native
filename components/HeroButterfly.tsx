'use client';

// ============================================================================
// Showcase del hero: rotación 15s + paleta camaleónica.
// Morpho godarty → PNG con alfa real (flota sobre el fondo). Resto → foto.
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
} from '@/lib/cloudinary/specimens';
import { isMorphoGodartyDidiusTingomarensis } from '@/lib/specimens/native/morphoGodartyDidiusTingomarensis';
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

function resolveHeroSrc(active: SpecimenView): string {
  const isGodarty = isMorphoGodartyDidiusTingomarensis({
    id: active.id,
    scientificName: active.scientificName,
  });
  if (isGodarty) return MORPHO_HERO_URL;

  const raw = (active.primaryImage ?? '').trim();
  if (!raw) return '';

  const publicId = resolveCloudinaryPublicId(raw);
  if (!publicId) return raw;

  return cloudinaryImageUrl(publicId, ['f_png', 'q_auto:best', 'w_900', 'c_fit']) || raw;
}

export default function HeroButterfly({ active, featured, index, palette, lang, strings }: Props) {
  const t = (key: string, fallback: string) => strings[key] ?? fallback;
  const href = `/${lang}/product/${active.id}`;
  const preferred = resolveHeroSrc(active);
  const [src, setSrc] = useState(preferred);
  const [failedOnce, setFailedOnce] = useState(false);
  const isGodarty = isMorphoGodartyDidiusTingomarensis({
    id: active.id,
    scientificName: active.scientificName,
  });

  useEffect(() => {
    setSrc(preferred);
    setFailedOnce(false);
  }, [preferred, active.id]);

  if (!src) return null;

  return (
    <Link
      href={href}
      className="group relative flex w-80 max-w-full shrink-0 items-center justify-center overflow-visible bg-transparent sm:w-96"
      style={{ minHeight: '20rem' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative flex w-full flex-col items-center"
        >
          <div className="relative flex h-72 w-full items-center justify-center bg-transparent sm:h-80">
            <Image
              src={src}
              alt={active.scientificName}
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
                  setSrc(MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_PNG);
                  return;
                }
                const id = resolveCloudinaryPublicId(active.primaryImage ?? '');
                if (id) setSrc(cloudinaryImageUrl(id, ['f_png', 'c_fit']) || active.primaryImage || '');
              }}
            />
          </div>
          <div
            className="pointer-events-none relative z-10 mt-1 w-full px-2 pb-2 pt-3 transition-colors duration-[1200ms]"
            style={{ background: `linear-gradient(to top, ${hexA(palette.surface, 0.92)}, transparent)` }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors duration-[1200ms]"
              style={{ color: palette.accent }}
            >
              {active.rubroLabel ?? active.family ?? t('hero_butterfly.featured', 'Espécimen destacado')}
            </p>
            <p className="mt-1 text-lg font-bold italic leading-tight text-white">{active.scientificName}</p>
            {(active.family || active.commonName) && (
              <p className="text-sm text-neutral-300">
                {[active.family, active.commonName].filter(Boolean).join(' · ')}
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
