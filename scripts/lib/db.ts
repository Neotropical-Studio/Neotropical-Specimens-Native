python3 -c "
import os

os.makedirs('lib', exist_ok=True)

code = '''import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en .env.local');
}

export const sql = neon(process.env.DATABASE_URL);
'''

with open('lib/db.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print('✅ Archivo lib/db.ts creado correctamente.')
"