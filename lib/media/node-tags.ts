/**
 * Tags / marcas Cloudinary para CARD · VIDEO · model de nodo.
 * El catálogo storefront inventaria por estos tags (+ fallback prefix RUBROS/).
 */
export const NEO_BRAND_TAG = 'neo_brand_neotropical_specimens' as const;
export const NEO_CATALOGUE_TAG = 'neo_catalogue' as const;
export const NEO_OPTIMIZED_TAG = 'neo_optimized' as const;
export const NEO_INDUSTRIAL_TAG = 'neo_industrial' as const;

export const NEO_NODE_SLOT_TAGS = {
  card: 'neo_node_card',
  video: 'neo_node_video',
  model3d: 'neo_node_model',
} as const;

export type NeoNodeSlotTagKey = keyof typeof NEO_NODE_SLOT_TAGS;

/** Tags inventariables por el storefront (resources_by_tag). */
export const NEO_NODE_INVENTORY_TAGS = [
  NEO_NODE_SLOT_TAGS.card,
  NEO_NODE_SLOT_TAGS.video,
  NEO_NODE_SLOT_TAGS.model3d,
] as const;

/**
 * Lista completa de tags al subir un CARD/VIDEO/model.
 * Siempre incluir brand + catalogue para que la web los encuentre.
 */
export function buildNodeMediaUploadTags(opts: {
  slot: 'card' | 'video';
  kind: 'image' | 'video' | 'model3d';
  level: string;
  targetId: string;
}): string[] {
  const slotTag =
    opts.kind === 'model3d'
      ? NEO_NODE_SLOT_TAGS.model3d
      : opts.slot === 'video'
        ? NEO_NODE_SLOT_TAGS.video
        : NEO_NODE_SLOT_TAGS.card;

  return [
    slotTag,
    NEO_BRAND_TAG,
    NEO_CATALOGUE_TAG,
    NEO_OPTIMIZED_TAG,
    NEO_INDUSTRIAL_TAG,
    `neo_${opts.level}`,
    opts.targetId,
  ];
}

/** Context metadata (Cloudinary context key=value). */
export function buildNodeMediaUploadContext(opts: {
  nodePath: string;
  slot: 'card' | 'video';
  level: string;
  kind: string;
  targetId: string;
}): Record<string, string> {
  return {
    neo_brand: 'neotropical_specimens',
    neo_catalogue: '1',
    neo_node: opts.nodePath,
    neo_slot: opts.slot,
    neo_level: opts.level,
    neo_kind: opts.kind,
    neo_target: opts.targetId,
  };
}
