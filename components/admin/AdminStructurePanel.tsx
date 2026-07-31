'use client';

import { Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const RubrosRegionesPanel = dynamic(() => import('@/components/admin/RubrosRegionesPanel'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-500">
      Cargando estructura de rubros…
    </div>
  ),
});

class StructureErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || 'Error al cargar la estructura' };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-100">
          <p className="font-medium">No se pudo cargar el panel de rubros/regiones.</p>
          <p className="mt-1 text-xs text-amber-200/80">{this.state.error}</p>
          <p className="mt-3 text-xs text-neutral-400">
            Puedes seguir en{' '}
            <Link href="/admin/espejo" className="text-sky-400 underline-offset-2 hover:underline">
              Espejo C↔S
            </Link>{' '}
            para subir `_card` / `_video`.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Aísla imports pesados de roots/mirror para que no tumben el SSR de /admin. */
export default function AdminStructurePanel() {
  return (
    <StructureErrorBoundary>
      <RubrosRegionesPanel />
    </StructureErrorBoundary>
  );
}
