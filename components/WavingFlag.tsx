// ============================================================================
// Bandera de Perú ondeando: usa el Pabellón Nacional SVG oficial
// (public/flags/pe-pabellon-nacional.svg) cortado en tiras — sin escudo inventado.
// ============================================================================
import type { CSSProperties } from 'react';
import { PERU_PABELLON_NACIONAL_SRC } from './PeruNationalFlag';
import styles from './WavingFlag.module.css';

/** Estilo inline con la variable CSS `--wave-delay` que consume WavingFlag.module.css. */
interface StripStyle extends CSSProperties {
  '--wave-delay': string;
}

interface Props {
  /** Ancho total de la bandera en px. Altura = ancho × 2/3 (proporción 3:2). */
  width?: number;
  stripCount?: number;
  className?: string;
}

export default function WavingFlag({ width = 560, stripCount = 28, className }: Props) {
  const height = Math.round((width * 2) / 3);
  const stripWidth = width / stripCount;
  const strips = Array.from({ length: stripCount }, (_, i) => i);

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={{ width, height }}
      role="img"
      aria-label="Pabellón Nacional del Perú ondeando"
    >
      <div className={styles.flagBody} style={{ width, height }}>
        {strips.map((i) => (
          <div
            key={i}
            className={styles.strip}
            style={{
              width: stripWidth,
              '--wave-delay': `${(i / stripCount) * -2.6}s`,
            } as StripStyle}
          >
            <div className={styles.stripCanvas} style={{ width, left: -i * stripWidth }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PERU_PABELLON_NACIONAL_SRC}
                alt=""
                aria-hidden="true"
                className={styles.flagLayer}
                style={{ width, height }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
