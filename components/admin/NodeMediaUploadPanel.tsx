'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import type { NodeMediaUploadTarget } from '@/lib/mirror/contract';
import { CATALOGUE_CATEGORIES, familyCatalogHref, slugifyCatalogue } from '@/lib/specimens/catalogueNav';
import { NEO_FAMILIES_CHANGED } from '@/lib/specimens/catalogue-families-events';
import { acceptForKind } from '@/lib/media/universal-capture';
import UniversalMediaCapture from '@/components/admin/UniversalMediaCapture';

type Props = {
  targets: NodeMediaUploadTarget[];
};

/** Macro-fases del árbol (como pidió el usuario). */
type Stage = 'rubro' | 'region' | 'categoria' | 'familia' | 'catalogo';
type Slot = 'card' | 'video';

type MediaItem = { publicId: string; secureUrl: string; resourceType: string };

type LastSaved = {
  slot: Slot;
  label: string;
  publicId: string;
  folder: string;
  secureUrl?: string;
  at: string;
};

const STAGE_LABEL: Record<Stage, string> = {
  rubro: '1 · Rubro',
  region: '2 · Región',
  categoria: '3 · Categorías',
  familia: '4 · Familias',
  catalogo: '5 · Catálogo / especies',
};

/** Labels regenerativos desde el contrato de catálogo (no tabla fija de nombres). */
function catLabel(index1Based: number): string {
  const cat = CATALOGUE_CATEGORIES[index1Based - 1];
  return cat ? `CAT${index1Based} · ${cat.label}` : `CAT${index1Based}`;
}

export default function NodeMediaUploadPanel({ targets: initialTargets }: Props) {
  const [targets, setTargets] = useState(initialTargets);
  const [stage, setStage] = useState<Stage>('rubro');
  const [slot, setSlot] = useState<Slot>('card');
  /** CAT1…CAT5 mientras stage=categoria */
  const [catIndex, setCatIndex] = useState(1);
  const [regionId, setRegionId] = useState('neotropical');
  const [familyCategoryId, setFamilyCategoryId] = useState('butterflies-lepidoptera-diurne');
  const [targetId, setTargetId] = useState(
    () => initialTargets.find((t) => t.level === 'rubro')?.id ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [uploads, setUploads] = useState(0);
  const [current, setCurrent] = useState<MediaItem | null>(null);
  /** Estado de ambos slots del nodo (para botones Eliminar CARD / VIDEO siempre visibles). */
  const [slotStatus, setSlotStatus] = useState<{
    card: MediaItem | null;
    video: MediaItem | null;
  }>({ card: null, video: null });
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<Slot | null>(null);
  const [refreshingTargets, setRefreshingTargets] = useState(false);
  /** Archivo elegido pero aún no grabado en Cloudinary. */
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const updateCardInputRef = useRef<HTMLInputElement>(null);
  const updateVideoInputRef = useRef<HTMLInputElement>(null);
  const [lastSaved, setLastSaved] = useState<LastSaved | null>(null);

  /** Misma fuente que storefront (meta Cloudinary / DB), no lista hardcoded. */
  async function refreshTargets() {
    setRefreshingTargets(true);
    try {
      const res = await fetch('/api/admin/node-media');
      const json = (await res.json()) as {
        targets?: NodeMediaUploadTarget[];
        error?: string;
      };
      if (res.ok && json.targets?.length) {
        setTargets(json.targets);
      }
    } catch {
      /* keep current */
    } finally {
      setRefreshingTargets(false);
    }
  }

  useEffect(() => {
    setTargets(initialTargets);
  }, [initialTargets]);

  useEffect(() => {
    if (stage === 'familia') void refreshTargets();
  }, [stage]);

  useEffect(() => {
    const onChange = () => {
      void refreshTargets();
    };
    window.addEventListener(NEO_FAMILIES_CHANGED, onChange);
    return () => window.removeEventListener(NEO_FAMILIES_CHANGED, onChange);
  }, []);

  const regions = useMemo(
    () => targets.filter((t) => t.level === 'region'),
    [targets],
  );

  const filtered = useMemo(() => {
    if (stage === 'rubro') return targets.filter((t) => t.level === 'rubro');
    if (stage === 'region') return targets.filter((t) => t.level === 'region');
    if (stage === 'categoria') {
      return targets.filter(
        (t) =>
          t.level === 'categoria' &&
          t.regionId === regionId &&
          t.categoryIndex === catIndex,
      );
    }
    if (stage === 'familia') {
      return targets.filter(
        (t) =>
          t.level === 'familia' &&
          t.regionId === regionId &&
          t.categoryId === familyCategoryId,
      );
    }
    return [];
  }, [targets, stage, regionId, catIndex, familyCategoryId]);

  const selected = filtered.find((t) => t.id === targetId) ?? filtered[0] ?? null;

  async function fetchSlotPrimary(tid: string, s: Slot): Promise<MediaItem | null> {
    const res = await fetch(
      `/api/admin/node-media?targetId=${encodeURIComponent(tid)}&slot=${s}`,
    );
    const json = (await res.json()) as {
      error?: string;
      primary?: MediaItem | null;
    };
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json.primary ?? null;
  }

  async function refreshCurrent(tid: string, s: Slot) {
    setLoadingCurrent(true);
    try {
      const [card, video] = await Promise.all([
        fetchSlotPrimary(tid, 'card'),
        fetchSlotPrimary(tid, 'video'),
      ]);
      setSlotStatus({ card, video });
      setCurrent(s === 'card' ? card : video);
    } catch {
      setCurrent(null);
      setSlotStatus({ card: null, video: null });
    } finally {
      setLoadingCurrent(false);
    }
  }

  useEffect(() => {
    if (stage === 'catalogo' || !selected) {
      setCurrent(null);
      setSlotStatus({ card: null, video: null });
      return;
    }
    void refreshCurrent(selected.id, slot);
  }, [stage, slot, selected?.id]);

  const familyCategoriesInRegion = useMemo(() => {
    const map = new Map<string, { id: string; index: number; count: number; label: string }>();
    for (const t of targets) {
      if (t.level !== 'familia' || t.regionId !== regionId || !t.categoryId) continue;
      const prev = map.get(t.categoryId);
      if (prev) prev.count += 1;
      else {
        map.set(t.categoryId, {
          id: t.categoryId,
          index: t.categoryIndex ?? 0,
          count: 1,
          label: catLabel(t.categoryIndex ?? 0),
        });
      }
    }
    return [...map.values()].sort((a, b) => a.index - b.index);
  }, [targets, regionId]);

  function syncTargetForContext(next: {
    stage: Stage;
    regionId?: string;
    catIndex?: number;
    familyCategoryId?: string;
  }) {
    const st = next.stage;
    const rid = next.regionId ?? regionId;
    const ci = next.catIndex ?? catIndex;
    const fcat = next.familyCategoryId ?? familyCategoryId;
    let list: NodeMediaUploadTarget[] = [];
    if (st === 'rubro') list = targets.filter((t) => t.level === 'rubro');
    else if (st === 'region') list = targets.filter((t) => t.level === 'region');
    else if (st === 'categoria') {
      list = targets.filter(
        (t) => t.level === 'categoria' && t.regionId === rid && t.categoryIndex === ci,
      );
    } else if (st === 'familia') {
      list = targets.filter(
        (t) => t.level === 'familia' && t.regionId === rid && t.categoryId === fcat,
      );
    }
    setTargetId(list[0]?.id ?? '');
  }

  function goStage(next: Stage, nextSlot: Slot = 'card') {
    setStage(next);
    setSlot(nextSlot);
    setError(null);
    setOk(null);
    clearPending();
    syncTargetForContext({ stage: next });
  }

  /** Abrir cualquier CAT1…CAT5 en ventana CARD (sin quedar atrapado). */
  function openCategory(index1Based: number, nextSlot: Slot = 'card') {
    const cat = CATALOGUE_CATEGORIES[index1Based - 1];
    setStage('categoria');
    setCatIndex(index1Based);
    setSlot(nextSlot);
    setError(null);
    setOk(null);
    if (cat) setFamilyCategoryId(cat.id);
    syncTargetForContext({
      stage: 'categoria',
      catIndex: index1Based,
    });
  }

  function afterUploadAdvanceHint(): string {
    if (slot === 'card') return 'Siguiente: otra ventana VIDEO corto';
    if (stage === 'rubro') return 'Siguiente: Región CARD';
    if (stage === 'region') return 'Siguiente: CAT1 CARD';
    if (stage === 'categoria' && catIndex < 5) return `Siguiente: CAT${catIndex + 1} CARD`;
    if (stage === 'categoria') return 'Siguiente: Familias de la categoría';
    if (stage === 'familia') return 'Siguiente: Catálogo / especies de esta familia';
    return '';
  }

  function goNext() {
    setError(null);
    setOk(null);
    if (slot === 'card') {
      setSlot('video');
      return;
    }
    // slot === video → avanzar nivel
    if (stage === 'rubro') {
      goStage('region', 'card');
      return;
    }
    if (stage === 'region') {
      openCategory(1, 'card');
      return;
    }
    if (stage === 'categoria') {
      if (catIndex < 5) {
        openCategory(catIndex + 1, 'card');
        return;
      }
      // Tras CAT5 video → familias (default butterflies = CAT1 en orden storefront)
      const firstFamCat = CATALOGUE_CATEGORIES[0]?.id ?? 'butterflies-lepidoptera-diurne';
      setFamilyCategoryId(firstFamCat);
      setStage('familia');
      setSlot('card');
      syncTargetForContext({
        stage: 'familia',
        familyCategoryId: firstFamCat,
      });
      return;
    }
    if (stage === 'familia') {
      goStage('catalogo', 'card');
    }
  }

  function goPrev() {
    setError(null);
    setOk(null);
    if (slot === 'video') {
      setSlot('card');
      return;
    }
    if (stage === 'region') {
      goStage('rubro', 'video');
      return;
    }
    if (stage === 'categoria') {
      if (catIndex > 1) {
        openCategory(catIndex - 1, 'video');
        return;
      }
      goStage('region', 'video');
      return;
    }
    if (stage === 'familia') {
      openCategory(5, 'video');
      return;
    }
    if (stage === 'catalogo') {
      goStage('familia', 'video');
    }
  }

  function clearPending() {
    setPendingFile(null);
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
  }

  /** Archivo desde cualquier dispositivo (galería, cámara, escáner, disco). */
  function receiveFile(file: File) {
    if (!selected || stage === 'catalogo') return;
    setError(null);
    setOk(null);
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  }

  async function grabarFile(file: File, slotOverride?: Slot) {
    if (!selected || stage === 'catalogo') return;
    const activeSlot = slotOverride ?? slot;
    setSlot(activeSlot);
    setBusy(true);
    setError(null);
    setOk(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('targetId', selected.id);
    fd.append('slot', activeSlot);
    fd.append('replace', '1');

    try {
      const res = await fetch('/api/admin/node-media', { method: 'POST', body: fd });
      const json = (await res.json()) as {
        error?: string;
        publicId?: string;
        folder?: string;
        secureUrl?: string;
        production?: { ok?: boolean };
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const folder =
        json.folder ??
        (activeSlot === 'card' ? selected.cardFolder : selected.videoFolder);
      const at = new Date().toLocaleString('es-PE', { hour12: false });
      setLastSaved({
        slot: activeSlot,
        label: selected.label,
        publicId: json.publicId ?? '—',
        folder,
        secureUrl: json.secureUrl,
        at,
      });
      const prodNote =
        json.production?.ok === false
          ? ' · prod: revisar'
          : ' · producción actualizada';
      setOk(
        `ACTUALIZADO ${activeSlot.toUpperCase()} · ${selected.label} · ${at}${prodNote}`,
      );
      setUploads((n) => n + 1);
      clearPending();
      if (json.secureUrl && json.publicId) {
        const next: MediaItem = {
          publicId: json.publicId,
          secureUrl: json.secureUrl,
          resourceType: activeSlot === 'video' ? 'video' : 'image',
        };
        setCurrent(next);
        setSlotStatus((prev) => ({ ...prev, [activeSlot]: next }));
      } else {
        await refreshCurrent(selected.id, activeSlot);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGrabar() {
    if (!pendingFile) return;
    await grabarFile(pendingFile);
  }

  /** Abrir selector → subir/reemplazar CARD o VIDEO de una. */
  function openUpdatePicker(which: Slot) {
    if (!selected || busy || stage === 'catalogo') return;
    setSlot(which);
    setError(null);
    setOk(null);
    clearPending();
    if (which === 'video') updateVideoInputRef.current?.click();
    else updateCardInputRef.current?.click();
  }

  async function handleUpdateFileChange(
    which: Slot,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await grabarFile(file, which);
  }

  async function handleDeleteSlot(which: Slot) {
    if (!selected || stage === 'catalogo') return;
    const item = which === 'card' ? slotStatus.card : slotStatus.video;
    const label = which === 'video' ? 'VIDEO' : 'CARD';
    if (
      !window.confirm(
        item
          ? `¿Eliminar el ${label} de este nodo?\n${item.publicId}`
          : `¿Vaciar el slot ${label} de este nodo?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setDeletingSlot(which);
    setError(null);
    setOk(null);
    try {
      const qs = new URLSearchParams({
        targetId: selected.id,
        slot: which,
      });
      const res = await fetch(`/api/admin/node-media?${qs}`, { method: 'DELETE' });
      const json = (await res.json()) as { error?: string; message?: string; deleted?: number };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSlotStatus((prev) => ({ ...prev, [which]: null }));
      if (slot === which) setCurrent(null);
      setOk(json.message ?? `${label} eliminado (${json.deleted ?? 0}).`);
      setUploads((n) => n + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setDeletingSlot(null);
    }
  }

  async function handleDelete() {
    await handleDeleteSlot(slot);
  }

  const folderPreview =
    selected && stage !== 'catalogo'
      ? slot === 'card'
        ? selected.cardFolder
        : selected.videoFolder
      : '—';

  const isVideo = slot === 'video';
  const familyCount = filtered.length;

  const catalogUrl =
    selected?.level === 'familia' && selected.regionId && selected.categoryId && selected.familyName
      ? familyCatalogHref('es', {
          rubro: 'dried-specimens',
          region: selected.regionId,
          categoria: selected.categoryId,
          familia: slugifyCatalogue(selected.familyName),
        })
      : regionId && familyCategoryId
        ? `/es/catalogue/dried-specimens/${regionId}/${familyCategoryId}?view=families`
        : '/es/catalogue/dried-specimens';

  return (
    <div className="flex flex-col gap-4">
      {/* Macro etapas */}
      <div className="grid gap-1.5 sm:grid-cols-5">
        {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => {
          const active = stage === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => goStage(s, s === 'catalogo' ? 'card' : 'card')}
              className={`rounded-md border px-2 py-2 text-left text-[10px] font-semibold transition ${
                active
                  ? s === 'catalogo'
                    ? 'border-emerald-500 bg-emerald-950 text-emerald-100'
                    : 'border-sky-500 bg-sky-950 text-sky-100'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-600'
              }`}
            >
              {STAGE_LABEL[s]}
            </button>
          );
        })}
      </div>

      {stage === 'catalogo' ? (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4">
          <h2 className="text-sm font-semibold text-emerald-200">
            Catálogo de la familia → especies
          </h2>
          <p className="mt-2 text-xs text-neutral-400">
            Ya cargaste card + video del rubro, región, CAT1…CAT5 y familias. Ahora entrá al
            catálogo de <strong className="text-neutral-200">cada familia</strong> para ver /
            cargar las especies totales de esa familia.
          </p>
          <p className="mt-2 text-[11px] text-neutral-500">
            Región activa: <code className="text-neutral-300">{regionId}</code> · Categoría:{' '}
            <code className="text-neutral-300">{familyCategoryId}</code>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex items-center gap-2 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
            >
              <ArrowLeft size={14} /> Volver a familia VIDEO
            </button>
            <a
              href={catalogUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-emerald-950 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-900"
            >
              Abrir catálogo / especies
              <ArrowRight size={16} />
            </a>
            <a
              href="#espejo-discover"
              className="inline-flex items-center gap-2 rounded border border-sky-700 bg-sky-950/50 px-3 py-2 text-sm text-sky-200"
            >
              Discover / Apply espejo
            </a>
          </div>
          <div className="mt-4">
          </div>
        </div>
      ) : (
        <div
          className={`rounded-lg border p-4 ${
            isVideo ? 'border-violet-900/60 bg-violet-950/25' : 'border-sky-900/60 bg-sky-950/25'
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                isVideo ? 'bg-violet-900 text-violet-100' : 'bg-sky-900 text-sky-100'
              }`}
            >
              {isVideo ? 'Ventana VIDEO corto' : 'Ventana CARD'}
            </span>
            {stage === 'categoria' ? (
              <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                {catLabel(catIndex)}
              </span>
            ) : null}
            {stage === 'familia' ? (
              <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] text-amber-200">
                {familyCount} familias en esta CAT
                {refreshingTargets ? ' · actualizando…' : ''}
              </span>
            ) : null}
            {uploads > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 size={11} /> {uploads} subida(s) esta sesión
              </span>
            ) : null}
          </div>

          <h2 className={`text-sm font-semibold ${isVideo ? 'text-violet-200' : 'text-sky-200'}`}>
            {STAGE_LABEL[stage]} · {isVideo ? 'VIDEO' : 'CARD'}
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Universal / industrial: en cada nodo podés{' '}
            <strong className="text-neutral-200">grabar</strong>,{' '}
            <strong className="text-neutral-200">reemplazar</strong> o{' '}
            <strong className="text-red-300">eliminar CARD / VIDEO</strong> cuando quieras.
            Familias (crear · ordenar · renombrar · eliminar) → panel Clasificación abajo.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {stage === 'rubro' && (isVideo ? 'Ventana VIDEO del rubro.' : 'Ventana CARD del rubro.')}
            {stage === 'region' &&
              (isVideo ? 'Ventana VIDEO de la región.' : 'Ventana CARD de la región.')}
            {stage === 'categoria' &&
              (isVideo
                ? `Ventana VIDEO de CAT${catIndex}.`
                : `Ventana CARD de CAT${catIndex}.`)}
            {stage === 'familia' &&
              (isVideo
                ? 'Ventana VIDEO de la familia → luego catálogo.'
                : 'Ventana CARD de la familia.')}
          </p>
          {stage === 'familia' ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <a
                href="#clasificacion-familias"
                className="text-emerald-400 underline-offset-2 hover:underline"
              >
                Crear / ordenar / renombrar / desactivar familias →
              </a>
              <button
                type="button"
                onClick={() => void refreshTargets()}
                disabled={refreshingTargets}
                className="rounded border border-sky-800 bg-sky-950/40 px-2 py-0.5 text-[10px] text-sky-200 hover:bg-sky-900/50 disabled:opacity-50"
              >
                {refreshingTargets ? 'Actualizando…' : 'Actualizar nombres del dropdown'}
              </button>
              {' · '}
              <Link
                href="/admin/especimenes"
                className="text-violet-400 underline-offset-2 hover:underline"
              >
                Cambiar orden · subfamilia · género · especie →
              </Link>
            </p>
          ) : null}

          {/* Selectores de contexto */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(stage === 'region' ||
              stage === 'categoria' ||
              stage === 'familia') && (
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Región / zona
                <select
                  value={regionId}
                  onChange={(e) => {
                    const rid = e.target.value;
                    setRegionId(rid);
                    setError(null);
                    setOk(null);
                    syncTargetForContext({ stage, regionId: rid });
                  }}
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.regionId ?? r.id.replace(/^region:/, '')}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {stage === 'categoria' ? (
              <div className="flex flex-col gap-1 text-xs text-neutral-400 sm:col-span-2">
                <span>Abrir categoría (CAT1…CAT5) · cada una CARD + VIDEO</span>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
                  {CATALOGUE_CATEGORIES.map((c, i) => {
                    const idx = i + 1;
                    const active = catIndex === idx;
                    const hasTarget = targets.some(
                      (t) =>
                        t.level === 'categoria' &&
                        t.regionId === regionId &&
                        t.categoryIndex === idx,
                    );
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!hasTarget}
                        onClick={() => openCategory(idx, 'card')}
                        title={
                          hasTarget
                            ? `${c.label} · abrir ventana CARD`
                            : 'Nodo no encontrado en allowlist'
                        }
                        className={`rounded border px-2 py-2 text-left text-[11px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          active
                            ? 'border-cyan-500 bg-cyan-950/70 text-cyan-100 ring-1 ring-cyan-600/60'
                            : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-sky-600 hover:text-white'
                        }`}
                      >
                        <span className="font-semibold text-amber-200">CAT{idx}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
                          {c.label}
                        </span>
                        <span className="mt-1 block text-[9px] uppercase tracking-wide text-sky-400/90">
                          {active ? (isVideo ? 'VIDEO abierto' : 'CARD abierta') : 'Abrir CARD →'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => {
                      setSlot('card');
                      setError(null);
                      setOk(null);
                      clearPending();
                    }}
                    className={`rounded border px-3 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
                      !isVideo
                        ? 'border-sky-500 bg-sky-950 text-sky-100'
                        : 'border-neutral-700 text-neutral-400 hover:border-sky-700'
                    }`}
                  >
                    Ventana CARD
                  </button>
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => {
                      setSlot('video');
                      setError(null);
                      setOk(null);
                      clearPending();
                    }}
                    className={`rounded border px-3 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
                      isVideo
                        ? 'border-violet-500 bg-violet-950 text-violet-100'
                        : 'border-neutral-700 text-neutral-400 hover:border-violet-700'
                    }`}
                  >
                    Ventana VIDEO
                  </button>
                </div>
                {!selected ? (
                  <p className="mt-1 text-[11px] text-red-300">
                    No hay nodo CAT{catIndex} para esta región. Probá otra región o recargá la
                    página.
                  </p>
                ) : null}
              </div>
            ) : null}

            {stage === 'familia' && (
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                Categoría (familias de…)
                <select
                  value={familyCategoryId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setFamilyCategoryId(cid);
                    setError(null);
                    setOk(null);
                    syncTargetForContext({ stage: 'familia', familyCategoryId: cid });
                  }}
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
                >
                  {familyCategoriesInRegion.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} · {c.count} familias
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label
              className={`flex flex-col gap-1 text-xs text-neutral-400 ${
                stage === 'familia' || stage === 'region' || stage === 'categoria'
                  ? 'sm:col-span-2'
                  : 'sm:col-span-2'
              }`}
            >
              {stage === 'rubro'
                ? 'Rubro'
                : stage === 'region'
                  ? 'Nodo región (upload)'
                  : stage === 'categoria'
                    ? `Nodo CAT${catIndex}`
                    : 'Familia'}
              <select
                value={selected?.id ?? ''}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  setError(null);
                  setOk(null);
                  clearPending();
                }}
                className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
              >
                {filtered.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-3 break-all rounded border border-neutral-800 bg-neutral-950/80 px-3 py-2 font-mono text-[11px] text-amber-200/90">
            Destino fijo: {folderPreview}
          </p>

          {/* Preview CARD + VIDEO con Eliminar siempre visibles */}
          <div className="mt-3 rounded border border-neutral-800 bg-neutral-950/50 p-3">
            <p className="mb-2 text-[11px] font-medium text-neutral-400">
              Media del nodo{' '}
              {loadingCurrent
                ? '· cargando…'
                : `· CARD ${slotStatus.card ? '✓' : 'vacío'} · VIDEO ${slotStatus.video ? '✓' : 'vacío'}`}
            </p>
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              {(['card', 'video'] as const).map((s) => {
                const item = s === 'card' ? slotStatus.card : slotStatus.video;
                const active = slot === s;
                return (
                  <div
                    key={s}
                    className={`rounded border p-2 ${
                      active
                        ? s === 'video'
                          ? 'border-violet-700 bg-violet-950/40'
                          : 'border-sky-700 bg-sky-950/40'
                        : 'border-neutral-800 bg-neutral-950/40'
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                      {s === 'video' ? 'VIDEO' : 'CARD'}
                      {active ? ' · editando' : ''}
                    </p>
                    {item ? (
                      s === 'video' ? (
                        <video
                          src={item.secureUrl}
                          className="mb-2 h-20 w-full rounded border border-neutral-700 object-cover"
                          controls
                          muted
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.secureUrl}
                          alt=""
                          className="mb-2 h-20 w-full rounded border border-neutral-700 object-cover"
                        />
                      )
                    ) : (
                      <p className="mb-2 text-[11px] text-neutral-600">Sin archivo</p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={busy || !selected}
                        onClick={() => openUpdatePicker(s)}
                        className={`inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-bold touch-manipulation disabled:cursor-not-allowed disabled:opacity-35 ${
                          s === 'video'
                            ? 'border-violet-500 bg-violet-700 text-white hover:bg-violet-600'
                            : 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        <RefreshCw size={15} />
                        {busy && slot === s
                          ? 'Actualizando…'
                          : item
                            ? s === 'video'
                              ? 'Actualizar VIDEO'
                              : 'Actualizar CARD'
                            : s === 'video'
                              ? 'Subir VIDEO'
                              : 'Subir CARD'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !selected}
                        onClick={() => void handleDeleteSlot(s)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-red-800 bg-red-950/60 px-2 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Trash2 size={13} />
                        {deletingSlot === s
                          ? 'Eliminando…'
                          : s === 'video'
                            ? 'Eliminar VIDEO'
                            : 'Eliminar CARD'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <input
              ref={updateCardInputRef}
              type="file"
              className="hidden"
              accept={acceptForKind('image')}
              disabled={busy || !selected}
              onChange={(e) => void handleUpdateFileChange('card', e)}
            />
            <input
              ref={updateVideoInputRef}
              type="file"
              className="hidden"
              accept={acceptForKind('video')}
              disabled={busy || !selected}
              onChange={(e) => void handleUpdateFileChange('video', e)}
            />
            {current ? (
              <p className="break-all text-[10px] text-neutral-500">
                Slot activo: <span className="text-neutral-300">{current.publicId}</span>
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500">
                Slot {slot === 'video' ? 'VIDEO' : 'CARD'} vacío — subí uno cuando quieras.
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <UniversalMediaCapture
              kind={isVideo ? 'video' : 'image'}
              disabled={busy || !selected}
              onFile={receiveFile}
            />
            <div className="flex w-full flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !selected || !pendingFile}
                onClick={() => void handleGrabar()}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[44px] sm:flex-none"
              >
                <Save size={16} />
                {busy
                  ? 'Grabando…'
                  : current
                    ? isVideo
                      ? 'GRABAR / ACTUALIZAR VIDEO'
                      : 'GRABAR / ACTUALIZAR CARD'
                    : isVideo
                      ? 'GRABAR VIDEO'
                      : 'GRABAR CARD'}
              </button>
              {pendingFile ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={clearPending}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-400 touch-manipulation hover:bg-neutral-900 sm:min-h-[44px]"
                >
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy || !selected || !!pendingFile}
                onClick={() => void handleDelete()}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-red-800 bg-red-950/50 px-3 py-2.5 text-sm font-semibold text-red-200 touch-manipulation hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[44px] sm:flex-none"
                title={
                  current
                    ? `Eliminar ${isVideo ? 'VIDEO' : 'CARD'} guardado`
                    : `Vaciar slot ${isVideo ? 'VIDEO' : 'CARD'} (por si hay archivo en Cloudinary)`
                }
              >
                <Trash2 size={15} />
                {isVideo ? 'Eliminar VIDEO' : 'Eliminar CARD'}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Usá <strong className="text-emerald-300">Actualizar CARD</strong> o{' '}
              <strong className="text-violet-300">Actualizar VIDEO</strong> arriba para
              reemplazar la foto/video de una. También podés Galería/Cámara → GRABAR.
            </p>
          </div>

          {pendingFile && pendingPreviewUrl ? (
            <div className="mt-3 rounded border border-amber-800/70 bg-amber-950/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                Pendiente de grabar — todavía no está en el website
              </p>
              <div className="mt-2 flex flex-wrap items-start gap-3">
                {isVideo ? (
                  <video
                    src={pendingPreviewUrl}
                    className="h-24 w-40 rounded border border-amber-900 object-cover"
                    controls
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingPreviewUrl}
                    alt=""
                    className="h-24 w-40 rounded border border-amber-900 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 text-[11px] text-neutral-400">
                  <p className="truncate text-neutral-200">{pendingFile.name}</p>
                  <p className="mt-1">
                    {(pendingFile.size / 1024 / 1024).toFixed(2)} MB · nodo:{' '}
                    <span className="text-neutral-300">{selected?.label}</span>
                  </p>
                  <p className="mt-1 text-amber-200/90">
                    Tocá <strong>GRABAR {slot.toUpperCase()}</strong> para guardar en Cloudinary.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-2 rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[10px] text-neutral-400">
            Industrial: Cloudinary (archivo) + registry Supabase <code className="text-neutral-300">node_media</code>{' '}
            (índice). Tags neo_node_* de respaldo. Eliminar borra archivo + fila → el catálogo deja de
            mostrar. Sin ghosts ni hardcode de nodos.
          </p>

          {error && (
            <p className="mt-3 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          {ok && (
            <div className="mt-3 rounded border border-emerald-700 bg-emerald-950/50 px-3 py-3 text-sm text-emerald-200">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} /> {ok}
              </p>
              {lastSaved ? (
                <ul className="mt-2 space-y-1 font-mono text-[11px] text-emerald-300/90">
                  <li>publicId: {lastSaved.publicId}</li>
                  <li>carpeta: {lastSaved.folder}</li>
                  <li>hora: {lastSaved.at}</li>
                </ul>
              ) : null}
              <p className="mt-2 text-[11px] text-emerald-400/80">
                Ya está grabado. Entrá al website (hard refresh) para ver el cambio en ese nodo.
              </p>
              <div className="mt-3">
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80 pt-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={stage === 'rubro' && slot === 'card'}
              className="inline-flex items-center gap-2 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900 disabled:opacity-40"
            >
              <ArrowLeft size={14} />
              Anterior
            </button>
            <button
              type="button"
              onClick={goNext}
              className={`inline-flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium ${
                isVideo
                  ? 'border-emerald-600 bg-emerald-950 text-emerald-200 hover:bg-emerald-900'
                  : 'border-violet-600 bg-violet-950 text-violet-200 hover:bg-violet-900'
              }`}
            >
              {isVideo
                ? stage === 'familia'
                  ? 'Siguiente · Catálogo especies'
                  : stage === 'categoria' && catIndex < 5
                    ? `Siguiente · CAT${catIndex + 1} CARD`
                    : stage === 'categoria'
                      ? 'Siguiente · Familias'
                      : stage === 'region'
                        ? 'Siguiente · CAT1 CARD'
                        : 'Siguiente · Región CARD'
                : 'Otra ventana · VIDEO corto'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
