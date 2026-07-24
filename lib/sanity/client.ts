import { createClient, type SanityClient } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = process.env.SANITY_API_VERSION ?? '2025-01-01';

export const sanity: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: process.env.NODE_ENV === 'production',
  perspective: 'published',
});

export const sanityPreview: SanityClient = sanity.withConfig({
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  perspective: 'drafts',
});

// GROQ dinámico: proyecta cualquier documento con atributos variables.
export async function fetchDynamic<T = Record<string, unknown>>(
  type: string,
  params: { filter?: string; projection?: string; order?: string; limit?: number } = {},
): Promise<T[]> {
  const filter = params.filter ? ` && ${params.filter}` : '';
  const projection = params.projection ?? `{ ..., "taxonomy": taxonomy->{ ..., "path": path } }`;
  const order = params.order ? ` | order(${params.order})` : '';
  const slice = params.limit ? `[0...${params.limit}]` : '';

  const query = `*[_type == $type${filter}]${projection}${order}${slice}`;
  return sanity.fetch<T[]>(query, { type });
}

// Metadatos camaleónicos: normaliza atributos variables a un mapa plano.
export function flattenAttributes(doc: Record<string, unknown>): Record<string, unknown> {
  const attrs = (doc.attributes as Record<string, unknown>) ?? {};
  const meta = (doc.metadata as Record<string, unknown>) ?? {};
  return { ...meta, ...attrs, _type: doc._type, _id: doc._id };
}
