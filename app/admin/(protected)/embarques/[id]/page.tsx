import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { SPECIMEN_SELECT, toSpecimenView, type SpecimenRow } from '@/lib/specimens/view';
import { imageUrl } from '@/lib/cloudinary/url';
import ShipmentItemsEditor from '../ShipmentItemsEditor';
import PermitUploader from '../PermitUploader';
import ShipmentActions from '../ShipmentActions';
import type { PermitCode } from '@/components/PermitSeal';

export const revalidate = 0;

const PERMIT_CODES: PermitCode[] = ['CITES', 'VUCE', 'SENASA', 'SERFOR'];

interface ShipmentItemRow {
  id: string;
  specimen_id: string;
  quantity: number;
  specimens: { specimen_code: string; taxonomy: { rank_hierarchy: Record<string, string> } | null } | null;
}

interface ShipmentPermitRow {
  id: string;
  permit_code: string;
  permit_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  document_cloudinary_id: string | null;
  status: string;
}

async function loadShipment(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('shipments').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadItems(shipmentId: string): Promise<ShipmentItemRow[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('shipment_items')
    .select('id, specimen_id, quantity, specimens(specimen_code, taxonomy(rank_hierarchy))')
    .eq('shipment_id', shipmentId);
  if (error) throw error;
  return (data ?? []) as unknown as ShipmentItemRow[];
}

async function loadPermits(shipmentId: string): Promise<ShipmentPermitRow[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('shipment_permits').select('*').eq('shipment_id', shipmentId);
  if (error) throw error;
  return (data ?? []) as ShipmentPermitRow[];
}

async function loadSpecimenOptions() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('specimens')
    .select(SPECIMEN_SELECT)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return ((data ?? []) as SpecimenRow[]).map((row) => {
    const v = toSpecimenView(row);
    return { id: v.id, code: v.code, label: v.scientificName };
  });
}

export default async function EmbarqueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [shipment, items, permits, specimenOptions] = await Promise.all([
    loadShipment(id),
    loadItems(id),
    loadPermits(id),
    loadSpecimenOptions(),
  ]);
  if (!shipment) notFound();

  const shipmentItems = items.map((it) => ({
    id: it.id,
    quantity: it.quantity,
    specimenCode: it.specimens?.specimen_code ?? '—',
    specimenLabel: it.specimens?.taxonomy?.rank_hierarchy?.species ?? '',
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Embarque · {shipment.shipment_code}</h1>
        <p className="text-sm text-neutral-400">
          {shipment.shipment_type === 'export' ? 'Exportación' : 'Importación'} ·{' '}
          {shipment.destination_country ?? 'Sin destino asignado'}
        </p>
      </div>

      <ShipmentActions
        shipmentId={shipment.id}
        shipmentCode={shipment.shipment_code}
        status={shipment.status}
        hasQr={Boolean(shipment.qr_cloudinary_id)}
      />

      {shipment.qr_cloudinary_id && (
        <div className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(shipment.qr_cloudinary_id, ['w_160'])}
            alt="Código QR de trazabilidad"
            className="h-24 w-24 rounded bg-white p-1"
          />
          <div className="text-sm text-neutral-300">
            <p>Código QR de trazabilidad logística</p>
            <a href={shipment.qr_payload} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
              {shipment.qr_payload}
            </a>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-emerald-400">Especímenes del embarque</h2>
        <ShipmentItemsEditor shipmentId={shipment.id} specimenOptions={specimenOptions} items={shipmentItems} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-emerald-400">Permisos oficiales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PERMIT_CODES.map((code) => (
            <PermitUploader
              key={code}
              shipmentId={shipment.id}
              permitCode={code}
              existing={permits.find((p) => p.permit_code === code)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
