import StatsSection from '@/components/StatsSection';
import CategoryCatalog from '@/components/CategoryCatalog';
import SpecimenGrid from '@/components/SpecimenGrid';
import { getSpecimens } from '@/lib/data';

// Evita almacenamiento en caché estático desactualizado al agregar nuevos registros a Neon
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const specimens = await getSpecimens();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* Background Glow Efecto Científico */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-900/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* Header Principal */}
        <header className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Repositorio Científico Neotropical
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-sans">
            Neotropical <span className="text-emerald-400">Specimens</span>
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed font-light">
            Base de datos unificada para la preservación, catalogación taxonómica y consulta de material biológico y osteológico neotropical.
          </p>
        </header>

        {/* 1. Métricas / Stats Live */}
        <StatsSection />

        {/* 2. Catálogo de Rubros */}
        <CategoryCatalog />

        {/* 3. Grid de Especies */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Catálogo General</h2>
              <p className="text-sm text-zinc-400">Registro fotográfico y taxonómico de la colección</p>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              Mostrando {specimens.length} especímenes
            </span>
          </div>

          <SpecimenGrid specimens={specimens} />
        </section>

      </div>
    </main>
  );
}