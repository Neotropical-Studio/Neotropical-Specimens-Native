'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { nextShipmentCode } from '@/lib/codes/sequence';
import { buildTrackingUrl, generateQrPngBuffer } from '@/lib/qr/generate';
import { uploadImage } from '@/lib/services/cloudinary-upload';

const CreateShipmentSchema = z.object({
  shipmentType: z.enum(['export', 'import']),
  destinationCountry: z.string().optional(),
  destinationCustomer: z.string().optional(),
  carrier: z.string().optional(),
  notes: z.string().optional(),
});

export interface ShipmentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createShipmentAction(
  _prevState: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  const admin = await requireAdmin();
  const parsed = CreateShipmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: 'Revisa los campos marcados', fieldErrors };
  }
  const input = parsed.data;
  const db = getSupabaseAdmin();
  const shipmentCode = await nextShipmentCode(input.shipmentType);

  // Live stub: solo tracking_code. Contrato rico tras delta_align_admin_stubs.sql.
  let data: { id: string } | null = null;
  {
    const rich = await db
      .from('shipments')
      .insert({
        shipment_code: shipmentCode,
        tracking_code: shipmentCode,
        shipment_type: input.shipmentType,
        destination_country: input.destinationCountry || null,
        destination_customer: input.destinationCustomer || null,
        carrier: input.carrier || null,
        notes: input.notes || null,
        created_by: admin.id,
        status: 'draft',
      })
      .select('id')
      .single();

    if (rich.error && /column .* does not exist|Could not find/i.test(rich.error.message)) {
      const stub = await db
        .from('shipments')
        .insert({ tracking_code: shipmentCode })
        .select('id')
        .single();
      if (stub.error) return { error: stub.error.message };
      data = stub.data;
    } else if (rich.error) {
      return { error: rich.error.message };
    } else {
      data = rich.data;
    }
  }

  if (!data?.id) return { error: 'No se pudo crear el embarque' };

  revalidatePath('/admin/embarques');
  redirect(`/admin/embarques/${data.id}`);
}

export async function addShipmentItemAction(shipmentId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const specimenId = String(formData.get('specimenId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);
  if (!specimenId) return;

  const db = getSupabaseAdmin();
  const { error } = await db
    .from('shipment_items')
    .insert({ shipment_id: shipmentId, specimen_id: specimenId, quantity: quantity > 0 ? quantity : 1 });
  if (error && !error.message.toLowerCase().includes('duplicate')) throw error;

  revalidatePath(`/admin/embarques/${shipmentId}`);
}

export async function removeShipmentItemAction(shipmentId: string, itemId: string): Promise<void> {
  await requireAdmin();
  const db = getSupabaseAdmin();
  const { error } = await db.from('shipment_items').delete().eq('id', itemId);
  if (error) throw error;
  revalidatePath(`/admin/embarques/${shipmentId}`);
}

const SHIPMENT_STATUSES = new Set([
  'draft',
  'permits_pending',
  'ready',
  'in_transit',
  'delivered',
  'cancelled',
]);

export async function updateShipmentStatusAction(shipmentId: string, status: string): Promise<void> {
  await requireAdmin();
  if (!SHIPMENT_STATUSES.has(status)) throw new Error('Estado inválido');

  const db = getSupabaseAdmin();
  const { error } = await db.from('shipments').update({ status }).eq('id', shipmentId);
  if (error) throw error;
  revalidatePath(`/admin/embarques/${shipmentId}`);
}

export async function attachPermitAction(shipmentId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const permitCode = String(formData.get('permitCode') ?? '');
  const permitNumber = String(formData.get('permitNumber') ?? '') || null;
  const issuedAt = String(formData.get('issuedAt') ?? '') || null;
  const expiresAt = String(formData.get('expiresAt') ?? '') || null;
  const documentCloudinaryId = String(formData.get('documentCloudinaryId') ?? '') || null;

  const db = getSupabaseAdmin();
  const { error } = await db.from('shipment_permits').upsert(
    {
      shipment_id: shipmentId,
      permit_code: permitCode,
      permit_number: permitNumber,
      issued_at: issuedAt,
      expires_at: expiresAt,
      document_cloudinary_id: documentCloudinaryId,
      status: 'submitted',
    },
    { onConflict: 'shipment_id,permit_code' },
  );
  if (error) throw error;

  revalidatePath(`/admin/embarques/${shipmentId}`);
}

export async function verifyPermitAction(shipmentId: string, permitId: string, approve: boolean): Promise<void> {
  const admin = await requireAdmin();
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('shipment_permits')
    .update({
      status: approve ? 'approved' : 'rejected',
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', permitId);
  if (error) throw error;
  revalidatePath(`/admin/embarques/${shipmentId}`);
}

// Genera (o regenera) el código de exportación/importación y el QR de
// trazabilidad — el QR codifica una URL a la página pública de rastreo, no un
// payload JSON (ver lib/qr/generate.ts).
export async function generateShipmentQrAction(shipmentId: string, shipmentCode: string): Promise<void> {
  await requireAdmin();
  const url = buildTrackingUrl(shipmentCode);
  const buffer = await generateQrPngBuffer(url);
  const result = await uploadImage(buffer, {
    folder: `documentos-legales/${shipmentCode}`,
    publicId: 'qr',
    pathPolicy: 'operational',
  });

  const db = getSupabaseAdmin();
  const { error } = await db
    .from('shipments')
    .update({ qr_payload: url, qr_cloudinary_id: result.public_id })
    .eq('id', shipmentId);
  if (error) throw error;

  revalidatePath(`/admin/embarques/${shipmentId}`);
}
