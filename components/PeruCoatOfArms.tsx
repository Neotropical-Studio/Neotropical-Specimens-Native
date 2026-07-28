// ============================================================================
// Escudo Nacional del Perú, simplificado a trazos pero fiel a su composición
// heráldica real: escudo partido en tres campos —
//   Arriba-izquierda (verde):  una vicuña, símbolo del reino animal.
//   Arriba-derecha (blanco):   un árbol de la quina, símbolo del reino vegetal.
//   Abajo (rojo):              una cornucopia derramando monedas de oro,
//                              símbolo del reino mineral.
// Timbrado con la corona cívica (laurel a ambos lados, cinta al centro) tal
// como aparece en la bandera de Estado. El viewBox deja espacio arriba del
// escudo para la corona: así no se superpone al campo verde y sigue siendo
// visible (verde sobre verde se perdía por completo).
// ============================================================================
import type { CSSProperties } from 'react';

const SHIELD_PATH =
  'M15,65 C15,48 35,44 100,44 C165,44 185,48 185,65 L185,148 C185,214 140,244 100,272 C60,244 15,214 15,148 Z';

interface Props {
  className?: string;
  style?: CSSProperties;
}

export default function PeruCoatOfArms({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 280" className={className} style={style} aria-hidden="true">
      <defs>
        <clipPath id="pe-shield-clip">
          <path d={SHIELD_PATH} />
        </clipPath>
      </defs>

      <g clipPath="url(#pe-shield-clip)">
        {/* Campo verde — vicuña */}
        <rect x="0" y="40" width="100" height="118" fill="#2E7D32" />
        {/* Campo blanco — quina */}
        <rect x="100" y="40" width="100" height="118" fill="#F3F3F1" />
        {/* Campo rojo — cornucopia */}
        <rect x="0" y="158" width="200" height="122" fill="#D91023" />

        {/* Vicuña, de perfil, mirando a la izquierda */}
        <g transform="translate(14,74) scale(0.95)" fill="#E9D6A8">
          <path d="M52,10 C60,6 66,10 66,18 C66,24 60,26 56,30 C62,34 66,42 64,52 L60,52 C60,44 56,38 50,36 L50,54 C50,58 52,62 52,66 L46,66 C46,62 44,58 44,54 L44,40 C36,42 30,46 26,52 L22,50 C26,42 32,36 40,32 C34,28 30,22 30,16 C30,8 38,4 46,6 C48,8 50,8 52,10 Z" />
          {/* patas */}
          <rect x="30" y="52" width="4" height="16" />
          <rect x="42" y="54" width="4" height="16" />
          <rect x="52" y="54" width="4" height="16" />
          <rect x="58" y="50" width="4" height="16" />
        </g>

        {/* Árbol de la quina */}
        <g transform="translate(122,58)">
          <rect x="20" y="46" width="6" height="26" fill="#7A4A24" />
          <ellipse cx="23" cy="30" rx="26" ry="24" fill="#3C8A46" />
          <ellipse cx="10" cy="38" rx="15" ry="14" fill="#478F51" />
          <ellipse cx="38" cy="38" rx="15" ry="14" fill="#478F51" />
        </g>

        {/* Cornucopia derramando monedas */}
        <g transform="translate(18,190)">
          <path
            d="M8,54 C2,40 4,20 20,10 C34,2 50,4 58,14 C48,10 36,10 28,18 C18,26 16,40 22,50 C26,56 34,58 40,54 C44,50 44,44 40,40 C37,44 32,44 30,40 C28,36 30,32 34,32"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* monedas derramándose */}
          <circle cx="66" cy="16" r="6" fill="#F1C232" stroke="#B8860B" strokeWidth="1.5" />
          <circle cx="80" cy="26" r="6" fill="#F1C232" stroke="#B8860B" strokeWidth="1.5" />
          <circle cx="72" cy="38" r="6" fill="#F1C232" stroke="#B8860B" strokeWidth="1.5" />
          <circle cx="88" cy="42" r="5" fill="#F1C232" stroke="#B8860B" strokeWidth="1.5" />
          <circle cx="60" cy="46" r="5" fill="#F1C232" stroke="#B8860B" strokeWidth="1.5" />
        </g>
      </g>

      {/* Contorno del escudo */}
      <path d={SHIELD_PATH} fill="none" stroke="#B8860B" strokeWidth="4" />

      {/* Corona cívica: dos ramas de laurel que nacen del centro superior del
          escudo y se abren hacia los lados, con una cinta roja al centro.
          Vive TODA por encima de y=44 (el borde superior del escudo), fuera
          del campo verde, para que no se pierda por falta de contraste. */}
      <g stroke="#3C8A46" strokeWidth="3" fill="#3C8A46" strokeLinecap="round">
        <path d="M100,42 C78,40 54,32 44,14 C41,8 41,4 43,0" fill="none" />
        <path d="M100,42 C122,40 146,32 156,14 C159,8 159,4 157,0" fill="none" />
        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const x = 100 - t * 56;
          const y = 41 - t * 38;
          return (
            <ellipse
              key={`l-${i}`}
              cx={x}
              cy={y}
              rx={7 - t * 3}
              ry={3.4}
              transform={`rotate(${-20 - t * 45} ${x} ${y})`}
            />
          );
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const x = 100 + t * 56;
          const y = 41 - t * 38;
          return (
            <ellipse
              key={`r-${i}`}
              cx={x}
              cy={y}
              rx={7 - t * 3}
              ry={3.4}
              transform={`rotate(${20 + t * 45} ${x} ${y})`}
            />
          );
        })}
      </g>
      <path d="M92,48 L100,38 L108,48 L104,62 L100,55 L96,62 Z" fill="#D91023" stroke="#B8860B" strokeWidth="1.5" />
    </svg>
  );
}
