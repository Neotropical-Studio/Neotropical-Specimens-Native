'use client';

// MediaGalleryLoader — wrapper que carga los datos de la galería desde la API
// y pasa los items al componente MediaGallery con filtros.
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import MediaGallery, { type GalleryItem } from './MediaGallery';

export default function MediaGalleryLoader() {
  const [items,   setItems]   = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch('/api/admin/media-gallery', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (!cancelled) setItems(data.items ?? []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-sm text-neutral-500">
        <Loader2 size={16} className="animate-spin" /> Cargando galería…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 rounded-xl border border-red-900/40 bg-red-950/20 text-sm text-red-400">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  return <MediaGallery items={items} />;
}
