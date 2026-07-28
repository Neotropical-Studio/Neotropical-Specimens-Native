// ============================================================================
// Bandera de Perú ondeando en CSS puro. La base plana viene de flag-icons
// (`fi fi-pe`); el escudo real se dibuja aparte (ver PeruCoatOfArms) y se
// superpone sobre la franja blanca. Ambas capas se cortan en las mismas
// tiras verticales y giran juntas en rotateY dentro de un contenedor con
// `perspective`, así que el escudo ondea con la tela en vez de flotar fijo
// encima — el efecto de ola recorre la bandera completa como una sola pieza.
// ============================================================================
import type { CSSProperties } from 'react';
import 'flag-icons/css/flag-icons.css';
import PeruCoatOfArms from './PeruCoatOfArms';
import styles from './WavingFlag.module.css';

/** Estilo inline con la variable CSS `--wave-delay` que consume WavingFlag.module.css. */
interface StripStyle extends CSSProperties {
  '--wave-delay': string;
}

interface Props {
  /** Ancho total de la bandera en px. La altura se deriva a proporción 4:3 (igual que flag-icons). */
  width?: number;
  /** Cantidad de tiras verticales: más tiras = ola más suave (y más nodos DOM). */
  stripCount?: number;
  className?: string;
}

export default function WavingFlag({ width = 560, stripCount = 28, className }: Props) {
  const height = Math.round((width * 3) / 4);
  const stripWidth = width / stripCount;

  // Escudo centrado sobre la franja blanca (el tercio central de la bandera).
  // PeruCoatOfArms usa viewBox 200x280 (incluye espacio arriba para la
  // corona de laurel), así que se centra un poco más abajo del punto medio
  // para que el propio escudo (sin la corona) quede a la altura del ojo.
  const shieldHeight = height * 0.62;
  const shieldWidth = shieldHeight * (200 / 280);
  const shieldLeft = width / 2 - shieldWidth / 2;
  const shieldTop = height / 2 - shieldHeight * 0.42;

  const strips = Array.from({ length: stripCount }, (_, i) => i);

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={{ width, height }}
      role="img"
      aria-label="Bandera de Perú ondeando"
    >
      <div className={styles.flagBody} style={{ width, height }}>
        {strips.map((i) => (
          <div
            key={i}
            className={styles.strip}
            style={{
              width: stripWidth,
              // Fase repartida a lo largo de la duración de la animación según
              // la posición de la tira: así el giro de cada una llega con un
              // pequeño retraso respecto a la anterior y la ola se ve viajar
              // de izquierda a derecha en vez de parpadear todas a la vez.
              '--wave-delay': `${(i / stripCount) * -2.6}s`,
            } as StripStyle}
          >
            <div className={styles.stripCanvas} style={{ width, left: -i * stripWidth }}>
              <span aria-hidden="true" className={`fi fi-pe ${styles.flagLayer}`} />
              <PeruCoatOfArms
                className={styles.shieldLayer}
                style={{ left: shieldLeft, top: shieldTop, width: shieldWidth, height: shieldHeight }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
