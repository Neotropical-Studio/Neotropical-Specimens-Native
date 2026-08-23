import 'server-only';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || '';

export const sql = neon(dbUrl);
