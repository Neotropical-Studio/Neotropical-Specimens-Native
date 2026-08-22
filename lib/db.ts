import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL || '';
const isValidUrl = rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://');

if (!isValidUrl) {
  console.warn('⚠️ DATABASE_URL inválida o no configurada en .env.local.');
}

// Si la URL no es válida, se asigna una URL placeholder segura para no romper la app
const dbUrl = isValidUrl ? rawUrl : 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export const sql = neon(dbUrl);
