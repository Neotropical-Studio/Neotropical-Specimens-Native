'use client';

// ============================================================================
// Contador de visitantes en vivo. No cuenta hasta detectar un gesto real de
// navegador (mousemove/touchstart): un bot sin motor de eventos de puntero
// nunca lo dispara. Usa Presence de Supabase Realtime (canal efímero, sin
// tabla ni migración) para el conteo compartido entre pestañas conectadas.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { Globe2, Users } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

interface Props {
  country: string | null;
  lang: string;
  strings: Record<string, string>;
}

function regionName(country: string | null, lang: string): string | null {
  if (!country || country === 'XX') return null;
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(country) ?? country;
  } catch {
    return country;
  }
}

export default function HumanGeoCounter({ country, lang, strings }: Props) {
  const [verifiedHuman, setVerifiedHuman] = useState(false);
  const [count, setCount] = useState(0);
  const joined = useRef(false);

  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  // Un solo gesto real basta para dar por humano al visitante; no hace falta
  // seguir escuchando después.
  useEffect(() => {
    if (verifiedHuman) return;
    const onGesture = () => setVerifiedHuman(true);
    window.addEventListener('mousemove', onGesture, { once: true, passive: true });
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });
    return () => {
      window.removeEventListener('mousemove', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, [verifiedHuman]);

  useEffect(() => {
    if (!verifiedHuman || joined.current) return;
    joined.current = true;

    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>['channel']> | null = null;

    try {
      const supabase = getSupabaseBrowser();
      const key = Math.random().toString(36).slice(2);
      channel = supabase.channel('online-visitors', { config: { presence: { key } } });

      channel
        .on('presence', { event: 'sync' }, () => {
          setCount(Object.keys(channel!.presenceState()).length);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel!.track({ country: country ?? 'XX', lang });
          }
        });
    } catch {
      // Sin Supabase configurado (dev/CI): el contador simplemente no aparece.
    }

    return () => {
      channel?.unsubscribe();
    };
  }, [verifiedHuman, country, lang]);

  if (!verifiedHuman || count === 0) return null;

  const region = regionName(country, lang);

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 backdrop-blur-sm">
      <span className="flex items-center gap-1.5 text-emerald-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <Users size={13} />
        {count} {t('geo_counter.live', 'en línea ahora')}
      </span>
      {region && (
        <span className="flex items-center gap-1 text-neutral-400">
          <Globe2 size={12} />
          {region}
        </span>
      )}
      <span className="uppercase tracking-wide text-neutral-500">{lang}</span>
    </div>
  );
}
