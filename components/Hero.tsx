'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Boxes, Globe2, Layers, Sparkles } from 'lucide-react';
import HeroButterfly from './HeroButterfly';
import HumanGeoCounter from './HumanGeoCounter';
import { useChameleonRotation } from '@/lib/specimens/useChameleonRotation';
import { hexA } from '@/lib/theme/palette';
import type { SpecimenView } from '@/lib/specimens/view';

export interface HeroStats {
  specimens: number;
  families: number;
  regions: number;
  countries: number;
}

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5 } }),
};

export default function Hero({
  stats,
  strings,
  specimens,
  lang,
  country,
}: {
  stats: HeroStats;
  strings: Record<string, string>;
  specimens: SpecimenView[];
  lang: string;
  country: string | null;
}) {
  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  // Evita mismatch de hidratación: Framer no aplica `hidden` en SSR/primer paint.
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    setMotionReady(true);
  }, []);

  // Rotación camaleónica: el mismo espécimen/paleta activos alimentan tanto
  // la tarjeta de foto (HeroButterfly) como los resplandores de fondo de
  // abajo, así ambos cambian de tono en sincronía cada vez que rota.
  const { active, featured, index, palette } = useChameleonRotation(specimens);

  const tiles = [
    { icon: Boxes, value: stats.specimens, label: t('hero.stat_specimens', 'Especímenes') },
    { icon: Layers, value: stats.families, label: t('hero.stat_families', 'Familias') },
    { icon: Globe2, value: stats.regions, label: t('hero.stat_regions', 'Regiones') },
    { icon: Sparkles, value: stats.countries, label: t('hero.stat_countries', 'Países de origen') },
  ];

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Fondo: resplandores camaleónicos — su color sigue al espécimen
          activo del showcase (paleta por taxonomía, refinada con el color
          dominante real de su foto), con una transición larga y suave para
          que el cambio de tono se sienta vivo y no como un parpadeo. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full blur-[120px] transition-colors duration-[1600ms]"
          style={{ backgroundColor: hexA(palette.primary, 0.22) }}
        />
        <div
          className="absolute -right-32 top-20 h-[30rem] w-[30rem] rounded-full blur-[120px] transition-colors duration-[1600ms]"
          style={{ backgroundColor: hexA(palette.accent, 0.2) }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-[100px] transition-colors duration-[1600ms]"
          style={{ backgroundColor: hexA(palette.primary, 0.12) }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,transparent_40%,rgba(0,0,0,0.6))]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-16 md:pb-24 md:pt-24 lg:flex-row lg:items-center lg:justify-between lg:gap-14">
        <div className="min-w-0 flex-1">
        <motion.div
          initial={motionReady ? 'hidden' : false}
          animate={motionReady ? 'show' : undefined}
          className="max-w-3xl"
        >
          <motion.div custom={0} variants={fade} className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t('hero.badge', 'Catálogo dinámico en tiempo real')}
            </span>
            <HumanGeoCounter country={country} lang={lang} strings={strings} />
          </motion.div>

          <motion.h1
            custom={1}
            variants={fade}
            className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl"
          >
            {/* Titular en tres claves: el término resaltado se traduce aparte
                para no meter marcado dentro de una cadena traducible. */}
            {t('hero.title_before', 'Especímenes')}{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              {t('hero.title_highlight', 'neotropicales')}
            </span>{' '}
            {t('hero.title_after', 'de colección')}
          </motion.h1>

          <motion.p custom={2} variants={fade} className="mt-5 max-w-2xl text-lg text-neutral-300">
            {t(
              'hero.subtitle',
              'Lepidópteros y artrópodos de la selva sudamericana, documentados con fotografía WebP de alta fidelidad y modelos 3D interactivos. Inventario vivo, sincronizado al instante.',
            )}
          </motion.p>

          <motion.div custom={3} variants={fade} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              {t('hero.cta_explore', 'Explorar el catálogo')} <ArrowDown size={18} />
            </a>
            <a
              href="#mayorista"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              {t('hero.cta_wholesale', 'Precios mayoristas')}
            </a>
          </motion.div>
        </motion.div>

        {/* Stat tiles */}
        <motion.div
          initial={motionReady ? 'hidden' : false}
          animate={motionReady ? 'show' : undefined}
          className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
        >
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              custom={i + 4}
              variants={fade}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
            >
              <t.icon size={20} className="text-emerald-400" />
              <div className="mt-3 text-3xl font-extrabold tabular-nums text-white">{t.value}</div>
              <div className="text-sm text-neutral-400">{t.label}</div>
            </motion.div>
          ))}
        </motion.div>
        </div>

        {/* Visor camaleónico siempre activo: inventario real por rubro, o
            covers de catálogo / Morpho nativo si aún no hay stock con foto. */}
        <div className="flex w-full max-w-sm shrink-0 justify-center self-center lg:justify-end lg:self-auto">
          <HeroButterfly
            active={active}
            featured={featured}
            index={index}
            palette={palette}
            lang={lang}
            strings={strings}
          />
        </div>
      </div>
    </section>
  );
}
