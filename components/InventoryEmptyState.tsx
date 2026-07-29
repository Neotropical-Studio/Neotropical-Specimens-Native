'use client';

// ============================================================================
// Empty state profesional del inventario: fondo negro, cero imágenes de
// relleno (prohibido aves/paisajes/anime/placeholders genéricos). Se usa en
// el escaparate (hero) y en el catálogo cuando Supabase no tiene especímenes
// — o aún no tienen media Cloudinary — y desaparece solo en cuanto llega
// inventario real vía la sincronización en vivo.
// ============================================================================
import { INVENTORY_RUBROS } from '@/lib/specimens/rubros';

interface Props {
  /** Variante visual: panel del hero (cuadrado) o bloque del catálogo. */
  variant?: 'hero' | 'catalog' | 'inline';
  title?: string;
  subtitle?: string;
  /** Muestra las 4 ranuras de rubro "a la espera". */
  showRubros?: boolean;
  className?: string;
}

export default function InventoryEmptyState({
  variant = 'catalog',
  title = 'Expedición en curso',
  subtitle = 'Sincronizando nuevos especímenes de los 4 rubros…',
  showRubros = true,
  className = '',
}: Props) {
  const isHero = variant === 'hero';

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'relative flex flex-col items-center justify-center overflow-hidden border border-white/10 bg-black text-center',
        isHero
          ? 'aspect-square w-full max-w-sm rounded-3xl p-8 shadow-2xl shadow-black/50'
          : variant === 'inline'
            ? 'rounded-2xl px-6 py-10'
            : 'rounded-3xl px-6 py-16 md:py-20',
        className,
      ].join(' ')}
    >
      {/* Resplandor sutil — sin foto decorativa inventada */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.08),transparent_60%)]"
      />

      <span className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Inventario en vivo
      </span>

      <h3
        className={[
          'relative font-extrabold tracking-tight text-white',
          isHero ? 'text-lg' : 'text-xl md:text-2xl',
        ].join(' ')}
      >
        {title}
      </h3>
      <p className="relative mt-2 max-w-md text-sm text-neutral-400">{subtitle}</p>

      {showRubros && (
        <ul className="relative mt-8 grid w-full max-w-lg grid-cols-2 gap-2">
          {INVENTORY_RUBROS.map((rubro) => (
            <li
              key={rubro.id}
              className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-left"
            >
              <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Rubro
              </span>
              <span className="mt-0.5 block text-xs font-medium text-neutral-300">{rubro.label}</span>
              <span className="mt-1 block font-mono text-[10px] text-neutral-600">
                A la espera de recepción
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
