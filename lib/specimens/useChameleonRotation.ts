'use client';

// ============================================================================
// Rotación camaleónica del showcase del hero: sincroniza el índice activo con
// el inventario / catálogo de rubros (o Morpho nativo si aún no hay media),
// avanza cada `intervalMs` sin recargar la página, y resuelve la paleta de
// color del espécimen activo en dos pasos —
//   1) instantáneo, por taxonomía/rubro (resolveTaxonPalette), para no
//      esperar a la imagen antes de repintar los resplandores;
//   2) refinado, extrayendo el color dominante real de su foto Cloudinary,
//      para que el efecto sea fiel al tono exacto del espécimen mostrado.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { imageUrl } from '@/lib/cloudinary/url';
import { DEFAULT_PALETTE, type ThemePalette } from '@/lib/theme/palette';
import { resolveTaxonPalette } from '@/lib/theme/taxon';
import { buildShowcasePlaylist, type ShowcaseSpecimen } from './showcasePlaylist';
import { extractDominantPaletteFromImage } from './visual';
import type { SpecimenView } from './view';

export interface ChameleonRotation {
  active: ShowcaseSpecimen;
  featured: ShowcaseSpecimen[];
  index: number;
  palette: ThemePalette;
}

/** ~10s — rota entre rubros / Morpho sin apagar el visor. */
export function useChameleonRotation(
  specimens: SpecimenView[],
  intervalMs = 10_000,
): ChameleonRotation {
  const featured = useMemo(() => buildShowcasePlaylist(specimens, 3), [specimens]);
  const [index, setIndex] = useState(0);
  const [palette, setPalette] = useState<ThemePalette>(DEFAULT_PALETTE);

  useEffect(() => {
    setIndex((i) => (i >= featured.length ? 0 : i));
  }, [featured.length]);

  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % featured.length), intervalMs);
    return () => clearInterval(id);
  }, [featured.length, intervalMs]);

  const active = featured[index] ?? featured[0];

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const taxonPalette = resolveTaxonPalette({
      order: active.order,
      family: active.family ?? active.rubroLabel,
    });
    setPalette(taxonPalette);
    if (active.primaryImage) {
      const src = active.primaryImage;
      const thumb =
        src.startsWith('/') || src.startsWith('http')
          ? src
          : imageUrl(src, ['w_160', 'ar_1:1', 'c_fill']);
      void extractDominantPaletteFromImage(thumb, taxonPalette).then((refined) => {
        if (alive) setPalette(refined);
      });
    }
    return () => {
      alive = false;
    };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { active, featured, index, palette };
}
