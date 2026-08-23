import fs from 'node:fs';
import { Client } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/^DATABASE_URL=(.*)$/m) || env.match(/^NEON_DATABASE_URL=(.*)$/m);
if (!match || !match[1].trim()) throw new Error('No hay conexión Neon configurada');
const connectionString = match[1].trim().replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
const client = new Client({ connectionString });
const definitions = {
  code: 'text', scientific_name: 'text', common_name: 'text', specimen_kind: 'text',
  order_name: 'text', family: 'text', subfamily: 'text', genus: 'text', species: 'text',
  subspecies: 'text', category_id: 'uuid', region_id: 'uuid', category: 'text', region: 'text',
  country: 'text', locality: 'text', gps: 'text', sex: 'text', grade: 'text',
  dominant_color: 'text', dimensions: 'text', weight_grams: 'numeric', stock: 'integer',
  retail_price: 'numeric', wholesale_price: 'numeric', wholesale_min_qty: 'integer',
  currency: 'text', status: 'text', description: 'text', attributes: 'jsonb', metadata: 'jsonb',
  updated_at: 'timestamptz',
};
await client.connect();
try {
  const before = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'especimenes' ORDER BY ordinal_position");
  console.log(JSON.stringify({ before: before.rows }));
  const existing = new Set(before.rows.map((row) => row.column_name));
  await client.query('BEGIN');
  for (const [name, type] of Object.entries(definitions)) {
    if (!existing.has(name)) await client.query(`ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS "${name}" ${type}`);
  }
  await client.query('COMMIT');
  const after = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'especimenes' ORDER BY ordinal_position");
  console.log(JSON.stringify({ after: after.rows, added: Object.keys(definitions).filter((name) => !existing.has(name)) }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
