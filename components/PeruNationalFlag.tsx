// ============================================================================
// Pabellón Nacional del Perú — SVG oficial (proporción 3:2).
// Tamaño compacto por defecto (w-10 ≈ 40px) para fichas de producto.
// ============================================================================

/** Ruta pública del SVG oficial (900×600 → 3:2 horizontal). */
export const PERU_PABELLON_NACIONAL_SRC = '/flags/pe-pabellon-nacional.svg';

interface Props {
  /** Ancho en px. Por defecto 40 (Tailwind w-10). */
  width?: number;
  className?: string;
  label?: string;
}

export default function PeruNationalFlag({
  width = 40,
  className = '',
  label = 'Pabellón Nacional del Perú',
}: Props) {
  const height = Math.round((width * 2) / 3);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={PERU_PABELLON_NACIONAL_SRC}
      alt={label}
      width={width}
      height={height}
      decoding="async"
      className={[
        'inline-block h-auto max-h-7 w-10 max-w-[2.5rem] shrink-0 object-contain object-center',
        'aspect-[3/2] rounded-[2px] shadow-sm ring-1 ring-white/10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height, maxWidth: width, maxHeight: height }}
    />
  );
}
