import fs from 'node:fs';
import { Client } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/^DATABASE_URL=(.*)$/m) || env.match(/^NEON_DATABASE_URL=(.*)$/m);
if (!match || !match[1].trim()) throw new Error('No hay conexión Neon configurada');
const connectionString = match[1].trim().replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
const statements = fs.readFileSync('db/migrations/001_catalogue_neon.sql', 'utf8')
  .split(/;\s*(?=CREATE|ALTER|INSERT)/).map((statement) => statement.trim()).filter(Boolean);
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query('BEGIN');
  for (const statement of statements) await client.query(statement);
  await client.query('COMMIT');
  const result = await client.query(`
    SELECT code, name, region_name
    FROM global_regions
    WHERE lower(trim(coalesce(code, name, region_name, ''))) IN ('neo-sa', 'afr', 'aus', 'eur', 'na')
    ORDER BY code
  `);
  console.log(JSON.stringify({ appliedStatements: statements.length, regions: result.rows }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
