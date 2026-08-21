'use client';

// Tabla de gestión multimedia por especie: mismos filtros de clasificación + 10/pág A–Z.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminCardsPager from '@/components/admin/AdminCardsPager';
import AdminTable from '@/components/admin/AdminTable';
import type { SpecimenView } from '@/lib/specimens/view';

const SPECIES_PER_PAGE = 10;

function alpha(a: string, b: string) {
  return a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set((values || []).filter((v): v is string => Boolean(v?.trim())))].sort(alpha);
}

type Props = {
  specimens: SpecimenView[];
};

export default function MultimediaSpecimenTable({ specimens }: Props) {
  const [rubro, setRubro] = useState('');
  const [category, setCategory] = useState('');
  const [family, setFamily] = useState('');
  const [genus, setGenus] = useState('');
  const [species, setSpecies] = useState('');
  const [subspecies, setSubspecies] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SPECIES_PER_PAGE);

  const enriched = useMemo(
    () =>
      specimens.map((s) => ({
        s,
        rubro: s.rubroLabel ?? s.rubroId ?? '',
        category: s.categoria ?? '',
        family: s.family ?? '',
        genus: s.genus ?? '',
        speciesEpithet: s.speciesEpithet ?? s.scientificName ?? '',
        subspecies: s.subspecies ?? '',
        label: s.scientificName || s.code,
      })),
    [specimens],
  );

  const rubros = useMemo(
    () => uniqueSorted(enriched.map((e) => e.rubro)),
    [enriched],
  );
  const categories = useMemo(() => {
    const scoped = rubro ? (enriched || []).filter((e) => e.rubro === rubro) : enriched;
    return uniqueSorted(scoped.map((e) => e.category));
  }, [enriched, rubro]);
  const families = useMemo(() => {
    const scoped = (enriched || []).filter((e) => {
      if (rubro && e.rubro !== rubro) return false;
      if (category && e.category !== category) return false;
      return true;
    });
    return uniqueSorted(scoped.map((e) => e.family));
  }, [enriched, rubro, category]);
  const genera = useMemo(() => {
    const scoped = (enriched || []).filter((e) => {
      if (rubro && e.rubro !== rubro) return false;
      if (category && e.category !== category) return false;
      if (family && e.family !== family) return false;
      return true;
    });
    return uniqueSorted(scoped.map((e) => e.genus));
  }, [enriched, rubro, category, family]);
  const speciesOpts = useMemo(() => {
    const scoped = (enriched || []).filter((e) => {
      if (rubro && e.rubro !== rubro) return false;
      if (category && e.category !== category) return false;
      if (family && e.family !== family) return false;
      if (genus && e.genus !== genus) return false;
      return true;
    });
    return uniqueSorted(scoped.map((e) => e.speciesEpithet));
  }, [enriched, rubro, category, family, genus]);
  const subspeciesOpts = useMemo(() => {
    const scoped = (enriched || []).filter((e) => {
      if (rubro && e.rubro !== rubro) return false;
      if (category && e.category !== category) return false;
      if (family && e.family !== family) return false;
      if (genus && e.genus !== genus) return false;
      if (species && e.speciesEpithet !== species) return false;
      return true;
    });
    return uniqueSorted(scoped.map((e) => e.subspecies));
  }, [enriched, rubro, category, family, genus, species]);

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
    return enriched
      .filter((e) => {
        if (rubro && e.rubro !== rubro) return false;
        if (category && e.category !== category) return false;
        if (family && e.family !== family) return false;
        if (genus && e.genus !== genus) return false;
        if (species && e.speciesEpithet !== species) return false;
        if (subspecies && e.subspecies !== subspecies) return false;
        if (q) {
          const hay = [
            e.s.code,
            e.label,
            e.family,
            e.genus,
            e.speciesEpithet,
            e.subspecies,
            e.category,
            e.rubro,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => alpha(a.label, b.label));
  }, [
    enriched,
    rubro,
    category,
    family,
    genus,
    species,
    subspecies,
    search,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const selectClass =
    'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-100';

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Rubro
          <select
            className={selectClass}
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
          >
            <option value="">Todos</option>
            {rubros.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Categoría
          <select
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Familia
          <select
            className={selectClass}
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          >
            <option value="">Todas</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Género
          <select
            className={selectClass}
            value={genus}
            onChange={(e) => setGenus(e.target.value)}
          >
            <option value="">Todos</option>
            {genera.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Especie
          <select
            className={selectClass}
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="">Todas</option>
            {speciesOpts.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Subespecie
          <select
            className={selectClass}
            value={subspecies}
            onChange={(e) => setSubspecies(e.target.value)}
          >
            <option value="">Todas</option>
            {subspeciesOpts.map((ss) => (
              <option key={ss} value={ss}>
                {ss}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase text-neutral-500">
          Buscar
          <input
            className={selectClass}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="NEO-…"
          />
        </label>
      </div>

      <p className="text-xs text-neutral-500">
        {filtered.length} especies · A–Z · {pageSize} por página
      </p>

      <div id="multimedia-specimen-table" key={`tbl-${safePage}`}>
        <AdminTable
          columns={['Código', 'Especie', 'Familia', 'Género', 'Fotos', 'Video', '3D']}
          empty={
            filtered.length === 0
              ? 'Ninguna especie con estos filtros.'
              : undefined
          }
        >
          {pageRows.map(({ s, family: fam, genus: g }) => (
            <tr key={s.id} className="hover:bg-neutral-900/60">
              <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                <Link
                  href={`/admin/multimedia/${s.id}`}
                  className="text-neutral-300 hover:text-emerald-400"
                >
                  {s.code}
                </Link>
              </td>
              <td className="px-4 py-2 italic text-neutral-200">{s.scientificName}</td>
              <td className="px-4 py-2 text-xs text-neutral-400">{fam || '—'}</td>
              <td className="px-4 py-2 text-xs text-neutral-400">{g || '—'}</td>
              <td className="px-4 py-2 text-neutral-400">{s.images.length}</td>
              <td className="px-4 py-2 text-neutral-400">{s.video ? 'Sí' : '—'}</td>
              <td className="px-4 py-2 text-neutral-400">{s.model3d ? 'Sí' : '—'}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <AdminCardsPager
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(n) => {
          setPageSize(Math.max(10, n));
          setPage(1);
        }}
        pageSizeOptions={[10, 20, 30]}
        label="especies"
        scrollTargetId="multimedia-specimen-table"
      />
    </div>
  );
}
