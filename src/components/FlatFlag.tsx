'use client';

// ============================================================================
// Bandera plana por país. Perú → Pabellón Nacional SVG oficial (con escudo).
// Otros países → flag-icons en proporción 3:2 horizontal.
// ============================================================================
import 'flag-icons/css/flag-icons.css';
import PeruNationalFlag from '@/components/PeruNationalFlag';

interface FlatFlagProps {
  countryCode?: string;
  className?: string;
  /** Ancho en px (altura = ancho × 2/3). */
  width?: number;
}

export default function FlatFlag({ countryCode = 'pe', className = '', width = 120 }: FlatFlagProps) {
  const code = countryCode.toLowerCase();
  if (code === 'pe') {
    return <PeruNationalFlag width={width} className={className} />;
  }
  const height = Math.round((width * 2) / 3);
  return (
    <span
      className={`fi fi-${code} inline-block shrink-0 overflow-hidden rounded-sm shadow-sm ${className}`}
      style={{ width, height, backgroundSize: '100% 100%' }}
      role="img"
      aria-label={`Bandera ${code.toUpperCase()}`}
    />
  );
}
