import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  MIRROR_CANONICAL_BUTTERFLIES_PATH,
  MIRROR_CANONICAL_REGION_PATH,
  MIRROR_CURRENT_CATEGORY_NODE_MEDIA,
  MIRROR_NEOTROPICAL_CATEGORY_NODE_MEDIA,
  MIRROR_NODE_MEDIA_EXAMPLES,
  NODE_MEDIA_SLOT,
} from '@/lib/mirror/contract';
import {
  CURRENT_CATEGORY_FOCUS,
  EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES,
  EXPECTED_NEOTROPICAL_MOTHS_FAMILIES,
  EXPECTED_RARE_SUBFOLDERS,
  RARE_GYNAN_CATEGORY_SEGMENT,
  RARE_GYNAN_REGION_ROOTS,
  rareGynanFamiliesForRegion,
} from '@/scripts/sync-cloudinary/roots';

/** Familias Cloudinary bajo Butterflies (incl. Hesperidae / Heliconidae). */
const EXPECTED_BUTTERFLY_FAMILIES = EXPECTED_NEOTROPICAL_BUTTERFLY_FAMILIES;

async function safeCount(
  db: ReturnType<typeof getSupabaseAdmin>,
  table: string,
): Promise<number | null> {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) return null;
  return count ?? 0;
}

async function loadFamilyNames(
  db: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ names: string[]; source: 'families' | 'specimens' | 'none' }> {
  const fam = await db.from('families').select('family_name').limit(500);
  if (!fam.error && fam.data) {
    return {
      names: fam.data
        .map((r) => String((r as { family_name?: string }).family_name ?? '').trim())
        .filter(Boolean),
      source: 'families',
    };
  }
  const sp = await db.from('specimens').select('familia').not('familia', 'is', null).limit(2000);
  if (!sp.error && sp.data) {
    const set = new Set(
      sp.data
        .map((r) => String((r as { familia?: string }).familia ?? '').trim())
        .filter(Boolean),
    );
    return { names: [...set], source: 'specimens' };
  }
  return { names: [], source: 'none' };
}

/**
 * Visión estática: path Cloudinary esperado vs filas taxonomy/families en DB.
 * No inventa carpetas; solo muestra lo que falta para alinear.
 */
export default async function ClassificationVisionPanel() {
  let db: ReturnType<typeof getSupabaseAdmin>;
  try {
    db = getSupabaseAdmin();
  } catch {
    return (
      <section className="rounded-xl border border-amber-800/60 bg-amber-950/25 p-4 text-sm text-amber-100">
        <p className="font-medium">Clasificación (DB) no disponible</p>
        <p className="mt-1 text-amber-200/90">
          Falta <code className="text-amber-50">SUPABASE_SERVICE_ROLE_KEY</code> en Vercel
          Production. Puedes subir <strong>_card / _video</strong> en el panel de Node Media
          abajo (solo Cloudinary). Para fichas/especímenes/campañas hace falta esa variable +
          Redeploy.
        </p>
      </section>
    );
  }

  const [regions, familiesCount, genera, species, subspecies, taxonomy, specimens, media, famPack] =
    await Promise.all([
      safeCount(db, 'global_regions'),
      safeCount(db, 'families'),
      safeCount(db, 'genera'),
      safeCount(db, 'species'),
      safeCount(db, 'subspecies'),
      safeCount(db, 'taxonomy'),
      safeCount(db, 'specimens'),
      safeCount(db, 'specimen_media'),
      loadFamilyNames(db),
    ]);

  const dbFamilySet = new Set(famPack.names.map((n) => n.toLowerCase()));
  const present = EXPECTED_BUTTERFLY_FAMILIES.filter((f) => dbFamilySet.has(f.toLowerCase()));
  const missing = EXPECTED_BUTTERFLY_FAMILIES.filter((f) => !dbFamilySet.has(f.toLowerCase()));

  const chain: { table: string; count: number | null; role: string }[] = [
    { table: 'global_regions', count: regions, role: 'REGION … Neotropical' },
    { table: 'families', count: familiesCount, role: 'Satyridae, Nymphalidae, …' },
    { table: 'subfamilies', count: await safeCount(db, 'subfamilies'), role: 'opcional (-inae)' },
    { table: 'genera', count: genera, role: 'Morpho, Caligo, …' },
    { table: 'species', count: species, role: 'helenor, peleides, …' },
    { table: 'subspecies', count: subspecies, role: 'opcional' },
    { table: 'taxonomy', count: taxonomy, role: 'fila maestra (order_name, …)' },
    { table: 'specimens', count: specimens, role: '+ columnas planas rubro/familia/…' },
    { table: 'specimen_media', count: media, role: 'public_id = path Cloudinary real' },
  ];

  return (
    <section className="rounded-lg border border-sky-900/60 bg-zinc-950/80 p-5 font-mono text-sky-300">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white">Clasificación</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-sky-800">
        Cloudinary manda la carpeta. Nunca crear carpetas fuera del árbol entomológico.
        Supabase refleja la cadena taxonómica — no recrea CATALOGUE/_PENDING.{' '}
        <code className="text-sky-600">orders</code> = orden biológico (Lepidoptera), no
        e‑commerce.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="border border-zinc-800 bg-zinc-900/50 p-3 text-[11px]">
          <p className="mb-2 font-bold uppercase text-zinc-400">Path Cloudinary esperado</p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-400">
            {`RUBROS
  ├─ ESPECIMENS SECOS… (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  │    ├─ REGION Africa (Afrotropical)              · Rare FOCO ×3
  │    ├─ REGION Australasian Y Oriental           · Rare FOCO ×3
  │    ├─ REGION Central South America Neotropical · Rare FOCO ×3
  │    │    ├─ Rare -Gynan-Aberrations ← FOCO (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  │    │    │    ├─ Butterflies (Lepidoptera)
  │    │    │    ├─ Moths (Lepidoptera)
  │    │    │    └─ Beetles (Coleoptera) Y Arthropoda Insects
  │    │    ├─ Insects(arthropoda) (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  │    │    │    └─ Arañas…Escorpión (10 ×5 REGIONs)
  │    │    ├─ Beetles(Coleoptera) Insects (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  │    │    │    └─ 12 / 13 / 13 / 13 / 13 familias (Africa…Nearctic)
  │    │    ├─ Moths(Lepidoptera) Nocturne (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  │    │    │    └─ Arctiidae…Limacodidae (${EXPECTED_NEOTROPICAL_MOTHS_FAMILIES.length})
  │    │    └─ Butterflies(lepidoptera) Diurne (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  │    │         └─ Brassolidae…Satyridae (17)
  │    ├─ REGION Europe (Holarctic)                · Rare FOCO ×3
  │    └─ REGION North America (Nearctic)          · Rare FOCO ×3
  ├─ ESQUELETOS DE ZOOLOGIA… (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)
  └─ PLANTAS SECAS NO-CITES (+ ${NODE_MEDIA_SLOT.card}/ ${NODE_MEDIA_SLOT.video}/)`}
          </pre>
          <p className="mt-2 text-[10px] text-zinc-500">
            Media de nodo (no taxones):{' '}
            <code className="text-zinc-400">{NODE_MEDIA_SLOT.card}</code> +{' '}
            <code className="text-zinc-400">{NODE_MEDIA_SLOT.video}</code>
            {' '}en cada categoría (5) y cada familia.
          </p>
          <p className="mt-2 text-[10px] font-medium text-cyan-400/90">
            Foco · {CURRENT_CATEGORY_FOCUS.displayLabel} ×{' '}
            {RARE_GYNAN_REGION_ROOTS.length} REGIONs ·{' '}
            {EXPECTED_RARE_SUBFOLDERS.length} hijos
          </p>
          <p className="mt-0.5 truncate text-[10px] text-amber-200/80" title={MIRROR_CURRENT_CATEGORY_NODE_MEDIA.cardFolder}>
            {MIRROR_CURRENT_CATEGORY_NODE_MEDIA.cardFolder} + _video
          </p>
          <p className="mt-0.5 text-[10px] text-cyan-300/80">
            Rare: {EXPECTED_RARE_SUBFOLDERS.length} subcarpetas ×{' '}
            {RARE_GYNAN_REGION_ROOTS.length} REGIONs · carpeta{' '}
            <code className="text-cyan-200/80">{RARE_GYNAN_CATEGORY_SEGMENT}</code>
            {' '}(+ _card/_video c/u)
          </p>
          <ul className="mt-1 space-y-0.5 text-[9px] text-cyan-200/70">
            {RARE_GYNAN_REGION_ROOTS.map((b) => {
              const n = rareGynanFamiliesForRegion(b.id).length;
              return (
                <li key={b.id} className="truncate" title={b.nodePath}>
                  {b.regionFolder} · {n} nodos
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10px] font-medium text-amber-500/90">
            _card/_video · 5 categorías Neotropical
          </p>
          <ul className="mt-1 space-y-1 text-[10px] text-amber-300/80">
            {MIRROR_NEOTROPICAL_CATEGORY_NODE_MEDIA.map((c) => (
              <li
                key={c.id}
                className={`truncate ${c.id === CURRENT_CATEGORY_FOCUS.id ? 'text-cyan-200' : ''}`}
                title={`${c.cardFolder} + ${c.videoFolder}`}
              >
                {c.segment}
                {c.id === CURRENT_CATEGORY_FOCUS.id ? ' · FOCO' : ''}:{' '}
                <span className="text-amber-200/70">{c.cardFolder}</span>
                {' + '}
                <span className="text-amber-200/70">{c.videoFolder}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 truncate text-[10px] text-zinc-600" title={MIRROR_NODE_MEDIA_EXAMPLES.brassolidaeVideo}>
            ej. familia Brassolidae video:{' '}
            <span className="text-zinc-400">{MIRROR_NODE_MEDIA_EXAMPLES.brassolidaeVideo}/…</span>
          </p>
          <p className="mt-2 truncate text-[10px] text-zinc-600" title={MIRROR_CANONICAL_REGION_PATH}>
            sync root: <span className="text-zinc-400">{MIRROR_CANONICAL_REGION_PATH}</span>
          </p>
          <p
            className="mt-1 truncate text-[10px] text-zinc-600"
            title={MIRROR_CANONICAL_BUTTERFLIES_PATH}
          >
            butterflies:{' '}
            <span className="text-zinc-400">{MIRROR_CANONICAL_BUTTERFLIES_PATH}</span>
          </p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/50 p-3 text-[11px]">
          <p className="mb-2 font-bold uppercase text-zinc-400">Cadena Supabase (conteos)</p>
          <ul className="space-y-1">
            {chain.map((c) => (
              <li key={c.table} className="flex justify-between gap-2 border-b border-zinc-900 py-0.5">
                <span>
                  <span className="text-sky-200">{c.table}</span>
                  <span className="ml-2 text-zinc-600">{c.role}</span>
                </span>
                <span className="tabular-nums text-white">
                  {c.count === null ? '—' : c.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 border border-zinc-800 bg-zinc-900/40 p-3 text-[11px]">
        <p className="mb-2 font-bold uppercase text-zinc-400">
          Familias Butterflies Diurne · fuente DB:{' '}
          <span className="text-zinc-300">{famPack.source}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXPECTED_BUTTERFLY_FAMILIES.map((f) => {
            const ok = present.includes(f);
            return (
              <span
                key={f}
                className={`border px-2 py-0.5 text-[10px] ${
                  ok
                    ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                    : 'border-amber-900/80 bg-amber-950/20 text-amber-300'
                }`}
              >
                {ok ? '✓' : '·'} {f}
              </span>
            );
          })}
        </div>
        {missing.length > 0 ? (
          <p className="mt-3 text-[10px] text-amber-500">
            Faltan en DB ({missing.length}): {missing.join(', ')}. Tras{' '}
            <code className="text-amber-300">pnpm sync:cloudinary:discover -- --root=butterflies</code>{' '}
            y apply, deberían aparecer en <code className="text-amber-300">families</code> /
            <code className="text-amber-300"> specimens.familia</code>.
          </p>
        ) : (
          <p className="mt-3 text-[10px] text-emerald-600">
            Las 12 familias de la captura ya tienen fila en DB.
          </p>
        )}
        {famPack.names.length > 0 && (
          <p className="mt-2 text-[10px] text-zinc-600">
            En DB ahora: {famPack.names.slice(0, 24).join(', ')}
            {famPack.names.length > 24 ? ` … (+${famPack.names.length - 24})` : ''}
          </p>
        )}
      </div>

      <p className="mt-3 text-[10px] text-zinc-600">
        Foto = fila en <code className="text-zinc-400">specimen_media</code> con{' '}
        <code className="text-zinc-400">public_id</code> = public_id real de Cloudinary (no inventado).
        Columns planas en <code className="text-zinc-400">specimens</code> (rubro, familia, genero,
        especie, cloudinary_public_id) son denormalización para admin/UI.
      </p>
    </section>
  );
}
