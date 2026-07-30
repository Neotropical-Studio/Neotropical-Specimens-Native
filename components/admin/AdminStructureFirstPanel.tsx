import Link from 'next/link';
import { FolderTree, ImagePlus, MapPin, Video } from 'lucide-react';
import {
  DRIED_SPECIMEN_REGION_FOLDERS,
  RUBROS_CHILD_FOLDERS,
  nodeCardFolder,
  nodeVideoFolder,
} from '@/scripts/sync-cloudinary/roots';

const RUBRO_LABELS: Record<(typeof RUBROS_CHILD_FOLDERS)[number]['id'], string> = {
  'dried-specimens': 'Especímenes secos biológicos',
  'zoology-skeletons': 'Esqueletos de zoología',
  'dry-plants-no-cites': 'Plantas secas NO-CITES',
};

/**
 * Lo PRINCIPAL del admin: primero 3 rubros, luego regiones del rubro secos.
 * Card + video de ingreso van en cada uno (_card / _video).
 */
export default function AdminStructureFirstPanel() {
  return (
    <section className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-emerald-200">
            <FolderTree size={18} />
            1º · Rubros y regiones (estructura principal)
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-neutral-400">
            Esto va primero. Cada rubro y cada región necesita su{' '}
            <code className="text-neutral-300">_card</code> +{' '}
            <code className="text-neutral-300">_video</code> de ingreso. Subilos en Espejo → Subir
            Card + Video.
          </p>
        </div>
        <Link
          href="/admin/espejo"
          className="rounded border border-sky-700 bg-sky-950 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-900"
        >
          Subir card / video →
        </Link>
      </div>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-500/90">
        Los 3 rubros
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {RUBROS_CHILD_FOLDERS.map((r, i) => {
          const nodePath = `RUBROS/${r.folder}`;
          return (
            <div
              key={r.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4"
            >
              <p className="text-[10px] font-bold uppercase text-emerald-600">Rubro {i + 1}</p>
              <p className="mt-1 text-sm font-medium text-white">{RUBRO_LABELS[r.id]}</p>
              <p className="mt-1 break-all font-mono text-[10px] text-neutral-500">{r.folder}</p>
              <ul className="mt-3 space-y-1.5 text-[10px] text-neutral-400">
                <li className="flex items-start gap-1.5">
                  <ImagePlus size={12} className="mt-0.5 shrink-0 text-sky-400" />
                  <code className="break-all text-amber-200/80">{nodeCardFolder(nodePath)}</code>
                </li>
                <li className="flex items-start gap-1.5">
                  <Video size={12} className="mt-0.5 shrink-0 text-sky-400" />
                  <code className="break-all text-amber-200/80">{nodeVideoFolder(nodePath)}</code>
                </li>
              </ul>
              {r.id === 'dried-specimens' && (
                <p className="mt-3 text-[10px] text-emerald-500/90">
                  Contiene las regiones ↓
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mb-2 mt-6 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-500/90">
        <MapPin size={12} />
        Regiones · dentro de Especímenes secos
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DRIED_SPECIMEN_REGION_FOLDERS.map((reg) => {
          const nodePath = `RUBROS/${RUBROS_CHILD_FOLDERS[0].folder}/${reg.folder}`;
          const isNeo = reg.id === 'neotropical';
          return (
            <div
              key={reg.id}
              className={`rounded-lg border p-3 ${
                isNeo
                  ? 'border-emerald-700/60 bg-emerald-950/30'
                  : 'border-neutral-800 bg-neutral-950/50'
              }`}
            >
              <p className="text-xs font-medium text-white">
                {reg.folder}
                {isNeo ? (
                  <span className="ml-2 text-[10px] font-normal text-emerald-400">
                    (foco catálogo)
                  </span>
                ) : null}
              </p>
              <ul className="mt-2 space-y-1 text-[10px] text-neutral-500">
                <li className="break-all">
                  card:{' '}
                  <code className="text-amber-200/70">{nodeCardFolder(nodePath)}</code>
                </li>
                <li className="break-all">
                  video:{' '}
                  <code className="text-amber-200/70">{nodeVideoFolder(nodePath)}</code>
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-neutral-500">
        Después de rubros + regiones → categorías (5) → familias → especies. Eso va en Espejo /
        Taxonomía, no antes.
      </p>
    </section>
  );
}
