'use client';

import { useLayoutEffect } from 'react';
import { CSS_VARS, readableText, type ThemePalette } from '@/lib/theme/palette';

// Inyección en cliente: muta las variables CSS al vuelo (cambios de rubro/perfil).
// Usa useLayoutEffect para aplicar antes del paint y evitar parpadeo.
export default function CameleonThemeInjector({ palette }: { palette: ThemePalette }) {
  useLayoutEffect(() => {
    if (!palette) return;
    const root = document.documentElement;
    const applied: string[] = [];

    const set = (name: string, value?: string) => {
      if (!value) return;
      root.style.setProperty(name, value);
      applied.push(name);
    };

    set(CSS_VARS.primary, palette.primary);
    set(CSS_VARS.accent, palette.accent);
    set(CSS_VARS.surface, palette.surface);
    set(CSS_VARS.text, palette.text ?? readableText(palette.surface));

    return () => {
      for (const name of applied) root.style.removeProperty(name);
    };
  }, [palette.primary, palette.accent, palette.surface, palette.text]);

  return null;
}
