'use client';

// MediaGallery — galería clasificada de fotos, videos y modelos 3D.
// Filtros: tipo de medio · rubro (kind) · familia · especie
// Datos vienen de la API /api/admin/media-gallery
import { useMemo, useState, useEffect } from 'react';
import { ImageIcon, Box, Video, X, SlidersHorizontal, ExternalLink } from 'lucide-react';
import { imageUrl, videoMp4, modelUrl } from '@/lib/cloudinary/url';

export type GalleryItem = {
  id:           string;
  specimenId:   string;
  publicId:     string;
  mediaType:    'photo_webp' | 'video_mp4' | 'model_3d_glb';
  view:         string | null;
  displayOrder: number;
  // enriched from specimens
  code:         string;
  family:       string | null;
  kind:         string | null;   // rubro
  species:      string | null;   // nombre_cientifico
  commonName:   string | null;
  secureUrl?:   string;
};

type MediaFilter = 'all' | 'photo_webp' | 'video_mp4' | 'model_3d_glb';

const TYPE_ICON: Record<string, React.ReactNode> = {
  photo_webp:   <ImageIcon size={12} />,
  video_mp4:    <Video size={12} />,
  model_3d_glb: <Box size={12} />,
};

const TYPE_LABEL: Record<string, string> = {
  photo_webp:   'Foto',
  video_mp4:    'Video',
  model_3d_glb: '3D',
};

const TYPE_COLOR: Record<string, string> = {
  photo_webp:   'text-emerald-400',
  video_mp4:    'text-blue-400',
  model_3d_glb: 'text-purple-400',
};

function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition ${
        active
          ? 'bg-emerald-600 text-white'
          : 'border border-neutral-700 text-neutral-400 hover:border-emerald-600 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function MediaThumb({ item }: { item: GalleryItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-emerald-700"
        onClick={() => setOpen(true)}
      >
        {/* Thumbnail */}
        <div className="aspect-square overflow-hidden bg-neutral-950">
          {item.mediaType === 'photo_webp' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(item.publicId, ['w_300', 'c_fill', 'g_auto'])}
              alt={item.species ?? item.code}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : item.mediaType === 'video_mp4' ? (
            <video
              src={videoMp4(item.publicId)}
              className="h-full w-full object-cover"
              muted
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Box size={32} className="text-purple-500 opacity-70" />
            </div>
          )}
        </div>

        {/* Overlay info */}
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[10px] text-neutral-300">{item.code}</span>
            <span className={`flex items-center gap-0.5 text-[10px] ${TYPE_COLOR[item.mediaType]}`}>
              {TYPE_ICON[item.mediaType]}
              {TYPE_LABEL[item.mediaType]}
            </span>
          </div>
          {item.view && (
            <div className="text-[9px] capitalize text-neutral-500">{item.view}</div>
          )}
          {item.species && (
            <div className="mt-0.5 truncate text-[10px] italic text-neutral-400">{item.species}</div>
          )}
          <div className="mt-0.5 flex gap-1.5">
            {item.family && (
              <span className="rounded bg-neutral-800 px-1 text-[9px] text-neutral-500">{item.family}</span>
            )}
            {item.kind && (
              <span className="rounded bg-neutral-800/60 px-1 text-[9px] text-neutral-600">{item.kind}</span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
          <div
            className="max-h-[90vh] max-w-3xl overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {item.mediaType === 'photo_webp' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(item.publicId, ['w_1200', 'c_fit', 'q_auto'])}
                alt={item.species ?? item.code}
                className="max-h-[85vh] rounded-xl object-contain"
              />
            ) : item.mediaType === 'video_mp4' ? (
              <video
                src={videoMp4(item.publicId)}
                controls
                autoPlay
                className="max-h-[85vh] w-full rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-700 bg-neutral-900 p-12">
                <Box size={64} className="text-purple-400" />
                <p className="text-sm text-neutral-300">Modelo 3D: {item.code}</p>
                <a
                  href={modelUrl(item.publicId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-purple-700 px-4 py-2 text-sm text-purple-300 hover:bg-purple-900/30"
                >
                  <ExternalLink size={14} />
                  Descargar / abrir GLB
                </a>
              </div>
            )}
            <div className="mt-2 text-center">
              <p className="font-mono text-xs text-neutral-400">{item.code}</p>
              {item.species && <p className="text-xs italic text-neutral-500">{item.species}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MediaGallery({ items }: { items: GalleryItem[] }) {
  const [typeFilter, setTypeFilter] = useState<MediaFilter>('all');
  const [family,   setFamily]   = useState<string | null>(null);
  const [kind,     setKind]     = useState<string | null>(null);
  const [species,  setSpecies]  = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Unique values for filter chips
  const families   = useMemo(() => [...new Set(items.map((i) => i.family).filter(Boolean))].sort() as string[], [items]);
  const kinds      = useMemo(() => [...new Set(items.map((i) => i.kind).filter(Boolean))].sort() as string[], [items]);
  const speciesList = useMemo(() => {
    const base = family
      ? items.filter((i) => i.family === family)
      : kind
        ? items.filter((i) => i.kind === kind)
        : items;
    return [...new Set(base.map((i) => i.species).filter(Boolean))].sort() as string[];
  }, [items, family, kind]);

  // Reset species if family/kind changes
  useEffect(() => { setSpecies(null); }, [family, kind]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (typeFilter !== 'all' && i.mediaType !== typeFilter)   return false;
      if (family  && i.family  !== family)                      return false;
      if (kind    && i.kind    !== kind)                        return false;
      if (species && i.species !== species)                     return false;
      if (q && ![i.code, i.family, i.kind, i.species, i.commonName, i.view]
        .filter(Boolean).join(' ').toLowerCase().includes(q))   return false;
      return true;
    });
  }, [items, typeFilter, family, kind, species, search]);

  const hasFilters = typeFilter !== 'all' || family || kind || species || search;

  function clearAll() {
    setTypeFilter('all');
    setFamily(null);
    setKind(null);
    setSpecies(null);
    setSearch('');
  }

  return (
    <div className="space-y-4">
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar código, especie, familia…"
          className="h-9 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-600 focus:outline-none"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
            showFilters || hasFilters
              ? 'border-emerald-600 text-emerald-400'
              : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {hasFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
              {[typeFilter !== 'all', family, kind, species, search].filter(Boolean).length}
            </span>
          )}
        </button>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-neutral-500 hover:text-white">
            <X size={14} />
          </button>
        )}
        <span className="text-xs text-neutral-500">{results.length} activos</span>
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────── */}
      {showFilters && (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          {/* Type */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Tipo</p>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'photo_webp', 'video_mp4', 'model_3d_glb'] as const).map((t) => (
                <Chip
                  key={t}
                  label={t === 'all' ? 'Todos' : TYPE_LABEL[t]}
                  active={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                />
              ))}
            </div>
          </div>

          {/* Rubros */}
          {kinds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Rubro</p>
              <div className="flex flex-wrap gap-1.5">
                {kinds.map((k) => (
                  <Chip key={k} label={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)} />
                ))}
              </div>
            </div>
          )}

          {/* Familias */}
          {families.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Familia</p>
              <div className="flex flex-wrap gap-1.5">
                {families.map((f) => (
                  <Chip key={f} label={f} active={family === f} onClick={() => setFamily(family === f ? null : f)} />
                ))}
              </div>
            </div>
          )}

          {/* Especies — conditional on selected family/kind */}
          {speciesList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Especie {family ? `(${family})` : kind ? `(${kind})` : ''}
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {speciesList.map((sp) => (
                  <Chip key={sp} label={sp} active={species === sp} onClick={() => setSpecies(species === sp ? null : sp)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {results.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-800 text-sm text-neutral-600">
          {hasFilters ? 'Sin resultados para estos filtros.' : 'No hay archivos multimedia cargados aún.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((item) => (
            <MediaThumb key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
