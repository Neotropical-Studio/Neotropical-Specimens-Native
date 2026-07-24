// app/page.tsx — Portada dinámica: consume specimens desde Supabase en tiempo
// real (sincronizados vía n8n desde Sanity/Cloudinary). Sin datos en el repo.
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import Hero, { type HeroStats } from '@/components/Hero';
import SpecimenExplorer from '@/components/SpecimenExplorer';
import { SPECIMEN_SELECT, toSpecimenView, type SpecimenRow } from '@/lib/specimens/view';

export const revalidate = 0; // siempre fresco (dinámico)

async function loadSpecimens() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return { rows: [] as SpecimenRow[], error: 'Supabase no configurado' };

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('created_at', { ascending: false });

  return { rows: (data ?? []) as SpecimenRow[], error: error?.message ?? null };
}

export default async function HomePage() {
  const { rows, error } = await loadSpecimens();
  const specimens = rows.map(toSpecimenView);

  const stats: HeroStats = {
    specimens: specimens.length,
    families: new Set(specimens.map((s) => s.family).filter(Boolean)).size,
    regions: new Set(specimens.map((s) => s.regionCode).filter(Boolean)).size,
    countries: new Set(specimens.map((s) => s.country).filter(Boolean)).size,
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface text-text-dynamic">
        <Hero stats={stats} />

        {error && (
          <div className="mx-auto mb-6 max-w-7xl px-4">
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
              No se pudo cargar el inventario en vivo: {error}
            </div>
          </div>
        )}

        <SpecimenExplorer initial={specimens} />
      </main>
    </>
  );
}
