'use client';

// ============================================================================
// Rotación camaleónica del showcase del hero: sincroniza el índice activo con
// el inventario real (specimens llega ya cargado desde Supabase en servidor),
// reparte las fotos entre los 4 rubros del catálogo (Cloudinary ↔ Supabase),
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
import { pickFeaturedAcrossRubros } from './rubros';
import { extractDominantPaletteFromImage } from './visual';
import type { SpecimenView } from './view';

export interface ChameleonRotation {
  active: SpecimenView | null;
  featured: SpecimenView[];
  index: number;
  palette: ThemePalette;
}

export function useChameleonRotation(specimens: SpecimenView[], intervalMs = 15_000): ChameleonRotation {
  // Playlist intercalada: hasta 3 por cada uno de los 4 rubros, sólo con
  // imagen real (Cloudinary vía media_url / specimen_media).
  const featured = useMemo(() => pickFeaturedAcrossRubros(specimens, 3), [specimens]);
  const [index, setIndex] = useState(0);
  const [palette, setPalette] = useState<ThemePalette>(DEFAULT_PALETTE);

  // Si el inventario cambia en vivo (alta/baja), nunca deja el índice fuera
  // de rango.
  useEffect(() => {
    setIndex((i) => (i >= featured.length ? 0 : i));
  }, [featured.length]);

  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % featured.length), intervalMs);
    return () => clearInterval(id);
  }, [featured.length, intervalMs]);

  const active = featured[index] ?? null;

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const taxonPalette = resolveTaxonPalette({
      order: active.order,
      family: active.family ?? active.rubroLabel,
    });
    setPalette(taxonPalette);
    if (active.primaryImage) {
      void extractDominantPaletteFromImage(
        imageUrl(active.primaryImage, ['w_160', 'ar_1:1', 'c_fill']),
        taxonPalette,
      ).then((refined) => {
        if (alive) setPalette(refined);
      });
    }
    return () => {
      alive = false;
    };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { active, featured, index, palette };
}
