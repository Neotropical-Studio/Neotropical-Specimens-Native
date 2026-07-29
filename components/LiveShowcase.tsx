'use client';

// ============================================================================
// Cuerpo vivo del escaparate: un solo stream de inventario (Supabase) alimenta
// Hero + catálogo. Empty states profesionales cuando no hay data; aparición
// automática de productos reales en cuanto se sincronizan (Cloudinary +
// taxonomía), sin tocar el código.
// ============================================================================
import Hero, { type HeroStats } from './Hero';
import SpecimenExplorer from './SpecimenExplorer';
import { useLiveSpecimens } from '@/lib/specimens/useLiveSpecimens';
import type { SpecimenView } from '@/lib/specimens/view';

interface Props {
  initial: SpecimenView[];
  strings: Record<string, string>;
  lang: string;
  country: string | null;
}

function computeStats(specimens: SpecimenView[]): HeroStats {
  return {
    specimens: specimens.length,
    families: new Set(specimens.map((s) => s.family).filter(Boolean)).size,
    regions: new Set(specimens.map((s) => s.regionCode).filter(Boolean)).size,
    countries: new Set(specimens.map((s) => s.country).filter(Boolean)).size,
  };
}

export default function LiveShowcase({ initial, strings, lang, country }: Props) {
  const { specimens, mode } = useLiveSpecimens(initial);
  const stats = computeStats(specimens);

  return (
    <>
      <Hero
        stats={stats}
        strings={strings}
        specimens={specimens}
        lang={lang}
        country={country}
      />
      <SpecimenExplorer initial={specimens} strings={strings} lang={lang} syncMode={mode} liveOwned />
    </>
  );
}
