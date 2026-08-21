'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import AdminCardsPager from '@/components/admin/AdminCardsPager';
import MirrorVisionPanel from '@/components/admin/MirrorVisionPanel';

type Tab = 'DASHBOARD' | 'TAXONOMÍA' | 'ADUANAS' | 'LOGÍSTICA';

type ConsolaItem = {
  id: string;
  fullId?: string;
  code?: string;
  name: string;
  stock: number | string;
  status: 'APROBADO' | 'PENDIENTE' | 'OUT';
  rubro?: string | null;
  category?: string | null;
  family?: string | null;
  subfamily?: string | null;
  genus?: string | null;
  species?: string | null;
  subspecies?: string | null;
};

const PAGE_SIZE_DEFAULT = 10;

const TABS: { id: Tab; href?: string }[] = [
  { id: 'DASHBOARD' },
  { id: 'TAXONOMÍA', href: '/admin/especimenes' },
  { id: 'ADUANAS', href: '/admin/embarques' },
  { id: 'LOGÍSTICA', href: '/admin/embarques' },
];

function alpha(a: string, b: string) {
  return a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set((values || []).filter((v): v is string => Boolean(v?.trim())))].sort(alpha);
}

const selectClass =
  'w-full rounded border border-emerald-900/60 bg-zinc-950 px-2 py-1.5 text-[11px] text-emerald-100';

export default function IndustrialMasterSystemV3() {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const [data, setData] = useState<ConsolaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rubro, setRubro] = useState('');
  const [category, setCategory] = useState('');
  const [family, setFamily] = useState('');
  const [subfamily, setSubfamily] = useState('');
  const [genus, setGenus] = useState('');
  const [species, setSpecies] = useState('');
  const [subspecies, setSubspecies] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const sincronizarSistema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consola-sync', { cache: 'no-store' });
      const text = await res.text();
      let json: {
        error?: string;
        rows?: ConsolaItem[];
        pageSizeDefault?: number;
      } = {};
      try {
        if (!res.ok) {
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        throw new Error(`Error (${res.status}): ${cleanText.slice(0, 150) || 'Error interno del servidor'}`);
      }
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('El servidor devolvió una respuesta no válida (HTML/Texto plano en lugar de JSON).');
      }
      } catch {
        throw new Error(
          text?.slice(0, 180) ||
            'Respuesta vacía del servidor (revisa SUPABASE_SERVICE_ROLE_KEY en Vercel)',
        );
      }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json.rows ?? []);
      if (json.pageSizeDefault && json.pageSizeDefault >= 10) {
        setPageSize(json.pageSizeDefault);
      }
      setPage(1);
    } catch (e) {
      setError((e as Error).message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void sincronizarSistema();
  }, [sincronizarSistema]);

  const rubros = useMemo(() => uniqueSorted(data.map((d) => d.rubro)), [data]);
  const categories = useMemo(() => {
    const scoped = rubro ? (data || []).filter((d) => d.rubro === rubro) : data;
    return uniqueSorted(scoped.map((d) => d.category));
  }, [data, rubro]);
  const families = useMemo(() => {
    const scoped = (data || []).filter((d) => {
      if (rubro && d.rubro !== rubro) return false;
      if (category && d.category !== category) return false;
      return true;
    });
    return uniqueSorted(scoped.map((d) => d.family));
  }, [data, rubro, category]);
  const subfamilies = useMemo(() => {
    const scoped = (data || []).filter((d) => {
      if (rubro && d.rubro !== rubro) return false;
      if (category && d.category !== category) return false;
      if (family && d.family !== family) return false;
      return true;
    });
    return uniqueSorted(scoped.map((d) => d.subfamily));
  }, [data, rubro, category, family]);
  const genera = useMemo(() => {
    const scoped = (data || []).filter((d) => {
      if (rubro && d.rubro !== rubro) return false;
      if (category && d.category !== category) return false;
      if (family && d.family !== family) return false;
      if (subfamily && d.subfamily !== subfamily) return false;
      return true;
    });
    return uniqueSorted(scoped.map((d) => d.genus));
  }, [data, rubro, category, family, subfamily]);
  const speciesOpts = useMemo(() => {
    const scoped = (data || []).filter((d) => {
      if (rubro && d.rubro !== rubro) return false;
      if (category && d.category !== category) return false;
      if (family && d.family !== family) return false;
      if (subfamily && d.subfamily !== subfamily) return false;
      if (genus && d.genus !== genus) return false;
      return true;
    });
    return uniqueSorted(scoped.map((d) => d.species ?? d.name));
  }, [data, rubro, category, family, subfamily, genus]);
  const subspeciesOpts = useMemo(() => {
    const scoped = (data || []).filter((d) => {
      if (rubro && d.rubro !== rubro) return false;
      if (category && d.category !== category) return false;
      if (family && d.family !== family) return false;
      if (subfamily && d.subfamily !== subfamily) return false;
      if (genus && d.genus !== genus) return false;
      if (species && (d.species ?? d.name) !== species) return false;
      return true;
    });
    return uniqueSorted(scoped.map((d) => d.subspecies));
  }, [data, rubro, category, family, subfamily, genus, species]);

  useEffect(() => {
    setCategory('');
    setFamily('');
    setSubfamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [rubro]);
  useEffect(() => {
    setFamily('');
    setSubfamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [category]);
  useEffect(() => {
    setSubfamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [family]);
  useEffect(() => {
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setPage(1);
  }, [subfamily]);
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
    return data
      .filter((d) => {
        if (rubro && d.rubro !== rubro) return false;
        if (category && d.category !== category) return false;
        if (family && d.family !== family) return false;
        if (subfamily && d.subfamily !== subfamily) return false;
        if (genus && d.genus !== genus) return false;
        if (species && (d.species ?? d.name) !== species) return false;
        if (subspecies && d.subspecies !== subspecies) return false;
        if (q) {
          const hay = [
            d.id,
            d.code,
            d.name,
            d.rubro,
            d.category,
            d.family,
            d.subfamily,
            d.genus,
            d.species,
            d.subspecies,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const byFam = alpha(a.family ?? '', b.family ?? '');
        if (byFam !== 0) return byFam;
        const byGen = alpha(a.genus ?? '', b.genus ?? '');
        if (byGen !== 0) return byGen;
        return alpha(a.name, b.name);
      });
  }, [
    data,
    rubro,
    category,
    family,
    subfamily,
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

  function clearFilters() {
    setRubro('');
    setCategory('');
    setFamily('');
    setSubfamily('');
    setGenus('');
    setSpecies('');
    setSubspecies('');
    setSearch('');
    setPage(1);
  }

  return (
    <div className="min-h-[70vh] bg-zinc-950 p-6 font-mono text-emerald-400">
      <header className="mb-6 flex flex-col gap-4 border-b border-emerald-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-4 text-3xl font-black uppercase tracking-tighter text-white">
            <Cpu size={32} className="text-emerald-500" />
            {'>'} CONSOLA MAESTRA V-3
          </h1>
          <p className="text-xs italic text-emerald-700">
            Arquitectura: Espejo Cloudinary ↔ Supabase · orden 1 SQL → 2 ESPEJO → 3 panel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/espejo"
            className="border border-sky-700 bg-sky-950/40 px-4 py-3 text-xs font-bold uppercase text-sky-300 transition hover:bg-sky-900"
          >
            Panel espejo →
          </Link>
          <button
            type="button"
            onClick={() => void sincronizarSistema()}
            disabled={loading}
            className="flex items-center gap-2 border border-emerald-500 bg-emerald-950 px-6 py-3 font-bold transition-all hover:bg-emerald-900 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'PROCESANDO...' : 'RECARGAR BASE'}
          </button>
        </div>
      </header>

      <MirrorVisionPanel className="mb-6" autoDiscover />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <nav className="space-y-2">
          {TABS.map((tab) =>
            tab.href ? (
              <Link
                key={tab.id}
                href={tab.href}
                className="block w-full border border-zinc-800 bg-zinc-900 p-4 text-left transition-all hover:border-emerald-700"
              >
                {tab.id} →
              </Link>
            ) : (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full border p-4 text-left transition-all ${
                  activeTab === tab.id
                    ? 'border-white bg-emerald-900 text-white'
                    : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                {tab.id}
              </button>
            ),
          )}
        </nav>

        <main className="border border-emerald-900 bg-zinc-900 p-6 lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
            <Database size={18} /> MÓDULO: {activeTab}
          </h2>

          {error ? (
            <div className="mb-4 border border-red-800 bg-red-950/40 p-3 text-xs text-red-300">
              {error}
            </div>
          ) : null}

          {activeTab === 'DASHBOARD' ? (
            <>
              <div className="mb-4 space-y-3 rounded border border-emerald-900/50 bg-zinc-950/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                    Clasificación · filtro · {pageSize}/pág A–Z
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[10px] uppercase text-emerald-700 underline hover:text-emerald-400"
                  >
                    Limpiar filtros
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-[9px] uppercase text-emerald-700">
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
                  <label className="text-[9px] uppercase text-emerald-700">
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
                  <label className="text-[9px] uppercase text-emerald-700">
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
                  <label className="text-[9px] uppercase text-emerald-700">
                    Subfamilia
                    <select
                      className={selectClass}
                      value={subfamily}
                      onChange={(e) => setSubfamily(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {subfamilies.map((sf) => (
                        <option key={sf} value={sf}>
                          {sf}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[9px] uppercase text-emerald-700">
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
                  <label className="text-[9px] uppercase text-emerald-700">
                    Species
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
                  <label className="text-[9px] uppercase text-emerald-700">
                    Sub species
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
                  <label className="text-[9px] uppercase text-emerald-700">
                    Buscar
                    <input
                      className={selectClass}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="código / nombre…"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-emerald-800">
                  {filtered.length} registros · pág. {safePage}/{totalPages}
                </p>
              </div>

              {loading && data.length === 0 ? (
                <div className="py-12 text-center text-sm text-emerald-700">PROCESANDO…</div>
              ) : (
                <>
                  <div
                    id="consola-dashboard-table"
                    key={`dash-${safePage}-${pageSize}`}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-emerald-900 uppercase text-emerald-600">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Especie</th>
                          <th className="p-2">Familia</th>
                          <th className="p-2">Género</th>
                          <th className="p-2">Stock</th>
                          <th className="p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-6 text-center text-emerald-800"
                            >
                              Sin resultados para estos filtros.
                            </td>
                          </tr>
                        ) : (
                          pageRows.map((item) => (
                            <tr
                              key={item.fullId ?? item.id}
                              className="border-b border-emerald-950 transition-colors hover:bg-zinc-800"
                            >
                              <td className="p-2 font-bold">
                                <Link
                                  href={`/admin/especimenes/${item.fullId}`}
                                  className="hover:text-white"
                                >
                                  {item.code ?? item.id}
                                </Link>
                              </td>
                              <td className="p-2 text-white">
                                <div>{item.name}</div>
                                {item.subspecies ? (
                                  <div className="text-[10px] text-emerald-700">
                                    ssp. {item.subspecies}
                                  </div>
                                ) : null}
                              </td>
                              <td className="p-2 text-emerald-600/90">
                                {item.family ?? '—'}
                                {item.subfamily ? (
                                  <span className="block text-[10px] text-emerald-800">
                                    {item.subfamily}
                                  </span>
                                ) : null}
                              </td>
                              <td className="p-2 text-emerald-600/90">
                                {item.genus ?? '—'}
                              </td>
                              <td className="p-2">{item.stock}</td>
                              <td className="p-2">
                                {item.status === 'APROBADO' ? (
                                  <CheckCircle2 className="text-emerald-500" size={16} />
                                ) : (
                                  <AlertTriangle className="text-yellow-600" size={16} />
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
                    pageSizeOptions={[10, 20, 30, 50]}
                    label="registros"
                    scrollTargetId="consola-dashboard-table"
                  />
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-emerald-700">
              Usá el menú lateral para abrir {activeTab}.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
