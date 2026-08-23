'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  CloudDownload,
  FolderInput,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
} from 'lucide-react';
import AdminCardsPager from '@/components/admin/AdminCardsPager';
import PublishProductionButton from '@/components/admin/PublishProductionButton';
import { adminCardsPerPage } from '@/lib/specimens/cataloguePagination';

type FamilyRow = {
  id: string;
  regionId: string;
  categoryId: string;
  label: string;
  folder?: string;
  sortOrder: number;
  active: boolean;
};

type Meta = {
  regions: Array<{ id: string; label: string }>;
  categories: Array<{ id: string; label: string }>;
};

type Props = {
  initialRegionId?: string;
  initialCategoryId?: string;
};

function isEphemeral(id: string) {
  return id.startsWith('default:') || id.startsWith('cloud:');
}

export default function CatalogueFamilyEditor({
  initialRegionId = 'neotropical',
  initialCategoryId = 'butterflies-lepidoptera-diurne',
}: Props) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [regionId, setRegionId] = useState(initialRegionId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => adminCardsPerPage());
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [placeRegionId, setPlaceRegionId] = useState(initialRegionId);
  const [placeCategoryId, setPlaceCategoryId] = useState(initialCategoryId);
  const [familyQ, setFamilyQ] = useState('');

  const loadMeta = useCallback(async () => {
    const res = await fetch('/api/admin/catalogue-families');
    const json = (await res.json()) as Meta & { error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Error meta');
    setMeta({ regions: json.regions, categories: json.categories });
  }, []);

  const loadFamilies = useCallback(async () => {
    setError(null);
    setBusy('load');
    try {
      const qs = new URLSearchParams({ regionId, categoryId });
      const res = await fetch(`/api/admin/catalogue-families?${qs}`);
      const json = (await res.json()) as {
        families?: FamilyRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar');
      setFamilies(json.families ?? []);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [regionId, categoryId]);

  useEffect(() => {
    void loadMeta().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [loadMeta]);

  useEffect(() => {
    void loadFamilies();
  }, [loadFamilies]);

  const filteredFamilies = useMemo(() => {
    const q = familyQ.trim().toLowerCase();
    const list = q
      ? (families || []).filter((f) => f.label.toLowerCase().includes(q))
      : [...families];
    // Instaladas A–Z (abecedario), no por sort_order de alta.
    return list.sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { sensitivity: 'base', numeric: true }),
    );
  }, [families, familyQ]);

  const totalPages = Math.max(1, Math.ceil(filteredFamilies.length / pageSize));
  const safePage = Math.min(page, totalPages);

  // Si el filtro reduce páginas, ajustar automáticamente.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredFamilies.slice(start, start + pageSize);
  }, [filteredFamilies, safePage, pageSize]);

  async function post(body: Record<string, unknown>) {
    setError(null);
    setOkMsg(null);
    setBusy(String(body.action ?? 'save'));
    try {
      const res = await fetch('/api/admin/catalogue-families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        families?: FamilyRow[];
        error?: string;
        seeded?: number;
        synced?: number;
        storage?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Error');
      if (json.families) setFamilies(json.families);
      const at = new Date().toLocaleString('es-PE', { hour12: false });
      const actionLabel = String(body.action ?? 'save');
      setOkMsg(
        `GRABADO · ${actionLabel} · ${at}${
          json.families ? ` · ${json.families.filter((f) => f.active).length} activas` : ''
        }`,
      );
      const { notifyCatalogueFamiliesChanged } = await import(
        '@/lib/specimens/catalogue-families-events'
      );
      notifyCatalogueFamiliesChanged({ regionId, categoryId });
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function ensureEditable(): Promise<FamilyRow[] | null> {
    if (families.length > 0 && !families.some((f) => isEphemeral(f.id))) {
      return families;
    }
    const json = await post({ action: 'seed', regionId, categoryId });
    if (!json?.families) return null;
    if (json.families.some((f) => isEphemeral(f.id))) {
      setError('No se pudo guardar la lista. Revisá Cloudinary API keys en Vercel.');
      return null;
    }
    setOkMsg(
      json.storage === 'cloudinary-meta'
        ? 'Lista editable (guardada en Cloudinary meta).'
        : 'Lista editable (guardada en Supabase).',
    );
    return json.families;
  }

  async function resolveId(id: string, rows: FamilyRow[]): Promise<string> {
    if (!isEphemeral(id)) return id;
    return (
      rows.find((r) => r.label === families.find((f) => f.id === id)?.label)?.id ?? id
    );
  }

  async function create() {
    const label = newLabel.trim();
    if (!label) return;
    if (!(await ensureEditable())) return;
    const ok = await post({ action: 'create', regionId, categoryId, label });
    if (ok) setNewLabel('');
  }

  async function saveRename(id: string) {
    const label = editLabel.trim();
    if (!label) return;
    const rows = await ensureEditable();
    if (!rows) return;
    const realId = await resolveId(id, rows);
    const ok = await post({ action: 'update', id: realId, label });
    if (ok) {
      setEditingId(null);
      setEditLabel('');
    }
  }

  async function setActive(id: string, active: boolean) {
    const rows = await ensureEditable();
    if (!rows) return;
    const realId = await resolveId(id, rows);
    await post({ action: 'update', id: realId, active });
  }

  async function hardDelete(id: string, label: string) {
    if (
      !window.confirm(
        `¿BORRAR permanentemente «${label}»?\n(No borra CARD/VIDEO en Cloudinary. Las fichas de especie no se borran.)`,
      )
    ) {
      return;
    }
    const rows = await ensureEditable();
    if (!rows) return;
    const realId = await resolveId(id, rows);
    await post({ action: 'delete', id: realId, regionId, categoryId });
  }

  async function relocate(id: string) {
    if (
      placeRegionId === regionId &&
      placeCategoryId === categoryId
    ) {
      setError('Elegí otra región o categoría para colocar.');
      return;
    }
    const rows = await ensureEditable();
    if (!rows) return;
    const realId = await resolveId(id, rows);
    const ok = await post({
      action: 'relocate',
      id: realId,
      regionId,
      categoryId,
      targetRegionId: placeRegionId,
      targetCategoryId: placeCategoryId,
    });
    if (ok) setPlaceId(null);
  }

  async function move(indexInFull: number, dir: -1 | 1) {
    const next = indexInFull + dir;
    if (next < 0 || next >= families.length) return;
    const rows = await ensureEditable();
    if (!rows) return;

    const labelsOrder = [...families];
    const [row] = labelsOrder.splice(indexInFull, 1);
    labelsOrder.splice(next, 0, row);
    setFamilies(labelsOrder);

    const byLabel = new Map(rows.map((r) => [r.label, r.id]));
    const orderedIds = labelsOrder
      .map((f) => byLabel.get(f.label) ?? f.id)
      .filter((id) => !isEphemeral(id));

    await post({
      action: 'reorder',
      regionId,
      categoryId,
      orderedIds,
    });
  }

  const activeCount = (families || []).filter((f) => f.active).length;
  const ready =
    families.length === 0 || families.every((f) => !isEphemeral(f.id));

  return (
    <section
      id="clasificacion-familias"
      className="scroll-mt-6 rounded-xl border border-emerald-900/50 bg-neutral-950/80 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Consola taxonomía · familias · paginado
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-white">
            Crear · ordenar · colocar · renombrar · eliminar
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-neutral-400">
            Filtro por región/categoría. Máximo compacto:{' '}
            <strong className="text-neutral-200">{pageSize} fichas/página</strong>. Orden ↑↓ en
            el mismo scope; <strong className="text-neutral-200">Colocar</strong> mueve a otra
            región/categoría.
          </p>
        </div>
        <Link
          href="/admin/especimenes#fichas-especies"
          className="rounded-md border border-violet-800/60 bg-violet-950/40 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-900/50"
        >
          Fichas especie ↓
        </Link>
      </div>

      <div className="mt-3">
        <PublishProductionButton
          variant="field"
          reason={`catalogue-families:${regionId}:${categoryId}`}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Región
          <select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
          >
            {(meta?.regions ?? [{ id: regionId, label: regionId }]).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Categoría
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
          >
            {(meta?.categories ?? [{ id: categoryId, label: categoryId }]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Filtrar familia
          <input
            value={familyQ}
            onChange={(e) => {
              setFamilyQ(e.target.value);
              setPage(1);
            }}
            placeholder="Nymphalidae…"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void loadFamilies()}
          disabled={busy === 'load'}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
        >
          <RefreshCw size={12} className={busy === 'load' ? 'animate-spin' : ''} />
          Recargar
        </button>
        <button
          type="button"
          onClick={() => void ensureEditable()}
          disabled={Boolean(busy)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
        >
          {busy === 'seed' ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
          {ready ? 'Edición activa' : 'Activar edición'}
        </button>
        <button
          type="button"
          onClick={() => void post({ action: 'resync', regionId, categoryId })}
          disabled={Boolean(busy)}
          className="inline-flex items-center gap-1 rounded-md border border-sky-800 bg-sky-950/50 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-900/40"
        >
          {busy === 'resync' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CloudDownload size={12} />
          )}
          Sync Cloudinary
        </button>
        <button
          type="button"
          onClick={async () => {
            await post({ action: 'bootstrap_all' });
            await loadFamilies();
          }}
          disabled={Boolean(busy)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-800/60 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-100 hover:bg-amber-900/30"
        >
          {busy === 'bootstrap_all' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CloudDownload size={12} />
          )}
          Bootstrap todas
        </button>
        <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">
          {activeCount} activas / {families.length}
        </span>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="mt-3 rounded-md border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-xs font-medium text-emerald-200">
          ✓ {okMsg}
        </p>
      ) : null}

      <ul
        id="admin-familias-list"
        key={`fam-page-${safePage}-${pageSize}`}
        className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800"
      >
        {pageRows.map((f, i) => {
          const fullIndex = families.findIndex((x) => x.id === f.id);
          const alphaIndex = (safePage - 1) * pageSize + i;
          return (
            <li
              key={f.id}
              className={`px-3 py-2 text-sm ${
                f.active ? 'bg-neutral-950/40' : 'bg-neutral-900/30 opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 shrink-0 text-center text-[10px] text-neutral-500">
                  {alphaIndex + 1}
                </span>
                {editingId === f.id ? (
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveRename(f.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-neutral-100">{f.label}</span>
                  </div>
                )}
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <button
                    type="button"
                    title="Subir"
                    disabled={fullIndex <= 0 || Boolean(busy) || Boolean(familyQ)}
                    onClick={() => void move(fullIndex, -1)}
                    className="rounded border border-neutral-800 px-1.5 py-1 text-[10px] text-neutral-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    title="Bajar"
                    disabled={
                      fullIndex < 0 ||
                      fullIndex >= families.length - 1 ||
                      Boolean(busy) ||
                      Boolean(familyQ)
                    }
                    onClick={() => void move(fullIndex, 1)}
                    className="rounded border border-neutral-800 px-1.5 py-1 text-[10px] text-neutral-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown size={12} />
                  </button>
                  {editingId === f.id ? (
                    <button
                      type="button"
                      onClick={() => void saveRename(f.id)}
                      className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white"
                    >
                      GRABAR
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        setEditingId(f.id);
                        setEditLabel(f.label);
                      }}
                      className="inline-flex items-center gap-0.5 rounded border border-sky-900/60 px-1.5 py-1 text-[10px] text-sky-300 hover:bg-sky-950 disabled:opacity-30"
                    >
                      <Pencil size={12} />
                      Renombrar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setPlaceId(placeId === f.id ? null : f.id);
                      setPlaceRegionId(regionId);
                      setPlaceCategoryId(categoryId);
                    }}
                    className="inline-flex items-center gap-0.5 rounded border border-amber-900/50 px-1.5 py-1 text-[10px] text-amber-200 hover:bg-amber-950 disabled:opacity-30"
                  >
                    <FolderInput size={12} />
                    Colocar
                  </button>
                  {f.active ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Ocultar «${f.label}» del catálogo? (reactivable)`,
                          )
                        ) {
                          void setActive(f.id, false);
                        }
                      }}
                      className="inline-flex items-center gap-0.5 rounded border border-red-900/50 px-1.5 py-1 text-[10px] text-red-300 hover:bg-red-950 disabled:opacity-30"
                    >
                      <Trash2 size={12} />
                      Ocultar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void setActive(f.id, true)}
                      className="inline-flex items-center gap-0.5 rounded border border-emerald-900/50 px-1.5 py-1 text-[10px] text-emerald-300 hover:bg-emerald-950 disabled:opacity-30"
                    >
                      <Undo2 size={12} />
                      Reactivar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void hardDelete(f.id, f.label)}
                    className="rounded border border-red-950 px-1.5 py-1 text-[10px] text-red-400/80 hover:bg-red-950 disabled:opacity-30"
                    title="Borrar permanente"
                  >
                    Borrar
                  </button>
                </div>
              </div>

              {placeId === f.id ? (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded border border-amber-900/40 bg-amber-950/20 p-2">
                  <label className="flex flex-col gap-0.5 text-[10px] text-amber-200/80">
                    Región destino
                    <select
                      value={placeRegionId}
                      onChange={(e) => setPlaceRegionId(e.target.value)}
                      className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white"
                    >
                      {(meta?.regions ?? []).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] text-amber-200/80">
                    Categoría destino
                    <select
                      value={placeCategoryId}
                      onChange={(e) => setPlaceCategoryId(e.target.value)}
                      className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white"
                    >
                      {(meta?.categories ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void relocate(f.id)}
                    className="rounded bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600"
                  >
                    Mover aquí
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaceId(null)}
                    className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-400"
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
        {pageRows.length === 0 && !busy ? (
          <li className="px-3 py-4 text-center text-xs text-neutral-500">
            Sin familias en esta página / filtro.
          </li>
        ) : null}
      </ul>

      <AdminCardsPager
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredFamilies.length}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(n) => {
          setPageSize(Math.max(2, n));
          setPage(1);
        }}
        label="familias"
        scrollTargetId="admin-familias-list"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nueva familia = carpeta Cloudinary"
          disabled={Boolean(busy)}
          className="min-w-[14rem] flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-white placeholder:text-neutral-600 disabled:opacity-40"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void create();
          }}
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={!newLabel.trim() || Boolean(busy)}
          className="inline-flex items-center gap-1 rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-40"
        >
          <Plus size={14} />
          Crear ficha familia
        </button>
      </div>
    </section>
  );
}
