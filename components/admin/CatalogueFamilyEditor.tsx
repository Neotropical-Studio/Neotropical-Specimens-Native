'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  CloudDownload,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
} from 'lucide-react';
import PublishProductionButton from '@/components/admin/PublishProductionButton';

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
      // Avisa al panel CARD/VIDEO para refrescar nombres sin hardcode / sin pedirle a nadie.
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

  /** Activa edición: guarda lista en Supabase o JSON Cloudinary (sin SQL obligatorio). */
  async function ensureEditable(): Promise<FamilyRow[] | null> {
    if (families.length > 0 && !families.some((f) => isEphemeral(f.id))) {
      return families;
    }
    const json = await post({ action: 'seed', regionId, categoryId });
    if (!json?.families) return null;
    if (json.families.some((f) => isEphemeral(f.id))) {
      setError(
        'No se pudo guardar la lista. Revisá Cloudinary API keys en Vercel.',
      );
      return null;
    }
    setOkMsg(
      json.storage === 'cloudinary-meta'
        ? 'Lista editable (guardada en Cloudinary meta).'
        : 'Lista editable (guardada en Supabase).',
    );
    return json.families;
  }

  async function enableEdit() {
    await ensureEditable();
  }

  async function resync() {
    await ensureEditable();
    await post({ action: 'resync', regionId, categoryId });
  }

  async function bootstrapAll() {
    await post({ action: 'bootstrap_all' });
    await loadFamilies();
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
    const realId = isEphemeral(id)
      ? rows.find((r) => r.label === families.find((f) => f.id === id)?.label)?.id ??
        id
      : id;
    const ok = await post({ action: 'update', id: realId, label });
    if (ok) {
      setEditingId(null);
      setEditLabel('');
    }
  }

  async function setActive(id: string, active: boolean) {
    const rows = await ensureEditable();
    if (!rows) return;
    const realId = isEphemeral(id)
      ? rows.find((r) => r.label === families.find((f) => f.id === id)?.label)?.id ??
        id
      : id;
    await post({ action: 'update', id: realId, active });
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= families.length) return;
    const rows = await ensureEditable();
    if (!rows) return;

    // Reordenar sobre la lista persistida (mismos labels)
    const labelsOrder = [...families];
    const [row] = labelsOrder.splice(index, 1);
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

  const activeCount = families.filter((f) => f.active).length;
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
            Clasificación · regenerativa · industrial · cero hardcode
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-white">
            Crear · ordenar · renombrar · eliminar · colocar
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-neutral-400">
            Libre para modificar el catálogo cuando quieras:{' '}
            <strong className="text-neutral-200">↑↓ ordenar</strong>,{' '}
            <strong className="text-neutral-200">lápiz renombrar</strong>,{' '}
            <strong className="text-neutral-200">papelera ocultar/eliminar</strong>,{' '}
            <strong className="text-neutral-200">Crear</strong> abajo. CARD/VIDEO → panel Node
            Media arriba (grabar / eliminar / reemplazar). Taxonomía de cada pieza → Especímenes.
          </p>
        </div>
        <Link
          href="/admin/especimenes"
          className="rounded-md border border-violet-800/60 bg-violet-950/40 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-900/50"
        >
          Taxonomía por espécimen →
        </Link>
      </div>

      <div className="mt-3">
        <PublishProductionButton
          variant="field"
          reason={`catalogue-families:${regionId}:${categoryId}`}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Región
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
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
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
          >
            {(meta?.categories ?? [{ id: categoryId, label: categoryId }]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
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
          onClick={() => void enableEdit()}
          disabled={Boolean(busy)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
        >
          {busy === 'seed' ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
          {ready ? 'Edición activa' : 'Activar edición (guardar lista)'}
        </button>
        <button
          type="button"
          onClick={() => void resync()}
          disabled={Boolean(busy)}
          className="inline-flex items-center gap-1 rounded-md border border-sky-800 bg-sky-950/50 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-900/40"
        >
          {busy === 'resync' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CloudDownload size={12} />
          )}
          Sync carpetas Cloudinary
        </button>
        <button
          type="button"
          onClick={() => void bootstrapAll()}
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
        {ready ? (
          <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">
            Lista viva · {activeCount} activas / {families.length}
          </span>
        ) : (
          <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] text-amber-200">
            Solo lectura hasta «Activar edición»
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="mt-3 rounded-md border border-emerald-700 bg-emerald-950/50 px-3 py-2.5 text-sm font-medium text-emerald-200">
          ✓ {okMsg}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {families.map((f, i) => (
          <li
            key={f.id}
            className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${
              f.active ? 'bg-neutral-950/40' : 'bg-neutral-900/30 opacity-60'
            }`}
          >
            <span className="w-6 shrink-0 text-center text-[10px] text-neutral-500">
              {i + 1}
            </span>
            {editingId === f.id ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  autoFocus
                  placeholder="Nombre visible"
                  className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveRename(f.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <span className="text-[10px] text-neutral-500">
                  Carpeta media (no cambia al renombrar):{' '}
                  <span className="font-mono text-neutral-400">
                    {f.folder ?? f.label}
                  </span>
                </span>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="block truncate text-neutral-100">{f.label}</span>
                {f.folder && f.folder !== f.label ? (
                  <span className="block truncate font-mono text-[10px] text-neutral-500">
                    media: {f.folder}
                  </span>
                ) : null}
              </div>
            )}
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <button
                type="button"
                title="Subir en el orden"
                disabled={i === 0 || Boolean(busy)}
                onClick={() => void move(i, -1)}
                className="inline-flex items-center gap-0.5 rounded border border-neutral-800 px-1.5 py-1 text-[10px] text-neutral-400 hover:border-neutral-600 hover:text-white disabled:opacity-30"
              >
                <ArrowUp size={12} />
                Subir
              </button>
              <button
                type="button"
                title="Bajar en el orden"
                disabled={i === families.length - 1 || Boolean(busy)}
                onClick={() => void move(i, 1)}
                className="inline-flex items-center gap-0.5 rounded border border-neutral-800 px-1.5 py-1 text-[10px] text-neutral-400 hover:border-neutral-600 hover:text-white disabled:opacity-30"
              >
                <ArrowDown size={12} />
                Bajar
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
                  title="Renombrar / modificar"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setEditingId(f.id);
                    setEditLabel(f.label);
                  }}
                  className="inline-flex items-center gap-0.5 rounded border border-sky-900/60 px-1.5 py-1 text-[10px] text-sky-300 hover:bg-sky-950 disabled:opacity-30"
                >
                  <Pencil size={12} />
                  Modificar
                </button>
              )}
              {f.active ? (
                <button
                  type="button"
                  title="Ocultar del catálogo (se puede reactivar)"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Ocultar «${f.label}» del catálogo?\n(Podés reactivarla después. CARD/VIDEO en Cloudinary no se borran.)`,
                      )
                    ) {
                      void setActive(f.id, false);
                    }
                  }}
                  className="inline-flex items-center gap-0.5 rounded border border-red-900/50 px-1.5 py-1 text-[10px] text-red-300 hover:bg-red-950 disabled:opacity-30"
                >
                  <Trash2 size={12} />
                  Eliminar
                </button>
              ) : (
                <button
                  type="button"
                  title="Volver a mostrar en el catálogo"
                  disabled={Boolean(busy)}
                  onClick={() => void setActive(f.id, true)}
                  className="inline-flex items-center gap-0.5 rounded border border-emerald-900/50 px-1.5 py-1 text-[10px] text-emerald-300 hover:bg-emerald-950 disabled:opacity-30"
                >
                  <Undo2 size={12} />
                  Reactivar
                </button>
              )}
            </div>
          </li>
        ))}
        {families.length === 0 && !busy ? (
          <li className="px-3 py-4 text-center text-xs text-neutral-500">
            Lista vacía — creá la primera familia abajo.
          </li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nuevo nombre (libre) = carpeta Cloudinary"
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
          Crear / agregar
        </button>
      </div>
    </section>
  );
}
