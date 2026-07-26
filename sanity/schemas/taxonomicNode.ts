// sanity/schemas/taxonomicNode.ts
import { defineType, defineField, defineArrayMember } from 'sanity';
import { TagIcon } from '@sanity/icons';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const hexRule = (rule: any) =>
  rule.regex(HEX, { name: 'hex' }).error('Debe ser un color hexadecimal, p. ej. #0f766e');

// Rangos soportados por `taxonomy.rank_hierarchy` en Supabase (sin phylum/clase:
// el inventario es sólo insectos/artrópodos, así que la app arranca en orden).
const RANKS = ['order', 'family', 'subfamily', 'genus', 'species', 'subspecies'] as const;
type Rank = (typeof RANKS)[number];

// Un rango sólo es relevante si es igual o más específico que el rango del nodo.
const atLeast = (min: Rank) => (rank: Rank | undefined) =>
  RANKS.indexOf(rank ?? 'order') >= RANKS.indexOf(min);

// OBSOLETO: reemplazado por la cadena estricta Rubro→Familia→Subfamilia→
// Género→Especie→Subespecie (ver sanity/schemas/taxonomy/). specimen.taxon ya
// no referencia este tipo. Se mantiene registrado (no eliminado) sólo para
// no dejar inaccesibles en el Studio los documentos que ya existan de este tipo.
export default defineType({
  name: 'taxonomicNode',
  title: '⚠️ Nodo Taxonómico (obsoleto)',
  type: 'document',
  icon: TagIcon,
  fieldsets: [
    { name: 'lineage', title: 'Linaje (rank_hierarchy)', options: { columns: 2 } },
    { name: 'palette', title: 'Paleta Camaleónica', options: { columns: 3 } },
    { name: 'morphology', title: 'Atributos Morfológicos y Ecológicos' },
  ],
  fields: [
    defineField({
      name: 'scientificName',
      title: 'Nombre Científico',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'scientificName', maxLength: 96 },
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return 'Requerido';
          return /^[a-z0-9-]+$/.test(slug.current)
            ? true
            : 'El slug debe ser minúsculas con guiones';
        }),
    }),
    defineField({
      name: 'rank',
      title: 'Rango Taxonómico',
      type: 'string',
      options: {
        list: [
          { title: 'Orden', value: 'order' },
          { title: 'Familia', value: 'family' },
          { title: 'Subfamilia', value: 'subfamily' },
          { title: 'Género', value: 'genus' },
          { title: 'Especie', value: 'species' },
          { title: 'Subespecie', value: 'subspecies' },
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    // Linaje explícito y plano: se vuelca tal cual en `taxonomy.rank_hierarchy`
    // (jsonb) al sincronizar, sin resolver referencias ni ltree.
    defineField({
      name: 'order',
      title: 'Orden',
      type: 'string',
      fieldset: 'lineage',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'family',
      title: 'Familia',
      type: 'string',
      fieldset: 'lineage',
      hidden: ({ parent }) => !atLeast('family')(parent?.rank),
      validation: (rule) => rule.custom((v, ctx: any) =>
        atLeast('family')(ctx.parent?.rank) && !v ? 'Requerido para este rango' : true),
    }),
    defineField({
      name: 'subfamily',
      title: 'Subfamilia',
      type: 'string',
      fieldset: 'lineage',
      hidden: ({ parent }) => !atLeast('subfamily')(parent?.rank),
    }),
    defineField({
      name: 'genus',
      title: 'Género',
      type: 'string',
      fieldset: 'lineage',
      hidden: ({ parent }) => !atLeast('genus')(parent?.rank),
      validation: (rule) => rule.custom((v, ctx: any) =>
        atLeast('genus')(ctx.parent?.rank) && !v ? 'Requerido para este rango' : true),
    }),
    defineField({
      name: 'species',
      title: 'Especie',
      type: 'string',
      fieldset: 'lineage',
      hidden: ({ parent }) => !atLeast('species')(parent?.rank),
      validation: (rule) => rule.custom((v, ctx: any) =>
        atLeast('species')(ctx.parent?.rank) && !v ? 'Requerido para este rango' : true),
    }),
    defineField({
      name: 'subspecies',
      title: 'Subespecie',
      type: 'string',
      fieldset: 'lineage',
      hidden: ({ parent }) => !atLeast('subspecies')(parent?.rank),
      validation: (rule) => rule.custom((v, ctx: any) =>
        atLeast('subspecies')(ctx.parent?.rank) && !v ? 'Requerido para este rango' : true),
    }),
    defineField({
      name: 'commonNames',
      title: 'Nombres Comunes (i18n)',
      type: 'object',
      fields: [
        defineField({ name: 'es', title: 'Español', type: 'string' }),
        defineField({ name: 'en', title: 'Inglés', type: 'string' }),
      ],
    }),
    defineField({
      name: 'palettePrimary',
      title: 'Color Primario',
      type: 'string',
      fieldset: 'palette',
      validation: hexRule,
    }),
    defineField({
      name: 'paletteAccent',
      title: 'Color de Acento',
      type: 'string',
      fieldset: 'palette',
      validation: hexRule,
    }),
    defineField({
      name: 'paletteSurface',
      title: 'Superficie',
      type: 'string',
      fieldset: 'palette',
      validation: hexRule,
    }),
    defineField({
      name: 'mediaAssets',
      title: 'Recursos Multimedia (Cloudinary Public IDs)',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'wingspan',
      title: 'Envergadura / Tamaño',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'habitat',
      title: 'Hábitat',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'distribution',
      title: 'Distribución Neotropical',
      type: 'string',
      fieldset: 'morphology',
    }),
    defineField({
      name: 'attributes',
      title: 'Metadatos Camaleónicos (clave/valor)',
      type: 'array',
      description: 'Atributos variables adicionales por rubro/perfil.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'key', title: 'Clave', type: 'string' }),
            defineField({ name: 'value', title: 'Valor', type: 'string' }),
          ],
          preview: { select: { title: 'key', subtitle: 'value' } },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'scientificName',
      rank: 'rank',
      order: 'order',
      family: 'family',
      subfamily: 'subfamily',
      genus: 'genus',
      species: 'species',
    },
    prepare({ title, rank, order, family, subfamily, genus, species }) {
      const lineage = [order, family, subfamily, genus, species].filter(Boolean).join(' › ');
      return {
        title: title ?? 'Nodo sin nombre',
        subtitle: [rank, lineage].filter(Boolean).join(' • '),
      };
    },
  },
});
