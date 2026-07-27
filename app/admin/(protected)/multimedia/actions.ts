'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { cloudinary } from '@/lib/services/cloudinary-upload';

interface MediaAsset {
  type?: string;
  view?: string;
  cloudinary_id?: string;
}

export async function deleteMediaAssetAction(
  specimenId: string,
  cloudinaryId: string,
  resourceType: 'image' | 'video' | 'raw',
): Promise<void> {
  await requireAdmin();
  const db = getSupabaseAdmin();

  const { data, error } = await db.from('specimens').select('media_assets').eq('id', specimenId).maybeSingle();
  if (error) throw error;

  const mediaAssets: MediaAsset[] = Array.isArray(data?.media_assets) ? data.media_assets : [];
  const next = mediaAssets.filter((m) => m.cloudinary_id !== cloudinaryId);

  const { error: updateError } = await db.from('specimens').update({ media_assets: next }).eq('id', specimenId);
  if (updateError) throw updateError;

  try {
    await cloudinary.uploader.destroy(cloudinaryId, { resource_type: resourceType });
  } catch {
    // El jsonb ya quedó consistente (lo que ve la UI); un recurso huérfano en
    // Cloudinary no queda referenciado desde ningún lado si esto falla.
  }

  revalidatePath(`/admin/multimedia/${specimenId}`);
}
