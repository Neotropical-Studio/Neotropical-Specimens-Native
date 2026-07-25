import { createClient, type SanityClient } from '@sanity/client';

// Una variable declarada pero vacía ('') NO activa `??`, y createClient revienta
// con apiVersion vacío. Normalizamos vacío/espacios a undefined.
const env = (value?: string) => (value && value.trim() ? value.trim() : undefined);

const projectId = env(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
const dataset = env(process.env.NEXT_PUBLIC_SANITY_DATASET) ?? 'production';
const apiVersion = env(process.env.SANITY_API_VERSION) ?? '2025-01-01';

// Construcción perezosa: importar este módulo nunca debe romper el arranque por
// configuración ausente. El layout raíz depende de él en TODAS las rutas (i18n),
// así que un throw en tiempo de import tumbaría también /offline y /_not-found.
// Al aplazarlo, el fallo aparece en la llamada, donde las capas consumidoras
// (lib/i18n/locales.ts, lib/i18n/strings.ts) ya degradan a sus fallbacks.
function lazyClient(configure: (base: SanityClient) => SanityClient): SanityClient {
  let client: SanityClient | null = null;

  const instance = (): SanityClient => {
    if (client) return client;
    if (!projectId) throw new Error('Sanity sin configurar: falta NEXT_PUBLIC_SANITY_PROJECT_ID');
    client = configure(
      createClient({
        projectId,
        dataset,
        apiVersion,
        token: env(process.env.SANITY_API_TOKEN),
        useCdn: process.env.NODE_ENV === 'production',
        perspective: 'published',
      }),
    );
    return client;
  };

  return new Proxy({} as SanityClient, {
    get: (_target, prop) => {
      const target = instance() as unknown as Record<string | symbol, unknown>;
      const value = target[prop];
      // Ligamos los métodos al cliente real (conserva su estado interno).
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export const sanity: SanityClient = lazyClient((base) => base);

export const sanityPreview: SanityClient = lazyClient((base) =>
  base.withConfig({ token: env(process.env.SANITY_API_TOKEN), useCdn: false, perspective: 'drafts' }),
);

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
