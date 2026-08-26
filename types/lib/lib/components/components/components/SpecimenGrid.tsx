import Image from 'next/image';
import { Specimen } from '@/types/specimen';
import { MapPin, Layers } from 'lucide-react';

interface SpecimenGridProps {
  specimens: Specimen[];
}

export function SpecimenCard({ specimen }: { specimen: Specimen }) {
  const isAvailable = specimen.stock > 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-950/30">
      
      {/* Contenedor de la Imagen con Aspect Ratio */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
        <Image
          src={specimen.image_url || '/placeholder-specimen.jpg'}
          alt={specimen.scientific_name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
        
        {/* Badge de Categoría */}
        <span className="absolute top-3 left-3 rounded-md bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
          {specimen.category}
        </span>

        {/* Badge de Stock */}
        <span
          className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md border ${
            isAvailable
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-950/80 border-rose-500/30 text-rose-400'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {isAvailable ? `${specimen.stock} disp.` : 'Agotado'}
        </span>
      </div>

      {/* Información del Espécimen */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Familia */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500/90 uppercase tracking-wider mb-1">
            <Layers className="h-3.5 w-3.5" />
            <span>{specimen.family}</span>
          </div>

          {/* Nombre Científico */}
          <h3 className="font-serif text-lg font-bold italic tracking-wide text-zinc-100 group-hover:text-emerald-300 transition-colors">
            {specimen.scientific_name}
          </h3>

          {/* Nombre Común si existe */}
          {specimen.common_name && (
            <p className="text-xs text-zinc-400 mt-0.5 capitalize">
              {specimen.common_name}
            </p>
          )}
        </div>

        {/* Footer de la tarjeta con Ubicación */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            <span className="truncate max-w-[150px]">{specimen.region}</span>
          </div>

          <button className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:bg-emerald-600 hover:text-white active:scale-95">
            Detalle
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SpecimenGrid({ specimens }: SpecimenGridProps) {
  if (specimens.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/20">
        <p className="text-zinc-400 font-medium">No se encontraron especímenes activos en la base de datos.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {specimens.map((specimen) => (
        <SpecimenCard key={specimen.id} specimen={specimen} />
      ))}
    </div>
  );
}