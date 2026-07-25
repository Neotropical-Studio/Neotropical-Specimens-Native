// sanity/schemas/taxonomy/shared.ts
// Campos reutilizados en cada nivel de la cadena estricta de taxonomía
// (Rubro → Familia → Subfamilia → Género → Especie → Subespecie).
import { defineField, defineArrayMember } from 'sanity';

// Media SIEMPRE por Cloudinary public ID — igual que sanity/schemas/specimen.ts
// y sanity/schemas/taxonomicNode.ts. Nunca `image`/`file` nativos de Sanity:
// el catálogo sirve todo a través de /api/media (lib/cloudinary/url.ts).
const MEDIA_TYPES = [
  { title: 'Foto (WebP)', value: 'photo_webp' },
  { title: 'Modelo 3D (.glb)', value: 'model_3d_glb' },
  { title: 'Video (MP4)', value: 'video_mp4' },
];

export const cloudinaryMediaField = () =>
  defineField({
    name: 'media',
    title: 'Multimedia (Cloudinary)',
    description:
      'Recursos representativos de este taxón. Public IDs de Cloudinary optimizados (f_auto/q_auto vía el proxy /api/media) — nunca assets nativos de Sanity.',
    type: 'array',
    of: [
      defineArrayMember({
        type: 'object',
        fields: [
          defineField({
            name: 'type',
            title: 'Tipo',
            type: 'string',
            options: { list: MEDIA_TYPES },
            validation: (rule) => rule.required(),
          }),
          defineField({ name: 'caption', title: 'Descripción', type: 'string' }),
          defineField({
            name: 'cloudinaryId',
            title: 'Cloudinary Public ID',
            type: 'string',
            validation: (rule) => rule.required(),
          }),
        ],
        preview: {
          select: { title: 'cloudinaryId', subtitle: 'type' },
        },
      }),
    ],
  });

// Distribución geográfica NATIVA del taxón (dónde se encuentra en la
// naturaleza) — no confundir con la geolocalización del VISITANTE, que
// resuelve lib/geo/ip.ts en runtime. Mismo alfabeto de códigos
// (ISO-3166 alpha-2) que lib/geo/countries.ts, para poder cruzar ambos datos
// en el catálogo (p. ej. "disponible en tu región").
const COUNTRY_CODE = /^[A-Z]{2}$/;

export const geoDistributionField = () =>
  defineField({
    name: 'geoDistribution',
    title: 'Distribución Geográfica (Geo-IP)',
    description:
      'Países ISO-3166 alpha-2 (p. ej. PE, BR, CO) donde este taxón se registra de forma nativa. Se cruza con el país del visitante (lib/geo/*) para badges/filtros geo-conscientes en el catálogo.',
    type: 'array',
    of: [defineArrayMember({ type: 'string' })],
    validation: (rule) =>
      rule.custom((codes: string[] | undefined) => {
        if (!codes?.length) return true;
        const bad = codes.filter((c) => !COUNTRY_CODE.test(c));
        return bad.length
          ? `Código(s) inválido(s), usa ISO-3166 alpha-2 en mayúsculas: ${bad.join(', ')}`
          : true;
      }),
  });

export const commonNamesField = () =>
  defineField({
    name: 'commonNames',
    title: 'Nombres Comunes (i18n)',
    type: 'object',
    fields: [
      defineField({ name: 'es', title: 'Español', type: 'string' }),
      defineField({ name: 'en', title: 'Inglés', type: 'string' }),
    ],
  });
