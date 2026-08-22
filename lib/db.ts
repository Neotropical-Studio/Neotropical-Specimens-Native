import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en .env.local');
}

export const sql = neon(process.env.DATABASE_URL);
