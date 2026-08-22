import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ ERROR FATAL: DATABASE_URL no existe en process.env');
}

export const sql = neon(dbUrl || '');
