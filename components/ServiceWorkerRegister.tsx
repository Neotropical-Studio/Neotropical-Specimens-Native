'use client';

import { useEffect } from 'react';
import { BACKGROUND_SYNC_TAG } from '@/lib/pwa/config';

// Registra el service worker y agenda el background sync si está disponible.
// En /admin no registramos SW: evita cachear HTML/JSON viejo del panel CARD/VIDEO.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const path = window.location.pathname || '';
    const isAdmin = path === '/admin' || path.startsWith('/admin/');

    const register = async () => {
      try {
        if (isAdmin) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          return;
        }

        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await reg.update().catch(() => void 0);
        const sync = (
          reg as ServiceWorkerRegistration & {
            sync?: { register: (t: string) => Promise<void> };
          }
        ).sync;
        if (sync) await sync.register(BACKGROUND_SYNC_TAG).catch(() => void 0);
      } catch {
        /* SW no soportado o bloqueado */
      }
    };

    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', () => void register(), { once: true });
  }, []);

  return null;
}
