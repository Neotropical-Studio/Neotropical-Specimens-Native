'use client';

// ============================================================================
// Showcase camaleónico del hero: la rotación y la paleta viven en
// useChameleonRotation (compartidas con los resplandores de fondo del Hero),
// este componente sólo pinta la tarjeta — foto real + borde/resplandor y
// puntos de progreso teñidos con el color del espécimen activo.
// ============================================================================
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { imageUrl } from '@/lib/cloudinary/url';
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

export default function HeroButterfly({ active, featured, index, palette, lang, strings }: Props) {
  const t = (key: string, fallback: string) => strings[key] ?? fallback;
  const href = `/${lang}/product/${active.id}`;
  const img = imageUrl(active.primaryImage as string, ['w_640', 'ar_1', 'c_fill']);

  return (
    <Link
      href={href}
      className="group relative block aspect-square w-full max-w-sm shrink-0 overflow-hidden rounded-3xl border bg-white/[0.03] shadow-2xl backdrop-blur-sm transition-colors duration-[1200ms]"
      style={{
        borderColor: hexA(palette.accent, 0.3),
        boxShadow: `0 25px 60px -15px ${hexA(palette.primary, 0.45)}`,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Image
            src={img}
            alt={active.scientificName}
            fill
            sizes="(max-width: 768px) 90vw, 384px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
          <div
            className="absolute inset-x-0 bottom-0 p-5 transition-colors duration-[1200ms]"
            style={{ background: `linear-gradient(to top, ${hexA(palette.surface, 0.95)}, ${hexA(palette.surface, 0.4)} 55%, transparent)` }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors duration-[1200ms]"
              style={{ color: palette.accent }}
            >
              {active.family ?? t('hero_butterfly.featured', 'Espécimen destacado')}
            </p>
            <p className="mt-1 text-lg font-bold italic leading-tight text-white">{active.scientificName}</p>
            {active.commonName && <p className="text-sm text-neutral-300">{active.commonName}</p>}
          </div>
        </motion.div>
      </AnimatePresence>

      {featured.length > 1 && (
        <div className="absolute right-3 top-3 z-10 flex gap-1">
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
