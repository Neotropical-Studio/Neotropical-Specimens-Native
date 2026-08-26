import { getCollectionStats } from '@/lib/data';
import { Layers, Dna, MapPin } from 'lucide-react';

export default async function StatsSection() {
  const stats = await getCollectionStats();

  const statCards = [
    {
      label: 'Especímenes Registrados',
      value: stats.total_specimens.toLocaleString(),
      subtext: 'Catalogados en el herbario & museo',
      icon: Layers,
      accent: 'emerald',
    },
    {
      label: 'Familias Taxonómicas',
      value: stats.total_families.toLocaleString(),
      subtext: 'Biodiversidad neotropical',
      icon: Dna,
      accent: 'teal',
    },
    {
      label: 'Regiones Muestreadas',
      value: stats.total_regions.toLocaleString(),
      subtext: 'Ecorregiones georreferenciadas',
      icon: MapPin,
      accent: 'emerald',
    },
  ];

  return (
    <section className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-950/20"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-400">{card.label}</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
                  {card.value}
                </span>
                <span className="text-xs font-semibold text-emerald-400/80 uppercase tracking-widest">
                  Live
                </span>
              </div>

              <p className="mt-2 text-xs text-zinc-500 font-light">{card.subtext}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}