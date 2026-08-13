'use client';

// ============================================================================
// Sincronización en vivo del inventario de especímenes (Supabase → UI).
// Misma lógica que usaba SpecimenExplorer, extraída para que el escaparate
// (Hero) y el catálogo compartan un único stream: cuando se sube un producto
// real (Cloudinary + taxonomía), aparece solo — sin tocar código ni
// recargar. Failover: WebSocket → sondeo periódico si el WS no conecta.
// ============================================================================
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView, type SpecimenView } from '@/lib/specimens/view';

const WS_GRACE_MS = 8_000;
const POLL_MS = 60_000;

export type LiveSyncMode = 'ws' | 'poll' | 'off';

export function useLiveSpecimens(initial: SpecimenView[]): {
  specimens: SpecimenView[];
  mode: LiveSyncMode;
} {
  const [specimens, setSpecimens] = useState<SpecimenView[]>(initial);
  const [mode, setMode] = useState<LiveSyncMode>('off');

  // Si el servidor entrega datos frescos (navegación), alinea el estado local.
  useEffect(() => {
    setSpecimens(initial);
  }, [initial]);

  useEffect(() => {
    let active = true;
    let cleanup = () => {};

    // Fuera del critical path: no competir con el primer paint de la portada.
    const bootDelayMs = 4_000;
    const boot = window.setTimeout(() => {
      try {
        const supabase = getSupabaseBrowser();

        const refresh = async () => {
          const { rows } = await loadCatalogRows(supabase);
          if (!active) return;
          // Conservar filas sintéticas node-media (covers de categoría).
          setSpecimens((prev) => {
            const nodeMedia = prev.filter((s) => s.id.startsWith('node-media:'));
            const live = rows.map(toSpecimenView);
            return [...live, ...nodeMedia];
          });
        };

        let subscribed = false;
        let poll: ReturnType<typeof setInterval> | null = null;
        const startPolling = () => {
          if (poll || !active) return;
          poll = setInterval(refresh, POLL_MS);
          setMode('poll');
        };
        const stopPolling = () => {
          if (poll) clearInterval(poll);
          poll = null;
        };

        const channel = supabase
          .channel('specimens-live-showcase')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'specimens' },
            () => {
              void refresh();
            },
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'specimen_media' },
            () => {
              void refresh();
            },
          )
          .subscribe((status) => {
            if (!active) return;
            if (status === 'SUBSCRIBED') {
              subscribed = true;
              stopPolling();
              setMode('ws');
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              subscribed = false;
              startPolling();
            }
          });

        const grace = setTimeout(() => {
          if (active && !subscribed) startPolling();
        }, WS_GRACE_MS);

        cleanup = () => {
          clearTimeout(grace);
          stopPolling();
          supabase.removeChannel(channel);
        };
      } catch {
        setMode('off');
      }
    }, bootDelayMs);

    return () => {
      active = false;
      clearTimeout(boot);
      cleanup();
    };
  }, []);

  return { specimens, mode };
}
