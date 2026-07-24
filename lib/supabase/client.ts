import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Esquema dinámico: los tipos se resuelven en runtime vía metadata jsonb.
export type DynamicRecord = Record<string, unknown> & {
  id: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowser(): SupabaseClient {
  browserClient ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return browserClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'neotropical-backend' } },
  });
}

// Consulta camaleónica: filtra por atributos arbitrarios en jsonb.
export async function queryDynamic(
  table: string,
  filters: Record<string, unknown> = {},
  opts: { limit?: number; order?: string; ascending?: boolean } = {},
): Promise<DynamicRecord[]> {
  const db = getSupabaseAdmin();
  let q = db.from(table).select('*');

  for (const [key, value] of Object.entries(filters)) {
    if (key.includes('.')) {
      // filtro sobre jsonb: metadata.color -> metadata->>color
      const [col, ...rest] = key.split('.');
      q = q.eq(`${col}->>${rest.join('.')}`, value as string);
    } else {
      q = q.eq(key, value as string);
    }
  }

  if (opts.order) q = q.order(opts.order, { ascending: opts.ascending ?? false });
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DynamicRecord[];
}
