import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Esquema dinámico: los tipos se resuelven en runtime vía metadata jsonb.
export type DynamicRecord = Record<string, unknown> & {
  id: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

let browserClient: SupabaseClient | undefined;

/** Limpia valor de env: comillas, BOM, espacios (fallo típico al pegar en Vercel). */
function cleanEnv(raw: string | undefined): string {
  if (!raw) return '';
  let v = raw.replace(/^\uFEFF/, '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function publicEnv() {
  // Nombres literales (Next/Vercel inyecta solo accesos estáticos a process.env.*)
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return { url, anonKey };
}

function adminEnv() {
  const { url } = publicEnv();
  // Accesos estáticos + alias por si el nombre en Vercel quedó corto/typo.
  const serviceKey =
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE) ||
    cleanEnv(process.env.SUPABASE_SERVICE_KEY) ||
    '';
  return { url, serviceKey };
}

/** True si el servidor tiene URL + service_role (necesario para escrituras admin). */
export function isSupabaseAdminConfigured(): boolean {
  const { url, serviceKey } = adminEnv();
  return Boolean(url && serviceKey);
}

/** Diagnóstico seguro (sin revelar secretos) para el banner de /admin. */
export function getSupabaseAdminConfigStatus(): {
  hasUrl: boolean;
  hasAnon: boolean;
  hasServiceRole: boolean;
  serviceRoleLooksLikeJwt: boolean;
  serviceRoleLen: number;
} {
  const { url, anonKey } = publicEnv();
  const { serviceKey } = adminEnv();
  return {
    hasUrl: Boolean(url),
    hasAnon: Boolean(anonKey),
    hasServiceRole: Boolean(serviceKey),
    serviceRoleLooksLikeJwt: serviceKey.startsWith('eyJ'),
    serviceRoleLen: serviceKey.length,
  };
}

export function getSupabaseBrowser(): SupabaseClient {
  const { url, anonKey } = publicEnv();
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  browserClient ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return browserClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  const { url, serviceKey } = adminEnv();
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required for admin)',
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'neotropical-backend' } },
  });
}

export async function queryDynamic(
  table: string,
  filters: Record<string, unknown> = {},
  opts: { limit?: number; order?: string; ascending?: boolean } = {},
): Promise<DynamicRecord[]> {
  const db = getSupabaseAdmin();
  let q = db.from(table).select('*');

  for (const [key, value] of Object.entries(filters)) {
    if (key.includes('.')) {
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
