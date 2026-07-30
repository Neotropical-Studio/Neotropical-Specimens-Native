'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { buttonPrimaryClass, inputClass } from '@/components/admin/FormField';
import {
  CATALOGUE_CATEGORIES,
  resolveSpecimenCategoria,
  resolveSpecimenFamiliaLabel,
  resolveSpecimenRegion,
  slugifyCatalogue,
} from '@/lib/specimens/catalogueNav';
import { GRADE_OPTIONS } from '@/lib/constants/grades';
import {
  canonicalizeRubroId,
  detectRubro,
  STOREFRONT_RUBROS,
  type InventoryRubroId,
} from '@/lib/specimens/rubros';
import { DRIED_SPECIMEN_REGION_FOLDERS } from '@/scripts/sync-cloudinary/roots';
import type { SpecimenView } from '@/lib/specimens/view';

export interface AdminSpecimenRow extends SpecimenView {
  speciesEpithet?: string | null;
  subspecies?: string | null;
}

interface Props {
  specimens: AdminSpecimenRow[];
}

type Enriched = {
  s: AdminSpecimenRow;
  rubroId: InventoryRubroId | '';
  rubroLabel: string;
  regionId: string;
  regionLabel: string;
  categoryId: string;
  categoryLabel: string;
  orderKey: string;
  orderLabel: string;
  familyId: string;
  familyLabel: string;
  speciesKey: string;
  speciesLabel: string;
  /** Rubro › Región › Categoría › Orden › Familia */
  breadcrumb: string;
};

function gradeLabel(code: string | null): string {
  if (!code) return '—';
  const g = GRADE_OPTIONS.find((o) => o.code === code || o.label === code);
  return g ? g.label : code;
}

function resolveRubro(s: AdminSpecimenRow): { id: InventoryRubroId; label: string } {
  const canonical = canonicalizeRubroId(s.rubroId);
  if (canonical) {
    const meta = STOREFRONT_RUBROS.find((r) => r.id === canonical);
    return { id: canonical, label: meta?.label ?? s.rubroLabel ?? canonical };
  }
  return detectRubro({
    mediaHint: s.primaryImage,
    order: s.order,
    family: s.family,
    genus: s.genus,
    scientificName: s.scientificName,
  });
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'emerald' | 'sky' | 'amber' | 'violet';
}) {
  const cls =
    tone === 'emerald'
      ? 'border-emerald-800/80 bg-emerald-950/50 text-emerald-200'
      : tone === 'sky'
        ? 'border-sky-800/80 bg-sky-950/50 text-sky-200'
        : tone === 'amber'
          ? 'border-amber-800/80 bg-amber-950/50 text-amber-200'
          : tone === 'violet'
            ? 'border-violet-800/80 bg-violet-950/50 text-violet-200'
            : 'border-neutral-700 bg-neutral-900 text-neutral-300';
  return (
    <span
      className={`inline-block max-w-[12rem] truncate rounded border px-1.5 py-0.5 text-[10px] ${cls}`}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  );
}

export default function EspecimenesBrowse({ specimens }: Props) {
  const [rubroId, setRubroId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [orderKey, setOrderKey] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [speciesQ, setSpeciesQ] = useState('');

  const enriched: Enriched[] = useMemo(
    () =>
      specimens.map((s) => {
        const rubro = resolveRubro(s);
        const region = resolveSpecimenRegion(s);
        const categoria = resolveSpecimenCategoria(s);
        const orderLabel = s.order?.trim() || 'Sin orden';
        const familiaLabel = resolveSpecimenFamiliaLabel(s) ?? s.family;
        const familiaId = familiaLabel ? slugifyCatalogue(familiaLabel) : 'sin-familia';
        const species =
          s.speciesEpithet?.trim() || s.scientificName?.trim() || '—';
        const regionLabel =
          region?.label ?? s.regionCode ?? s.regionName ?? 'Sin región';
        const categoryLabel = categoria?.label ?? s.categoria ?? 'Sin categoría';
        const familyLabel = familiaLabel ?? 'Sin familia';
        return {
          s,
          rubroId: rubro.id,
          rubroLabel: rubro.label,
          regionId: region?.id ?? 'sin-region',
          regionLabel,
          categoryId: categoria?.id ?? 'sin-categoria',
          categoryLabel,
          orderKey: slugifyCatalogue(orderLabel),
          orderLabel,
          familyId: familiaId,
          familyLabel,
          speciesKey: slugifyCatalogue(species),
          speciesLabel: species,
          breadcrumb: [
            rubro.label,
            regionLabel,
            categoryLabel,
            orderLabel,
            familyLabel,
          ].join(' › '),
        };
      }),
    [specimens],
  );

  const regionOptions = useMemo(() => {
    if (rubroId && rubroId !== 'dried-specimens') {
      const seen = new Map<string, string>();
      for (const e of enriched) {
        if (e.rubroId === rubroId) seen.set(e.regionId, e.regionLabel);
      }
      return [...seen.entries()].map(([id, label]) => ({ id, label }));
    }
    return DRIED_SPECIMEN_REGION_FOLDERS.map((r) => ({
      id: r.id,
      label: r.folder,
    }));
  }, [enriched, rubroId]);

  const categoryOptions = useMemo(() => {
    const scoped = enriched.filter((e) => {
      if (rubroId && e.rubroId !== rubroId) return false;
      if (regionId && e.regionId !== regionId) return false;
      return true;
    });
    const seen = new Map<string, string>();
    if (!rubroId || rubroId === 'dried-specimens') {
      for (const cat of CATALOGUE_CATEGORIES) seen.set(cat.id, cat.label);
    }
    for (const e of scoped) {
      if (e.categoryId !== 'sin-categoria') seen.set(e.categoryId, e.categoryLabel);
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [enriched, rubroId, regionId]);

  const orderOptions = useMemo(() => {
    const scoped = enriched.filter((e) => {
      if (rubroId && e.rubroId !== rubroId) return false;
      if (regionId && e.regionId !== regionId) return false;
      if (categoryId && e.categoryId !== categoryId) return false;
      return true;
    });
    const seen = new Map<string, string>();
    for (const e of scoped) seen.set(e.orderKey, e.orderLabel);
    return [...seen.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [enriched, rubroId, regionId, categoryId]);

  const familyOptions = useMemo(() => {
    const scoped = enriched.filter((e) => {
      if (rubroId && e.rubroId !== rubroId) return false;
      if (regionId && e.regionId !== regionId) return false;
      if (categoryId && e.categoryId !== categoryId) return false;
      if (orderKey && e.orderKey !== orderKey) return false;
      return e.familyId !== 'sin-familia';
    });
    const seen = new Map<string, string>();
    for (const e of scoped) seen.set(e.familyId, e.familyLabel);
    return [...seen.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [enriched, rubroId, regionId, categoryId, orderKey]);

  const filtered = useMemo(() => {
    const q = speciesQ.trim().toLowerCase();
    return enriched.filter((e) => {
      if (rubroId && e.rubroId !== rubroId) return false;
      if (regionId && e.regionId !== regionId) return false;
      if (categoryId && e.categoryId !== categoryId) return false;
      if (orderKey && e.orderKey !== orderKey) return false;
      if (familyId && e.familyId !== familyId) return false;
      if (q) {
        const hay = [
          e.speciesLabel,
          e.s.scientificName,
          e.s.commonName,
          e.s.code,
          e.s.genus,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, rubroId, regionId, categoryId, orderKey, familyId, speciesQ]);

  /** Rubro → Región → Categoría → Orden → Familia → filas */
  const tree = useMemo(() => {
    type FamNode = { familyId: string; familyLabel: string; breadcrumb: string; rows: Enriched[] };
    type OrdNode = {
      orderKey: string;
      orderLabel: string;
      families: Map<string, FamNode>;
    };
    type CatNode = {
      categoryId: string;
      categoryLabel: string;
      orders: Map<string, OrdNode>;
    };
    type RegNode = {
      regionId: string;
      regionLabel: string;
      categories: Map<string, CatNode>;
    };
    type RubroNode = {
      rubroId: string;
      rubroLabel: string;
      regions: Map<string, RegNode>;
    };

    const rubros = new Map<string, RubroNode>();
    for (const e of filtered) {
      const rKey = e.rubroId || 'unknown';
      let rubro = rubros.get(rKey);
      if (!rubro) {
        rubro = { rubroId: rKey, rubroLabel: e.rubroLabel, regions: new Map() };
        rubros.set(rKey, rubro);
      }
      let region = rubro.regions.get(e.regionId);
      if (!region) {
        region = {
          regionId: e.regionId,
          regionLabel: e.regionLabel,
          categories: new Map(),
        };
        rubro.regions.set(e.regionId, region);
      }
      let cat = region.categories.get(e.categoryId);
      if (!cat) {
        cat = {
          categoryId: e.categoryId,
          categoryLabel: e.categoryLabel,
          orders: new Map(),
        };
        region.categories.set(e.categoryId, cat);
      }
      let ord = cat.orders.get(e.orderKey);
      if (!ord) {
        ord = { orderKey: e.orderKey, orderLabel: e.orderLabel, families: new Map() };
        cat.orders.set(e.orderKey, ord);
      }
      let fam = ord.families.get(e.familyId);
      if (!fam) {
        fam = {
          familyId: e.familyId,
          familyLabel: e.familyLabel,
          breadcrumb: e.breadcrumb,
          rows: [],
        };
        ord.families.set(e.familyId, fam);
      }
      fam.rows.push(e);
    }

    const rubroOrder = STOREFRONT_RUBROS.map((r) => r.id);
    const regionOrder = DRIED_SPECIMEN_REGION_FOLDERS.map((r) => r.id);
    const catOrder = CATALOGUE_CATEGORIES.map((c) => c.id);

    const sortKeys = (keys: string[], preferred: string[]) =>
      [...keys].sort((a, b) => {
        const ia = preferred.indexOf(a);
        const ib = preferred.indexOf(b);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return a.localeCompare(b, 'es');
      });

    return sortKeys([...rubros.keys()], rubroOrder).map((rk) => {
      const rubro = rubros.get(rk)!;
      const regions = sortKeys([...rubro.regions.keys()], regionOrder).map((regK) => {
        const region = rubro.regions.get(regK)!;
        const categories = sortKeys([...region.categories.keys()], catOrder).map((ck) => {
          const cat = region.categories.get(ck)!;
          const orders = [...cat.orders.values()]
            .sort((a, b) => a.orderLabel.localeCompare(b.orderLabel, 'es'))
            .map((ord) => ({
              ...ord,
              families: [...ord.families.values()].sort((a, b) =>
                a.familyLabel.localeCompare(b.familyLabel, 'es'),
              ),
            }));
          return { ...cat, orders };
        });
        return { ...region, categories };
      });
      return { ...rubro, regions };
    });
  }, [filtered]);

  function clearFilters() {
    setRubroId('');
    setRegionId('');
    setCategoryId('');
    setOrderKey('');
    setFamilyId('');
    setSpeciesQ('');
  }

  const hasFilters = Boolean(
    rubroId || regionId || categoryId || orderKey || familyId || speciesQ.trim(),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Fichas por especie / subespecie
          </h1>
          <p className="text-sm text-neutral-400">
            Jerarquía visible:{' '}
            <span className="text-neutral-300">
              Rubro › Región › Categoría › Orden › Familia › especie
            </span>
            . Sin esa ruta, la lista no sirve.
          </p>
        </div>
        <Link href="/admin/especimenes/nuevo" className={buttonPrimaryClass}>
          <Plus size={16} /> Nueva ficha
        </Link>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Filtros · rubro / región / categoría / orden / familia / especie
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-neutral-400 underline hover:text-neutral-200"
          >
            Limpiar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Rubro
            </span>
            <select
              className={inputClass}
              value={rubroId}
              onChange={(e) => {
                setRubroId(e.target.value);
                setRegionId('');
                setCategoryId('');
                setOrderKey('');
                setFamilyId('');
              }}
            >
              <option value="">Todos</option>
              {STOREFRONT_RUBROS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Región
            </span>
            <select
              className={inputClass}
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setCategoryId('');
                setOrderKey('');
                setFamilyId('');
              }}
            >
              <option value="">Todas</option>
              {regionOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Categoría
            </span>
            <select
              className={inputClass}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setOrderKey('');
                setFamilyId('');
              }}
            >
              <option value="">Todas</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Orden
            </span>
            <select
              className={inputClass}
              value={orderKey}
              onChange={(e) => {
                setOrderKey(e.target.value);
                setFamilyId('');
              }}
            >
              <option value="">Todos</option>
              {orderOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Familia
            </span>
            <select
              className={inputClass}
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              disabled={familyOptions.length === 0}
            >
              <option value="">Todas</option>
              {familyOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Buscar especie
            </span>
            <input
              className={inputClass}
              value={speciesQ}
              onChange={(e) => setSpeciesQ(e.target.value)}
              placeholder="Morpho, NEO-…"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          {filtered.length} ficha{filtered.length === 1 ? '' : 's'}
          {hasFilters ? ' con filtros activos' : ' en total'}.
        </p>
      </div>

      {tree.length === 0 ? (
        <AdminTable
          columns={[
            'ID code',
            'Región',
            'Especie',
            'N. común',
            'Grado',
            'Precio',
          ]}
          empty={
            specimens.length === 0
              ? 'Todavía no hay fichas. Crea una por especie o subespecie.'
              : 'Ninguna ficha coincide con los filtros.'
          }
        >
          {null}
        </AdminTable>
      ) : (
        tree.map((rubro) => (
          <section key={rubro.rubroId} className="flex flex-col gap-5">
            {/* RUBRO */}
            <header className="rounded-md border border-emerald-900/70 bg-emerald-950/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
                Rubro
              </p>
              <h2 className="text-lg font-semibold text-emerald-200">{rubro.rubroLabel}</h2>
            </header>

            {rubro.regions.map((region) => (
              <div
                key={`${rubro.rubroId}-${region.regionId}`}
                className="flex flex-col gap-4 border-l-2 border-sky-800/60 pl-3 sm:pl-4"
              >
                {/* REGIÓN */}
                <header>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-500">
                    Región geográfica
                  </p>
                  <h3 className="text-base font-semibold text-sky-100">{region.regionLabel}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                    {rubro.rubroLabel} › {region.regionLabel}
                  </p>
                </header>

                {region.categories.map((cat) => (
                  <div
                    key={`${region.regionId}-${cat.categoryId}`}
                    className="flex flex-col gap-3 border-l-2 border-amber-800/50 pl-3"
                  >
                    {/* CATEGORÍA */}
                    <header>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">
                        Categoría
                      </p>
                      <h4 className="text-sm font-semibold text-amber-100">{cat.categoryLabel}</h4>
                      <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                        {rubro.rubroLabel} › {region.regionLabel} › {cat.categoryLabel}
                      </p>
                    </header>

                    {cat.orders.map((ord) => (
                      <div
                        key={`${cat.categoryId}-${ord.orderKey}`}
                        className="flex flex-col gap-3 border-l-2 border-violet-800/50 pl-3"
                      >
                        {/* ORDEN */}
                        <header>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400">
                            Orden biológico
                          </p>
                          <h5 className="text-sm font-semibold text-violet-100">
                            {ord.orderLabel}
                          </h5>
                          <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                            {rubro.rubroLabel} › {region.regionLabel} › {cat.categoryLabel} ›{' '}
                            {ord.orderLabel}
                          </p>
                        </header>

                        {ord.families.map((fam) => (
                          <div
                            key={`${ord.orderKey}-${fam.familyId}`}
                            className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3"
                          >
                            {/* FAMILIA + breadcrumb completo */}
                            <header className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                  Familia
                                </p>
                                <h6 className="text-sm font-semibold text-white">
                                  {fam.familyLabel}
                                  <span className="ml-2 text-xs font-normal text-neutral-500">
                                    ({fam.rows.length} ficha
                                    {fam.rows.length === 1 ? '' : 's'})
                                  </span>
                                </h6>
                              </div>
                              <p
                                className="font-mono text-[11px] leading-relaxed text-emerald-400/90"
                                title={fam.breadcrumb}
                              >
                                {fam.breadcrumb}
                              </p>
                            </header>

                            <AdminTable
                              columns={[
                                'ID code',
                                'Región',
                                'Especie',
                                'N. común',
                                'Género',
                                'Grado',
                                'Precio',
                              ]}
                            >
                              {fam.rows.map(
                                ({ s, regionLabel, speciesLabel, breadcrumb }) => (
                                  <tr key={s.id} className="hover:bg-neutral-900/60">
                                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-neutral-300">
                                      <Link
                                        href={`/admin/especimenes/${s.id}`}
                                        className="hover:text-emerald-400"
                                        title={breadcrumb}
                                      >
                                        {s.code}
                                      </Link>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge tone="sky">{regionLabel}</Badge>
                                    </td>
                                    <td className="px-4 py-2 italic text-neutral-100">
                                      {speciesLabel}
                                    </td>
                                    <td className="px-4 py-2 text-neutral-400">
                                      {s.commonName ?? '—'}
                                    </td>
                                    <td className="px-4 py-2 text-neutral-400">
                                      {s.genus ?? '—'}
                                    </td>
                                    <td className="px-4 py-2 text-neutral-400">
                                      {gradeLabel(s.grade)}
                                    </td>
                                    <td className="px-4 py-2 text-neutral-400">
                                      {s.price != null
                                        ? `${s.price} ${s.currency}`
                                        : '—'}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </AdminTable>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
