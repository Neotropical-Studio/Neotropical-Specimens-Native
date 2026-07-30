'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { cloudinary } from '@/lib/services/cloudinary-upload';

/** Borra asset en Cloudinary y fila(s) en specimen_media (live). */
export async function deleteMediaAssetAction(
  specimenId: string,
  cloudinaryId: string,
  resourceType: 'image' | 'video' | 'raw',
): Promise<void> {
  await requireAdmin();
  const db = getSupabaseAdmin();

  await db.from('specimen_media').delete().eq('specimen_id', specimenId).eq('public_id', cloudinaryId);

  // Si era el cover del specimen, limpia anclas live.
  const { data: sp } = await db
    .from('specimens')
    .select('cloudinary_public_id, media_url')
    .eq('id', specimenId)
    .maybeSingle();

  if (sp?.cloudinary_public_id === cloudinaryId || (sp?.media_url && String(sp.media_url).includes(cloudinaryId))) {
    await db
      .from('specimens')
      .update({ cloudinary_public_id: null, media_url: null })
      .eq('id', specimenId);
  }

  try {
    await cloudinary.uploader.destroy(cloudinaryId, { resource_type: resourceType });
  } catch {
    // La fila DB ya quedó limpia; huérfano Cloudinary no rompe el admin.
  }

  revalidatePath(`/admin/multimedia/${specimenId}`);
  revalidatePath(`/admin/especimenes/${specimenId}`);
}
