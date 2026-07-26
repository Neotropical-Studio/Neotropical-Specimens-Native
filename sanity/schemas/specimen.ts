// sanity/schemas/specimen.ts
import { defineType, defineField, defineArrayMember } from 'sanity';
import { CircleIcon } from '@sanity/icons';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hexRule = (rule: any) =>
  rule.regex(HEX, { name: 'hex' }).error('Debe ser un color hexadecimal, p. ej. #0f766e');

// Media SIEMPRE por Cloudinary public ID — nunca `image`/`file` nativos de
// Sanity. El catálogo sirve todo a través de /api/media (lib/cloudinary/url.ts)
// y specimens.media_assets guarda exactamente { type, view, cloudinary_id }.
//
// El Studio es un proyecto aparte (sin acceso al alias `@/lib/...` de la app),
// así que este mapa vive duplicado aquí — debe coincidir con
// SPECIMEN_KIND_FOLDERS en lib/cloudinary/paths.ts del repo de la app.
const SPECIMEN_KIND_FOLDERS: Record<string, string> = {
  dried_specimen: 'especimenes-secos',
  zoology_skeleton: 'esqueletos-zoologia',
  plant: 'plantas',
};

const MEDIA_TYPES = [
  { title: 'Foto (WebP)', value: 'photo_webp' },
  { title: 'Modelo 3D (.glb)', value: 'model_3d_glb' },
  { title: 'Video (MP4)', value: 'video_mp4' },
];

const MEDIA_VIEWS = [
  { title: 'Dorsal', value: 'dorsal' },
  { title: 'Ventral', value: 'ventral' },
  { title: 'Lateral', value: 'lateral' },
  { title: 'Macro', value: 'macro' },
];

export default defineType({
  name: 'specimen',
  title: 'Espécimen',
  type: 'document',
  icon: CircleIcon,
  fieldsets: [
    { name: 'links', title: 'Ubicación en el catálogo', options: { columns: 2 } },
    { name: 'pricing', title: 'Precio y Stock', options: { columns: 2 } },
    { name: 'morphology', title: 'Atributos Físicos y Biológicos' },
    { name: 'themeOverride', title: 'Override de Paleta (opcional)', options: { columns: 3 } },
  ],
  fields: [
    defineField({
      name: 'specimenCode',
      title: 'Código de Inventario',
      description: 'Código físico único, p. ej. NEO-LEP-001.',
      type: 'string',
      validation: (rule) =>
        rule.required().custom(async (code, ctx) => {
          if (!code) return true;
          const dupes = await ctx.getClient({ apiVersion: '2025-01-01' }).fetch(
            `count(*[_type == "specimen" && specimenCode == $code && _id != $id])`,
            { code, id: ctx.document?._id?.replace(/^drafts\./, '') ?? '' },
          );
          return dupes === 0 ? true : 'Ya existe otro espécimen con este código';
        }),
    }),
    defineField({
      name: 'taxon',
      title: 'Especie / Subespecie',
      description:
        'Identificación taxonómica del espécimen físico, al nivel más específico disponible (especie o subespecie) de la cadena Rubro→Familia→Subfamilia→Género→Especie→Subespecie.',
      type: 'reference',
      to: [{ type: 'especie' }, { type: 'subespecie' }],
      fieldset: 'links',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Categoría (slug)',
      description: 'Debe coincidir con categories.slug en Supabase (p. ej. mariposas).',
      type: 'string',
      fieldset: 'links',
    }),
    defineField({
      name: 'region',
      title: 'Región (código)',
      description: 'Debe coincidir con global_regions.code en Supabase (p. ej. NEO).',
      type: 'string',
      fieldset: 'links',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'specimenKind',
      title: 'Tipo de Espécimen',
      description:
        'Determina la carpeta de Cloudinary junto con la región (especimenes-secos|esqueletos-zoologia|plantas/<región>/…).',
      type: 'string',
      fieldset: 'links',
      options: {
        list: [
          { title: 'Espécimen Seco', value: 'dried_specimen' },
          { title: 'Esqueleto de Zoología', value: 'zoology_skeleton' },
          { title: 'Planta', value: 'plant' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'retailPrice',
      title: 'Precio Minorista',
      type: 'number',
      fieldset: 'pricing',
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'wholesalePrice',
      title: 'Precio Mayorista',
      type: 'number',
      fieldset: 'pricing',
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: 'wholesaleMinQty',
      title: 'Mínimo Mayorista (unidades)',
      type: 'number',
      fieldset: 'pricing',
      validation: (rule) => rule.integer().positive(),
    }),
    defineField({
      name: 'currency',
      title: 'Divisa',
      type: 'string',
      initialValue: 'USD',
      fieldset: 'pricing',
    }),
    defineField({
      name: 'stock',
      title: 'Stock',
      type: 'number',
      initialValue: 1,
      fieldset: 'pricing',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'sex',
      title: 'Sexo',
      type: 'string',
      fieldset: 'morphology',
      options: {
        list: [
          { title: '♂ Macho', value: 'M' },
          { title: '♀ Hembra', value: 'F' },
          { title: 'Pareja', value: 'P' },
          { title: 'Ex-pupa', value: 'EP' },
          { title: 'Set', value: 'S' },
        ],
      },
    }),
    defineField({
      name: 'gradeCode',
      title: 'Código de Calidad',
      description: 'A1, A1/A1-, A1-, VGA2, A2…',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'gradeName',
      title: 'Nombre de Calidad',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'wingspanMm',
      title: 'Envergadura (mm)',
      type: 'number',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'primaryColors',
      title: 'Colores Primarios',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      fieldset: 'morphology',
    }),
    defineField({
      name: 'countryOrigin',
      title: 'País de Origen',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'gpsCoordinates',
      title: 'Coordenadas GPS',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'commonNames',
      title: 'Nombre Común (i18n)',
      type: 'object',
      fields: [
        defineField({ name: 'es', title: 'Español', type: 'string' }),
        defineField({ name: 'en', title: 'Inglés', type: 'string' }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Descripción (i18n)',
      type: 'object',
      fields: [
        defineField({ name: 'es', title: 'Español', type: 'text' }),
        defineField({ name: 'en', title: 'Inglés', type: 'text' }),
      ],
    }),
    defineField({
      name: 'themePrimary',
      title: 'Color Primario',
      type: 'string',
      fieldset: 'themeOverride',
      validation: hexRule,
    }),
    defineField({
      name: 'themeAccent',
      title: 'Color de Acento',
      type: 'string',
      fieldset: 'themeOverride',
      validation: hexRule,
    }),
    defineField({
      name: 'themeSurface',
      title: 'Superficie',
      type: 'string',
      fieldset: 'themeOverride',
      validation: hexRule,
    }),
    defineField({
      name: 'media',
      title: 'Multimedia (Cloudinary)',
      type: 'array',
      validation: (rule) => rule.required().min(1),
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
            defineField({
              name: 'view',
              title: 'Toma',
              description: 'Sólo aplica a fotos.',
              type: 'string',
              options: { list: MEDIA_VIEWS },
              hidden: ({ parent }) => parent?.type !== 'photo_webp',
            }),
            defineField({
              name: 'cloudinaryId',
              title: 'Cloudinary Public ID',
              description: 'Debe vivir bajo {tipo-de-especimen}/{region}/… (ver specimenKind/region del documento).',
              type: 'string',
              validation: (rule) =>
                rule.required().custom((value: string | undefined, ctx: any) => {
                  if (!value) return true;
                  const kind = ctx.document?.specimenKind as string | undefined;
                  const region = ctx.document?.region as string | undefined;
                  if (!kind || !region) return true; // se valida solo cuando ambos ya están cargados
                  const folder = `${SPECIMEN_KIND_FOLDERS[kind] ?? kind}/${region.toLowerCase()}/`;
                  return value.startsWith(folder)
                    ? true
                    : `Debe empezar con "${folder}" (tipo de espécimen + región)`;
                }),
            }),
          ],
          preview: {
            select: { title: 'cloudinaryId', type: 'type', view: 'view' },
            prepare({ title, type, view }) {
              return { title: title ?? 'Sin recurso', subtitle: [type, view].filter(Boolean).join(' • ') };
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'specimenCode', taxon: 'taxon.scientificName', code: 'category' },
    prepare({ title, taxon, code }) {
      return {
        title: title ?? 'Espécimen sin código',
        subtitle: [taxon, code].filter(Boolean).join(' • '),
      };
    },
  },
});
