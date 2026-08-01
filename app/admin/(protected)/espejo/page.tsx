import MirrorVisionPanel from '@/components/admin/MirrorVisionPanel';
import ClassificationVisionPanel from '@/components/admin/ClassificationVisionPanel';
import NodeMediaUploadPanel from '@/components/admin/NodeMediaUploadPanel';
import CatalogueFamilyEditor from '@/components/admin/CatalogueFamilyEditor';
import AdminStructurePanel from '@/components/admin/AdminStructurePanel';
import Link from 'next/link';
import {
  AFRICA_BUTTERFLIES_ROOT,
  AUSTRALASIAN_BUTTERFLIES_ROOT,
  CURRENT_CATEGORY_FOCUS,
  EUROPE_BUTTERFLIES_ROOT,
  EXPECTED_AFRICA_BUTTERFLY_FAMILIES,
  EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES,
  EXPECTED_EUROPE_BUTTERFLY_FAMILIES,
  EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_MOTHS_FAMILIES,
  EXPECTED_RARE_SUBFOLDERS,
  EXPECTED_SHARED_INSECTS_FAMILIES,
  INSECTS_DISPLAY_LABEL,
  MOTHS_DISPLAY_LABEL,
  NEARCTIC_BUTTERFLIES_ROOT,
  NEOTROPICAL_INSECTS_ROOT,
  NEOTROPICAL_MOTHS_ROOT,
  RARE_GYNAN_DISPLAY_LABEL,
  RARE_GYNAN_REGION_ROOTS,
  nodeCardFolder,
  nodeVideoFolder,
  rareGynanFamiliesForRegion,
} from '@/scripts/sync-cloudinary/roots';
import {
  MIRROR_CANONICAL_BUTTERFLIES_PATH,
  MIRROR_INSECTS_CATEGORY_NODE_MEDIA,
  MIRROR_MOTHS_CATEGORY_NODE_MEDIA,
  MIRROR_NEOTROPICAL_CATEGORY_NODE_MEDIA,
  MIRROR_NODE_MEDIA_EXAMPLES,
  MIRROR_RARE_GYNAN_CATEGORY_NODE_MEDIA,
  MIRROR_REGION_NODE_MEDIA,
  MIRROR_RUBRO_NODE_MEDIA,
  type NodeMediaUploadTarget,
} from '@/lib/mirror/contract';
import { listNodeMediaUploadTargetsResolved } from '@/lib/mirror/targets-resolved';

export const metadata = {
  title: 'Espejo C↔S · Admin',
};

/** Admin + DB/Cloudinary: no prerender en build. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function safeUploadTargets(): Promise<NodeMediaUploadTarget[]> {
  try {
    return await listNodeMediaUploadTargetsResolved();
  } catch {
    return [];
  }
}

export default async function EspejoAdminPage() {
  const uploadTargets = await safeUploadTargets();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Espejo Cloudinary ↔ Supabase</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            Arriba: <strong className="text-emerald-300">cambiar / renombrar / crear familias</strong>.
            Abajo: CARD/VIDEO dinámico y regenerativo (cero hardcode de dispositivo) · Wi‑Fi o
            datos · galería / cámara / escáner → GRABAR. Taxonomía fina en{' '}
            <Link href="/admin/especimenes" className="text-violet-300 underline">
              Taxonomía y Datos
            </Link>
            .
          </p>
          <p className="mt-2 text-xs text-amber-200/90">
            → Scroll al panel verde «Clasificación · regenerativa» o abrí directo:{' '}
            <a href="#clasificacion-familias" className="underline">
              #clasificacion-familias
            </a>
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-emerald-400 underline-offset-2 hover:underline"
        >
          ← Panel
        </Link>
      </div>

      <AdminStructurePanel />

      <CatalogueFamilyEditor />

      {uploadTargets.length === 0 ? (
        <p className="rounded-lg border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-100">
          No se pudieron cargar los destinos de upload. Reintenta o revisa el contrato mirror/roots.
        </p>
      ) : (
        <NodeMediaUploadPanel targets={uploadTargets} />
      )}

      <ClassificationVisionPanel />

      <div id="espejo-discover" className="scroll-mt-6">
        <MirrorVisionPanel autoDiscover />
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-400">
        <p className="font-medium text-neutral-200">Checklist card / video por nivel</p>
        <p className="mt-1 text-xs text-neutral-500">
          En cada nodo (rubro, REGION, categoría, familia) añade subcarpetas{' '}
          <code className="text-neutral-300">_card</code> y{' '}
          <code className="text-neutral-300">_video</code> <strong>solo bajo ese path</strong>.
          Nunca en raíz ni fuera de RUBROS/…. El sync ignora esas carpetas como taxones. No crear
          carpetas automáticamente fuera de sitio.
        </p>

        <p className="mt-3 text-xs font-medium text-amber-300/90">
          Falta a nivel rubro (hub /[lang]/catalogue — 3 cards)
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {MIRROR_RUBRO_NODE_MEDIA.map((r) => (
            <li key={r.id}>
              <span className="text-neutral-300">{r.id}</span>
              <br />
              <code className="text-amber-200/80">{r.cardFolder}</code>
              {' + '}
              <code className="text-amber-200/80">{r.videoFolder}</code>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs font-medium text-amber-300/90">
          Falta a nivel REGION (rubro secos · 5 regiones, cada una _card + _video)
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {MIRROR_REGION_NODE_MEDIA.map((r) => (
            <li key={r.id}>
              <span className="text-neutral-300">
                {r.folder}
                {r.id === 'neotropical' ? ' · PRINCIPAL · 1º' : ''}
              </span>
              <br />
              <code className="text-amber-200/80">{r.cardFolder}</code>
              {' + '}
              <code className="text-amber-200/80">{r.videoFolder}</code>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs font-medium text-amber-300/90">
          Familias Africa (5) · cada una _card + _video
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {EXPECTED_AFRICA_BUTTERFLY_FAMILIES.map((fam) => {
            const path = `${AFRICA_BUTTERFLIES_ROOT}/${fam}`;
            return (
              <li key={fam}>
                <span className="text-neutral-300">{fam}</span>
                <br />
                <code className="text-amber-200/80">{nodeCardFolder(path)}</code>
                {' + '}
                <code className="text-amber-200/80">{nodeVideoFolder(path)}</code>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-medium text-amber-300/90">
          Familias Australasian (9) · cada una _card + _video
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {EXPECTED_AUSTRALASIAN_BUTTERFLY_FAMILIES.map((fam) => {
            const path = `${AUSTRALASIAN_BUTTERFLIES_ROOT}/${fam}`;
            return (
              <li key={fam}>
                <span className="text-neutral-300">{fam}</span>
                <br />
                <code className="text-amber-200/80">{nodeCardFolder(path)}</code>
                {' + '}
                <code className="text-amber-200/80">{nodeVideoFolder(path)}</code>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-medium text-emerald-300/90">
          REGION 1 · Familias Neotropical (17 · cada una _card + _video) · PRINCIPAL
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES.map((fam) => {
            const path = `${MIRROR_CANONICAL_BUTTERFLIES_PATH}/${fam}`;
            return (
              <li key={fam}>
                <span className="text-neutral-300">{fam}</span>
                <br />
                <code className="text-amber-200/80">{nodeCardFolder(path)}</code>
                {' + '}
                <code className="text-amber-200/80">{nodeVideoFolder(path)}</code>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-medium text-violet-300/90">
          Familias Europe (5) · cada una _card + _video
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {EXPECTED_EUROPE_BUTTERFLY_FAMILIES.map((fam) => {
            const path = `${EUROPE_BUTTERFLIES_ROOT}/${fam}`;
            return (
              <li key={fam}>
                <span className="text-neutral-300">{fam}</span>
                <br />
                <code className="text-amber-200/80">{nodeCardFolder(path)}</code>
                {' + '}
                <code className="text-amber-200/80">{nodeVideoFolder(path)}</code>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-medium text-rose-300/90">
          Familias Nearctic (5) · cada una _card + _video
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {EXPECTED_NEARCTIC_BUTTERFLY_FAMILIES.map((fam) => {
            const path = `${NEARCTIC_BUTTERFLIES_ROOT}/${fam}`;
            return (
              <li key={fam}>
                <span className="text-neutral-300">{fam}</span>
                <br />
                <code className="text-amber-200/80">{nodeCardFolder(path)}</code>
                {' + '}
                <code className="text-amber-200/80">{nodeVideoFolder(path)}</code>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-medium text-cyan-300/90">
          Foco · {RARE_GYNAN_DISPLAY_LABEL} · × 5 REGIONs ·{' '}
          {EXPECTED_RARE_SUBFOLDERS.length} hijos · categoría + c/u _card/_video
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {MIRROR_RARE_GYNAN_CATEGORY_NODE_MEDIA.map((c) => {
            const fams = rareGynanFamiliesForRegion(c.regionId);
            return (
              <li key={c.regionId}>
                <span className="text-cyan-200">
                  {c.regionFolder}
                  {c.regionId === CURRENT_CATEGORY_FOCUS.primaryRegionId
                    ? ' · primario'
                    : ''}
                  {' · '}
                  {fams.length} nodos
                </span>
                <br />
                <code className="text-neutral-400">{c.nodePath}</code>
                <br />
                <code className="text-amber-200/80">{c.cardFolder}</code>
                {' + '}
                <code className="text-amber-200/80">{c.videoFolder}</code>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-neutral-500">
                  {fams.map((fam) => {
                    const path = `${c.nodePath}/${fam}`;
                    return (
                      <li key={fam}>
                        <span className="text-neutral-300">{fam}</span>
                        {': '}
                        <code className="text-amber-200/70">
                          {nodeCardFolder(path)}
                        </code>
                        {' + _video'}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-medium text-sky-300/80">
          {INSECTS_DISPLAY_LABEL} · {EXPECTED_SHARED_INSECTS_FAMILIES.length}{' '}
          taxones ×5 (instalado · no foco)
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[10px] text-neutral-500">
          {EXPECTED_SHARED_INSECTS_FAMILIES.map((fam) => (
            <li key={fam}>
              {fam}: {nodeCardFolder(`${NEOTROPICAL_INSECTS_ROOT}/${fam}`)} +
              _video
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs font-medium text-violet-300/80">
          {MOTHS_DISPLAY_LABEL} · Neo · {EXPECTED_NEOTROPICAL_MOTHS_FAMILIES.length}{' '}
          familias (instalado · no foco)
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[10px] text-neutral-500">
          {EXPECTED_NEOTROPICAL_MOTHS_FAMILIES.map((fam) => (
            <li key={fam}>
              {fam}: {nodeCardFolder(`${NEOTROPICAL_MOTHS_ROOT}/${fam}`)} + _video
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[10px] text-neutral-600">
          Rare paths ×5:{' '}
          {RARE_GYNAN_REGION_ROOTS.map((r) => r.id).join(', ')} · Insects:{' '}
          {MIRROR_INSECTS_CATEGORY_NODE_MEDIA.map((c) => c.regionId).join(', ')}{' '}
          · Moths:{' '}
          {MIRROR_MOTHS_CATEGORY_NODE_MEDIA.map((c) => c.regionId).join(', ')}
        </p>

        <p className="mt-3 text-xs font-medium text-amber-300/90">
          Categorías Neotropical (5 cards — checklist corto)
        </p>
        <ul className="mt-1 list-disc space-y-1.5 pl-5 text-xs">
          {MIRROR_NEOTROPICAL_CATEGORY_NODE_MEDIA.map((c) => (
            <li key={c.id}>
              <span
                className={
                  c.id === CURRENT_CATEGORY_FOCUS.id
                    ? 'text-cyan-200'
                    : 'text-neutral-300'
                }
              >
                {c.segment}
                {c.id === CURRENT_CATEGORY_FOCUS.id ? ' · FOCO' : ''}
              </span>
              <br />
              <code className="text-amber-200/80">{c.cardFolder}</code>
              {' + '}
              <code className="text-amber-200/80">{c.videoFolder}</code>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs font-medium text-neutral-300">
          También familia Neotropical (ej. Brassolidae)
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
          <li>
            Brassolidae:{' '}
            <code className="text-neutral-300">
              {MIRROR_NODE_MEDIA_EXAMPLES.brassolidaeCard}
            </code>{' '}
            +{' '}
            <code className="text-neutral-300">
              {MIRROR_NODE_MEDIA_EXAMPLES.brassolidaeVideo}
            </code>
          </li>
        </ul>
        <p className="mt-3 font-medium text-neutral-200">Si el schema aparece incompleto</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Abre Supabase → SQL Editor y ejecuta{' '}
            <code className="text-neutral-300">supabase/sql/espejo_universal_industrial.sql</code>
          </li>
          <li>
            Luego{' '}
            <code className="text-neutral-300">supabase/sql/delta_align_admin_stubs.sql</code>
          </li>
          <li>Vuelve aquí → Discover → Apply espejo</li>
        </ol>
        <p className="mt-3 text-xs text-neutral-500">
          Clasificación taxonómica (familias bajo Butterflies):{' '}
          <code className="text-neutral-400">pnpm sync:cloudinary:discover -- --root=butterflies</code>
          {' '}→ revisar →{' '}
          <code className="text-neutral-400">pnpm sync:cloudinary -- --root=butterflies --limit=20</code>
        </p>
      </div>
    </div>
  );
}
