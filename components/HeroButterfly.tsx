'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { imageUrl } from '@/lib/cloudinary/url';
import type { SpecimenView } from '@/lib/specimens/view';

const ROTATE_MS = 15_000;

// Sincroniza el índice activo con el tamaño real del inventario: si la lista
// cambia (alta/baja de especímenes en vivo) el índice nunca queda fuera de
// rango, y el temporizador se reinicia sólo cuando el largo cambia de verdad.
function useRotatingIndex(length: number, intervalMs: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((i) => (i >= length ? 0 : i));
  }, [length]);

  useEffect(() => {
    if (length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);

  return index;
}

interface Props {
  specimens: SpecimenView[];
  lang: string;
  strings: Record<string, string>;
}

export default function HeroButterfly({ specimens, lang, strings }: Props) {
  const t = (key: string, fallback: string) => strings[key] ?? fallback;
  const featured = specimens.filter((s) => s.primaryImage).slice(0, 10);
  const index = useRotatingIndex(featured.length, ROTATE_MS);
  const active = featured[index];

  if (!active) return null;

  const href = `/${lang}/product/${active.id}`;
  const img = imageUrl(active.primaryImage as string, ['w_640', 'ar_1', 'c_fill']);

  return (
    <Link
      href={href}
      className="group relative block aspect-square w-full max-w-sm shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-sm"
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
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
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
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
