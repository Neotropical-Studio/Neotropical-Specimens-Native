// Página de reserva servida por el service worker sin red (offline_availability).
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--color-surface,#0a0a0a)] text-[var(--color-text-dynamic,#f5f5f4)]">
      <h1 className="text-3xl font-extrabold tracking-tight">Modo sin conexión</h1>
      <p className="mt-3 max-w-md text-neutral-400">
        El nodo de borde está sincronizando en local-first. El catálogo cacheado sigue disponible;
        los cambios se reenviarán automáticamente al recuperar la señal.
      </p>
      <span className="mt-6 font-mono text-xs text-neutral-500">EntmoEdge · local_first_mesh_sync</span>
    </main>
  );
}