// ============================================================================
// Códigos correlativos atómicos (specimen_code nuevo formato, shipment_code)
// vía la función SQL `next_sequence` (supabase/migrations/0003_admin_panel.sql)
// — un único UPDATE...RETURNING, sin lectura-luego-escritura, así que es
// seguro bajo administradores concurrentes.
// ============================================================================
import { getSupabaseAdmin } from '@/lib/supabase/client';

async function next(seqKey: string): Promise<number> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc('next_sequence', { seq_key: seqKey });
  if (error) throw error;
  return data as number;
}

// Formato nuevo (distinto del legado NEO-LEP-MORPHO-001): {REGION}-{n}, p. ej.
// NEO-4421. No colisiona con specimen_code legado — formatos visualmente
// distintos, y la unicidad la sigue garantizando la columna specimen_code.
export async function nextSpecimenCode(regionCode: string): Promise<string> {
  const n = await next(`specimen:${regionCode.toUpperCase()}`);
  return `${regionCode.toUpperCase()}-${n}`;
}

// Escalonado por año (la clave de secuencia cambia cada año, así que el
// correlativo reinicia solo, sin lógica extra): EXP-2026-00001 / IMP-2026-00001.
export async function nextShipmentCode(type: 'export' | 'import'): Promise<string> {
  const year = new Date().getUTCFullYear();
  const n = await next(`shipment:${type}:${year}`);
  const prefix = type === 'export' ? 'EXP' : 'IMP';
  return `${prefix}-${year}-${String(n).padStart(5, '0')}`;
}
