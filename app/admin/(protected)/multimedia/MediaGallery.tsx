'use client';

// Galería clasificada: filtros rubro → categoría → familia → género → especie → subespecie.
// Paginación: 10 especies por página, A–Z, actualización automática al cambiar página.
import { useEffect, useMemo, useState } from 'react';
import {
  ImageIcon,
  Box,
  Video,
  X,
  SlidersHorizontal,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import AdminCardsPager from '@/components/admin/AdminCardsPager';
import { imageUrl, videoMp4, modelUrl } from '@/lib/cloudinary/url';
import { deleteMediaAssetAction } from './actions';

export type GalleryItem = {
  id: string;
  specimenId: string;
  publicId: string;
  mediaType: 'photo_webp' | 'video_mp4' | 'model_3d_glb' | string;
  view: string | null;
  displayOrder: number;
  code: string;
  family: string | null;
  genus?: string | null;
  speciesEpithet?: string | null;
  subspecies?: string | null;
  category?: string | null;
  kind: string | null;
  species: string | null;
  commonName: string | null;
  secureUrl?: string | null;
};

type MediaFilter = 'all' | 'photo_webp' | 'video_mp4' | 'model_3d_glb';

const SPECIES_PER_PAGE = 10;

const TYPE_ICON: Record<string, React.ReactNode> = {
  photo_webp: <ImageIcon size={12} />,
  video_mp4: <Video size={12} />,
  model_3d_glb: <Box size={12} />,
};

const TYPE_LABEL: Record<string, string> = {
  photo_webp: 'Foto',
  video_mp4: 'Video',
  model_3d_glb: '3D',
};

const TYPE_COLOR: Record<string, string> = {
  photo_webp: 'text-emerald-400',
  video_mp4: 'text-blue-400',
  model_3d_glb: 'text-purple-400',
};

function alpha(a: string, b: string) {
  return a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v?.trim())))].sort(alpha);
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  allLabel = 'Todas',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allLabel?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs normal-case text-neutral-100"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function MediaThumb({
  item,
  onDeleted,
}: {
  item: GalleryItem;
  onDeleted?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !window.confirm(
        `¿Eliminar este medio?\n${item.publicId}\n(${TYPE_LABEL[item.mediaType] ?? item.mediaType})`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteMediaAssetAction(
        item.specimenId,
        item.publicId,
        item.mediaType === 'video_mp4'
          ? 'video'
          : item.mediaType === 'model_3d_glb'
            ? 'raw'
            : 'image',
      );
      onDeleted?.(item.id);
      setOpen(false);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-emerald-700"
        onClick={() => setOpen(true)}
      >
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

        <button
          type="button"
          disabled={deleting}
          onClick={(e) => void handleDelete(e)}
          className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded border border-red-800 bg-black/75 px-1.5 py-1 text-[10px] font-semibold text-red-200 opacity-90 hover:bg-red-950 disabled:opacity-40"
          title="Eliminar"
        >
          <Trash2 size={11} />
          {deleting ? '…' : 'Eliminar'}
        </button>

        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[10px] text-neutral-300">{item.code}</span>
            <span
              className={`flex items-center gap-0.5 text-[10px] ${TYPE_COLOR[item.mediaType] ?? 'text-neutral-400'}`}
            >
              {TYPE_ICON[item.mediaType]}
              {TYPE_LABEL[item.mediaType] ?? item.mediaType}
            </span>
          </div>
          {item.view ? (
            <div className="text-[9px] capitalize text-neutral-500">{item.view}</div>
          ) : null}
          {item.species ? (
            <div className="mt-0.5 truncate text-[10px] italic text-neutral-400">
              {item.species}
            </div>
          ) : null}
          <div className="mt-0.5 flex flex-wrap gap-1">
            {item.family ? (
              <span className="rounded bg-neutral-800 px-1 text-[9px] text-neutral-500">
                {item.family}
              </span>
            ) : null}
            {item.genus ? (
              <span className="rounded bg-neutral-800 px-1 text-[9px] text-neutral-500">
                {item.genus}
              </span>
            ) : null}
            {item.subspecies ? (
              <span className="rounded bg-violet-950 px-1 text-[9px] text-violet-300">
                ssp. {item.subspecies}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
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
            <div className="mt-2 flex flex-col items-center gap-2 text-center">
              <p className="font-mono text-xs text-neutral-400">{item.code}</p>
              {item.species ? (
                <p className="text-xs italic text-neutral-500">{item.species}</p>
              ) : null}
              <button
                type="button"
                disabled={deleting}
                onClick={(e) => void handleDelete(e)}
                className="inline-flex items-center gap-1.5 rounded border border-red-800 bg-red-950/70 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900 disabled:opacity-40"
              >
                <Trash2 size={12} />
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function MediaGallery({ items: initialItems }: { items: GalleryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [typeFilter, setTypeFilter] = useState<MediaFilter>('all');
  const [rubro, setRubro] = useState('');
  const [category, setCategory] = useState('');
  const [family, setFamily] = useState('');
  const [genus, setGenus] = useState('');
  const [species, setSpecies] = useState('');
  const [subspecies, setSubspecies] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SPECIES_PER_PAGE);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const rubros = useMemo(
    () => uniqueSorted(items.map((i) => i.kind ?? i.category)),
    [items],
  );

  const categories = useMemo(() => {
    const scoped = rubro
      ? items.filter((i) => (i.kind ?? i.category) === rubro)
      : items;
    return uniqueSorted(scoped.map((i) => i.category));
  }, [items, rubro]);

  const families = useMemo(() => {
    const scoped = items.filter((i) => {
      if (rubro && (i.kind ?? i.category) !== rubro) return false;
      if (category && i.category !== category) return false;
      return true;
    });
    return uniqueSorted(scoped.map((i) => i.family));
  }, [items, rubro, category]);

  const genera = useMemo(() => {
    const scoped = items.filter((i) => {
      if (rubro && (i.kind ?? i.category) !== rubro) return false;
      if (category && i.category !== category) return false;
      if (family && i.family !== family) return false;
      return true;
    });
    return uniqueSorted(scoped.map((i) => i.genus));
  }, [items, rubro, category, family]);

  const speciesList = useMemo(() => {
    const scoped = items.filter((i) => {
      if (rubro && (i.kind ?? i.category) !== rubro) return false;
      if (category && i.category !== category) return false;
      if (family && i.family !== family) return false;
      if (genus && i.genus !== genus) return false;
      return true;
    });
    return uniqueSorted(scoped.map((i) => i.speciesEpithet ?? i.species));
  }, [items, rubro, category, family, genus]);

  const subspeciesList = useMemo(() => {
    const scoped = items.filter((i) => {
      if (rubro && (i.kind ?? i.category) !== rubro) return false;
      if (category && i.category !== category) return false;
      if (family && i.family !== family) return false;
      if (genus && i.genus !== genus) return false;
      if (species && (i.speciesEpithet ?? i.species) !== species) return false;
      return true;
    });
    return uniqueSorted(scoped.map((i) => i.subspecies));
  }, [items, rubro, category, family, genus, species]);

  // Cascada: al cambiar un nivel superior, limpiar inferiores.
  useEffect(() => {
    setCategory('');
    setFamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [rubro]);

  useEffect(() => {
    setFamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [category]);

  useEffect(() => {
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [family]);

  useEffect(() => {
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [genus]);

  useEffect(() => {
    setSubspecies('');
    setPage(1);
  }, [species]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => {
        if (typeFilter !== 'all' && i.mediaType !== typeFilter) return false;
        if (rubro && (i.kind ?? i.category) !== rubro) return false;
        if (category && i.category !== category) return false;
        if (family && i.family !== family) return false;
        if (genus && i.genus !== genus) return false;
        if (species && (i.speciesEpithet ?? i.species) !== species) return false;
        if (subspecies && i.subspecies !== subspecies) return false;
        if (q) {
          const hay = [
            i.code,
            i.family,
            i.genus,
            i.species,
            i.speciesEpithet,
            i.subspecies,
            i.category,
            i.kind,
            i.commonName,
            i.view,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        alpha(a.species ?? a.code ?? '', b.species ?? b.code ?? ''),
      );
  }, [
    items,
    typeFilter,
    rubro,
    category,
    family,
    genus,
    species,
    subspecies,
    search,
  ]);

  /** Claves de especie A–Z (paginación por especie, no por archivo). */
  const speciesKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const i of filtered) {
      keys.add(i.species ?? i.code ?? i.specimenId ?? i.id);
    }
    return [...keys].sort(alpha);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(speciesKeys.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageSpeciesKeys = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return new Set(speciesKeys.slice(start, start + pageSize));
  }, [speciesKeys, safePage, pageSize]);

  const pageItems = useMemo(
    () =>
      filtered.filter((i) =>
        pageSpeciesKeys.has(i.species ?? i.code ?? i.specimenId ?? i.id),
      ),
    [filtered, pageSpeciesKeys],
  );

  const hasFilters =
    typeFilter !== 'all' ||
    Boolean(rubro || category || family || genus || species || subspecies || search);

  function clearAll() {
    setTypeFilter('all');
    setRubro('');
    setCategory('');
    setFamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setSearch('');
    setPage(1);
  }

  const activeFilterCount = [
    typeFilter !== 'all',
    rubro,
    category,
    family,
    genus,
    species,
    subspecies,
    search,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-[11px] leading-relaxed text-emerald-200/95">
        <strong className="text-emerald-300">Modo automático ON:</strong> al GRABAR foto de
        espécimen → cutout + nitidez + peso bajo. Video Blender → MP4/HLS liviano. 3D (.glb)
        se etiqueta y guarda. Hot folder:{' '}
        <code className="text-emerald-100">python scripts/auto_studio_daemon.py</code>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar código, género, especie, subespecie…"
          className="h-9 min-w-[12rem] flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
            showFilters || hasFilters
              ? 'border-emerald-600 text-emerald-400'
              : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeFilterCount > 0 ? (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-neutral-500 hover:text-white"
          >
            <X size={14} />
          </button>
        ) : null}
        <span className="text-xs text-neutral-500">
          {speciesKeys.length} especies · {filtered.length} archivos · A–Z · {pageSize}/pág
        </span>
      </div>

      {showFilters ? (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Tipo de medio
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'photo_webp', 'video_mp4', 'model_3d_glb'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    typeFilter === t
                      ? 'bg-emerald-600 text-white'
                      : 'border border-neutral-700 text-neutral-400 hover:border-emerald-600 hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Todos' : TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SelectFilter
              label="Rubro"
              value={rubro}
              options={rubros}
              onChange={setRubro}
              allLabel="Todos"
            />
            <SelectFilter
              label="Categoría"
              value={category}
              options={categories}
              onChange={setCategory}
            />
            <SelectFilter
              label="Familia"
              value={family}
              options={families}
              onChange={setFamily}
            />
            <SelectFilter
              label="Género"
              value={genus}
              options={genera}
              onChange={setGenus}
              allLabel="Todos"
            />
            <SelectFilter
              label="Especie"
              value={species}
              options={speciesList}
              onChange={setSpecies}
              allLabel="Todas"
            />
            <SelectFilter
              label="Subespecie"
              value={subspecies}
              options={subspeciesList}
              onChange={setSubspecies}
              allLabel="Todas"
            />
          </div>
        </div>
      ) : null}

      <div id="media-gallery-species" key={`media-page-${safePage}-${pageSize}`}>
        {pageItems.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-800 text-sm text-neutral-600">
            {hasFilters
              ? 'Sin resultados para estos filtros.'
              : 'No hay archivos multimedia cargados aún.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {pageItems.map((item) => (
              <MediaThumb
                key={item.id}
                item={item}
                onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      <AdminCardsPager
        page={safePage}
        totalPages={totalPages}
        totalItems={speciesKeys.length}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(n) => {
          setPageSize(Math.max(10, n));
          setPage(1);
        }}
        pageSizeOptions={[10, 20, 30]}
        label="especies"
        scrollTargetId="media-gallery-species"
      />
    </div>
  );
}
