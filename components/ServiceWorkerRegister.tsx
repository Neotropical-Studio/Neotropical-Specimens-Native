'use client';

import { useEffect } from 'react';
import { BACKGROUND_SYNC_TAG } from '@/lib/pwa/config';

// Registra el service worker y agenda el background sync si está disponible.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (t: string) => Promise<void> } }).sync;
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
