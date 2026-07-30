'use client';

// ============================================================================
// Empty state del catálogo (no del hero): fondo negro, sin placeholders.
// El visor camaleónico del hero nunca usa este panel — rota Morpho / rubros
// aunque el inventario aún esté vacío. Aquí solo el grid del catálogo.
// ============================================================================
import { INVENTORY_RUBROS } from '@/lib/specimens/rubros';

interface Props {
  /** Variante visual: bloque del catálogo o inline de búsqueda. */
  variant?: 'catalog' | 'inline';
  title?: string;
  subtitle?: string;
  /** Muestra las ranuras de rubro. */
  showRubros?: boolean;
  className?: string;
}

export default function InventoryEmptyState({
  variant = 'catalog',
  title = 'Catálogo en sincronización',
  subtitle = 'Las fichas aparecerán al sincronizar especímenes con foto Cloudinary.',
  showRubros = true,
  className = '',
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'relative flex flex-col items-center justify-center overflow-hidden border border-white/10 bg-black text-center',
        variant === 'inline'
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

      <h3 className="relative text-xl font-extrabold tracking-tight text-white md:text-2xl">
        {title}
      </h3>
      <p className="relative mt-2 max-w-md text-sm text-neutral-400">{subtitle}</p>

      {showRubros && (
        <ul className="relative mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
          {INVENTORY_RUBROS.map((rubro) => (
            <li
              key={rubro.id}
              className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-left"
            >
              <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Rubro
              </span>
              <span className="mt-0.5 block text-xs font-medium text-neutral-300">{rubro.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
