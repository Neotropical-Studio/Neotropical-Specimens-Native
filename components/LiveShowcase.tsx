'use client';

// ============================================================================
// Cuerpo vivo del escaparate: un solo stream de inventario (Supabase) alimenta
// Hero + catálogo. Primero las 5 ventanas de categoría; al elegir una se
// siguen las familias en el flujo jerárquico normal.
// ============================================================================
import Hero, { type HeroStats } from './Hero';
import HomeCategoryWindows from './HomeCategoryWindows';
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
  const { specimens } = useLiveSpecimens(initial);
  const stats = computeStats(specimens);
  const categories = Array.from(
    specimens.reduce((groups, specimen) => {
      const name = specimen.categoria || specimen.rubroLabel || 'catalogue';
      const current = groups.get(name) ?? {
        id: name,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        itemCount: 0,
      };
      current.itemCount += 1;
      groups.set(name, current);
      return groups;
    }, new Map<string, { id: string; name: string; slug: string; itemCount: number }>()).values(),
  );

  return (
    <>
      <Hero
        stats={stats}
        strings={strings}
        specimens={specimens}
        lang={lang}
        country={country}
      />
      {/* Parte de abajo de la portada: 5 ventanas → luego familias. */}
      <HomeCategoryWindows
        categories={categories}
        lang={lang}
      />
    </>
  );
}
