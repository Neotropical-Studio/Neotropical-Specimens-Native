import { getCategoriesSummary } from '@/lib/data';
import { Leaf, Bone, Bug, Box } from 'lucide-react';
import Link from 'next/link';

const iconMap: Record<string, any> = {
  'Especímenes secos biológicos': Bug,
  'Esqueletos de zoología': Bone,
  'Plantas secas no-CITES': Leaf,
};

export default async function CategoryCatalog() {
  const categories = await getCategoriesSummary();

  return (
    <section className="w-full">
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Rubros de Colección</h2>
        <p className="text-sm text-zinc-400">Explora las unidades biológicas agrupadas por metodología de conservación</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const Icon = iconMap[cat.category] || Box;

          return (
            <Link
              href={`#rubro-${encodeURIComponent(cat.category)}`}
              key={cat.category}
              className="group relative flex flex-col justify-between rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-6 hover:bg-zinc-900/90 hover:border-emerald-500/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  {cat.total_items} {cat.total_items === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  {cat.category}
                </h3>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
                  <span>Stock global disponible:</span>
                  <span className="font-mono font-medium text-zinc-200">{cat.total_stock} uds.</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}