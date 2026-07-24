'use client';

import { motion } from 'framer-motion';
import { ArrowDown, Boxes, Globe2, Layers, Sparkles } from 'lucide-react';

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

export default function Hero({ stats }: { stats: HeroStats }) {
  const tiles = [
    { icon: Boxes, value: stats.specimens, label: 'Especímenes' },
    { icon: Layers, value: stats.families, label: 'Familias' },
    { icon: Globe2, value: stats.regions, label: 'Regiones' },
    { icon: Sparkles, value: stats.countries, label: 'Países de origen' },
  ];

  return (
    <section id="top" className="relative overflow-hidden pt-[68px]">
      {/* Fondo: resplandores neotropicales */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-20 h-[30rem] w-[30rem] rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,transparent_40%,rgba(0,0,0,0.6))]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 md:pb-24 md:pt-24">
        <motion.div initial="hidden" animate="show" className="max-w-3xl">
          <motion.span
            custom={0}
            variants={fade}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Catálogo dinámico en tiempo real
          </motion.span>

          <motion.h1
            custom={1}
            variants={fade}
            className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl"
          >
            Especímenes{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              neotropicales
            </span>{' '}
            de colección
          </motion.h1>

          <motion.p custom={2} variants={fade} className="mt-5 max-w-2xl text-lg text-neutral-300">
            Lepidópteros y artrópodos de la selva sudamericana, documentados con fotografía WebP
            de alta fidelidad y modelos 3D interactivos. Inventario vivo, sincronizado al instante.
          </motion.p>

          <motion.div custom={3} variants={fade} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              Explorar el catálogo <ArrowDown size={18} />
            </a>
            <a
              href="#mayorista"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Precios mayoristas
            </a>
          </motion.div>
        </motion.div>

        {/* Stat tiles */}
        <motion.div
          initial="hidden"
          animate="show"
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
    </section>
  );
}
