// ============================================================================
// Sync masivo Cloudinary → Supabase para families/subfamilies/genera/species/
// subspecies/global_regions/specimens/specimen_media.
//
// Uso:
//   pnpm sync:cloudinary:discover           # sólo lee Cloudinary y reporta
//                                            # cómo clasificaría todo — no
//                                            # escribe nada en Supabase.
//                                            # Por defecto arranca en
//                                            # DEFAULT_ROOT (ver abajo), no
//                                            # en la raíz de la cuenta.
//   pnpm sync:cloudinary:discover -- --root="RUBROS/otra-carpeta"
//   pnpm sync:cloudinary:discover -- --max-depth=3   # explorar poco a poco
//                                                      # (cuida la cuota de
//                                                      # la Admin API).
//   pnpm sync:cloudinary -- --apply         # ejecuta los upserts reales.
//   pnpm sync:cloudinary -- --apply --limit=20   # sólo los primeros 20
//                                                  # especímenes (prueba).
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
//
// SIEMPRE corre primero en modo discover y revisa `unclassified` antes de
// pasar a --apply: ese modo no escribe nada y te deja ver exactamente qué
// región/familia/subfamilia/género/especie va a resolver por cada carpeta.
//
// Cadena genealógica OBLIGATORIA (ver classifier.ts::missingRequiredLevels y
// supabase-upsert.ts::resolveTaxonomyCascade): región → familia → subfamilia
// → género → especie son requisito para que una carpeta cuente como
// espécimen sincronizable. Si falta cualquiera de esos niveles, la carpeta
// cae en `unclassified` con el detalle de qué falta — nunca se crea un nivel
// huérfano (p.ej. un género sin subfamilia). Subespecie es el único nivel
// opcional de la cadena.
// ============================================================================

import { config as loadEnv } from 'dotenv';
import { buildFolderTree, configureCloudinary } from './cloudinary-tree';
import { classifyTree } from './classifier';
import { createAdminClient, resetUpsertCache, syncSpecimenGroup } from './supabase-upsert';
import type { SyncStats } from './types';

// El proyecto sólo usa `.env.local` (no hay `.env`): `dotenv/config` con su
// default no cargaría nada, así que se apunta explícito al archivo real.
loadEnv({ path: '.env.local' });

// Ruta contenedora real en Cloudinary (verificada con la Admin API el
// 2026-07-28, no adivinada — respeta mayúsculas y dobles espacios exactos
// tal como existen hoy en la cuenta):
//   RUBROS
//     └─ ESPECIMENS SECOS BIOLOGICOS Y INSECTOS COLEOPTEROS  Y ARHHROPODS
//          └─ REGION Central  South America Neotropical
//               └─ SPECIMENES SECOS Y BIOLOGICOS NO CITES   ← DEFAULT_ROOT
const DEFAULT_ROOT =
  'RUBROS/ESPECIMENS SECOS BIOLOGICOS Y INSECTOS COLEOPTEROS  Y ARHHROPODS/REGION Central  South America Neotropical/SPECIMENES SECOS Y BIOLOGICOS NO CITES';

interface CliArgs {
  apply: boolean;
  root: string;
  limit: number | null;
  maxDepth: number;
}

function parseArgs(argv: string[]): CliArgs {
  const apply = argv.includes('--apply');
  const rootArg = argv.find((a) => a.startsWith('--root='));
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const maxDepthArg = argv.find((a) => a.startsWith('--max-depth='));
  return {
    apply,
    root: rootArg ? rootArg.slice('--root='.length) : DEFAULT_ROOT,
    limit: limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : null,
    maxDepth: maxDepthArg ? Number.parseInt(maxDepthArg.slice('--max-depth='.length), 10) : 12,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log(`\n=== Sync Cloudinary → Supabase (${args.apply ? 'APPLY — escribirá en la base de datos' : 'DISCOVER — sólo lectura'}) ===`);
  console.log(`Raíz: ${args.root}`);
  console.log(`Profundidad máxima: ${args.maxDepth}`);
  if (args.limit) console.log(`Límite de especímenes: ${args.limit}`);

  configureCloudinary();
  console.log('\nLeyendo árbol de carpetas de Cloudinary...');
  const tree = await buildFolderTree(args.root, args.maxDepth);
  const report = classifyTree(tree);

  console.log(`\nRegiones detectadas (${report.regionsFound.size}): ${[...report.regionsFound].join(', ') || '(ninguna)'}`);
  console.log(`Carpetas clasificadas como especie/subespecie: ${report.leaves.length}`);
  console.log(`Carpetas NO clasificadas (revisar manualmente): ${report.unclassified.length}`);

  if (report.unclassified.length > 0) {
    console.log('\n--- Carpetas sin clasificar ---');
    for (const u of report.unclassified) {
      console.log(`  ⚠ ${u.folderPath}  (${u.resourceCount} archivos) — ${u.reason}`);
    }
  }

  console.log('\n--- Especímenes detectados ---');
  let totalGroups = 0;
  let totalMedia = 0;
  for (const leaf of report.leaves) {
    const name = leaf.context.subspeciesName
      ? `${leaf.context.genusName} ${leaf.context.speciesName} ${leaf.context.subspeciesName}`
      : `${leaf.context.genusName} ${leaf.context.speciesName}`;
    for (const group of leaf.specimenGroups) {
      totalGroups += 1;
      totalMedia += group.resources.length;
      if (!args.apply) {
        console.log(
          `  · ${name}  [región=${leaf.context.regionName}, familia=${leaf.context.familyName}, subfamilia=${leaf.context.subfamilyName ?? '(sin subfamilia)'}]  → grupo "${group.groupKey}" (${group.resources.length} archivos)`,
        );
      }
    }
  }
  console.log(`\nTotal especímenes a sincronizar: ${totalGroups}  |  Total archivos multimedia: ${totalMedia}`);

  if (!args.apply) {
    console.log('\nModo discover: no se escribió nada en Supabase. Corre con --apply cuando confirmes que la clasificación de arriba es correcta.');
    return;
  }

  console.log('\nAplicando upserts en Supabase...');
  const supabase = createAdminClient();
  resetUpsertCache();

  const stats: SyncStats = {
    regions: report.regionsFound.size,
    families: 0,
    subfamilies: 0,
    genera: 0,
    species: 0,
    subspecies: 0,
    taxonomyRows: 0,
    specimens: 0,
    media: 0,
    skippedFolders: report.unclassified.length,
    errors: [],
  };

  let processed = 0;
  outer: for (const leaf of report.leaves) {
    for (const group of leaf.specimenGroups) {
      if (args.limit !== null && processed >= args.limit) break outer;
      try {
        const result = await syncSpecimenGroup(supabase, leaf.context, group);
        stats.specimens += 1;
        stats.taxonomyRows += 1;
        stats.media += result.mediaCount;
        processed += 1;
        console.log(`  ✔ ${leaf.folderPath} → specimen ${result.specimenId} (${result.mediaCount} media)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stats.errors.push({ context: `${leaf.folderPath} / ${group.groupKey}`, message });
        console.error(`  ✘ ${leaf.folderPath} / ${group.groupKey}: ${message}`);
      }
    }
  }

  console.log('\n=== Resumen ===');
  console.log(JSON.stringify(stats, null, 2));
  if (stats.errors.length > 0) {
    console.log(`\n${stats.errors.length} error(es) durante el sync. Revisa el detalle arriba; el resto de filas sí quedó sincronizado (upsert es idempotente, puedes volver a correr el script sin duplicar nada).`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('\nFallo fatal:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
