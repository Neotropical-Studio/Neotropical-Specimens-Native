import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let envConfig: any = {};
try {
  const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      envConfig[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function runImport() {
  console.log('Registrando categoría en categories...');

  const { data, error } = await supabase
    .from('categories')
    .insert([{ category_name: 'Butterflies (Lepidoptera) Diurne' }])
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('¡Categoría registrada con éxito absoluto!', data);
  }
}

runImport();
