'use client';

// Catálogo legado: misma fuente dinámica que el escaparate (Supabase + realtime).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import SecureMediaViewer from '@/components/SecureMediaViewer';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { imageUrl } from '@/lib/cloudinary/url';
import { loadCatalogRows } from '@/lib/specimens/catalog';
import { toSpecimenView, type SpecimenView } from '@/lib/specimens/view';
import { useLiveSpecimens } from '@/lib/specimens/useLiveSpecimens';

export default function CataloguePage() {
  const [initial, setInitial] = useState<SpecimenView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { specimens, mode } = useLiveSpecimens(initial);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { rows, error: loadError } = await loadCatalogRows(supabase);
        if (!alive) return;
        setInitial(rows.map(toSpecimenView));
        setError(loadError);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="animate-pulse text-xl">Cargando catálogos...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo vivo</h1>
        <p className="text-xs text-white/50">
          {specimens.length} especímenes · sync {mode}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {specimens.map((specimen) => {
          const taxonLabel = [specimen.family, specimen.genus].filter(Boolean).join(' · ');
          return (
            <Link
              key={specimen.id}
              href={`/es/product/${specimen.id}`}
              className="block space-y-3 rounded-xl border border-white/10 p-4 transition hover:border-emerald-500/40"
            >
              {specimen.primaryImage ? (
                <SecureMediaViewer
                  mediaUrl={imageUrl(specimen.primaryImage, ['w_640', 'c_fit'])}
                  specimenName={specimen.scientificName}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-white/5 text-sm text-white/40">
                  Sin media
                </div>
              )}
              <div>
                <p className="font-medium italic">{specimen.scientificName}</p>
                {taxonLabel ? <p className="text-sm text-white/60">{taxonLabel}</p> : null}
                <p className="mt-1 text-xs text-white/40">
                  {[specimen.country, specimen.sex, specimen.grade].filter(Boolean).join(' · ')}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
