#!/usr/bin/env tsx
/**
 * CLI espejo Cloudinary ↔ Supabase.
 *
 *   pnpm sync:mirror:discover
 *   pnpm sync:mirror
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { runBidirectionalMirror } from '../lib/mirror/bidirectional';

loadEnv({ path: '.env.local' });

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  console.log(`\n=== Espejo Cloudinary ↔ Supabase (${apply ? 'APPLY' : 'DISCOVER'}) ===\n`);
  const result = await runBidirectionalMirror(db, {
    mode: apply ? 'apply' : 'discover',
    triggeredBy: 'cli',
    maxCloud: 500,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
