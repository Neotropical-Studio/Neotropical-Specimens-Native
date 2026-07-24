import { paletteToStyle, resolvePalette } from '@/lib/theme/palette';

// SSR: emite las variables CSS críticas inline (:root) para eliminar el FOUC.
// Renderizar en el <head> del layout con la fuente de metadatos camaleónica.
export default function CameleonThemeStyle({
  source,
}: {
  source?: Record<string, unknown> | null;
}) {
  const palette = resolvePalette(source);
  return (
    <style
      id="cameleon-theme"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: `:root{${paletteToStyle(palette)}}` }}
    />
  );
}
