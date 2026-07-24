// sanity/schemas/taxonomicNode.ts
import { defineType, defineField, defineArrayMember } from 'sanity';
import { TagIcon } from '@sanity/icons';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LTREE = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

const hexRule = (rule: any) =>
  rule.regex(HEX, { name: 'hex' }).error('Debe ser un color hexadecimal, p. ej. #0f766e');

export default defineType({
  name: 'taxonomicNode',
  title: 'Nodo Taxonómico',
  type: 'document',
  icon: TagIcon,
  fieldsets: [
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
          { title: 'Phylum', value: 'phylum' },
          { title: 'Clase', value: 'class' },
          { title: 'Orden', value: 'order' },
          { title: 'Familia', value: 'family' },
          { title: 'Género', value: 'genus' },
          { title: 'Especie', value: 'species' },
          { title: 'Subespecie', value: 'subspecies' },
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'parent',
      title: 'Nodo Padre',
      type: 'reference',
      to: [{ type: 'taxonomicNode' }],
      description: 'Ancestro directo. Define la jerarquía filogenética.',
    }),
    defineField({
      name: 'path',
      title: 'Ruta Filogenética (ltree)',
      type: 'string',
      description: 'Ejemplo: insecta.lepidoptera.nymphalidae',
      validation: (rule) =>
        rule.custom((value: string | undefined) =>
          !value || LTREE.test(value)
            ? true
            : 'Formato ltree inválido (solo [a-z0-9_] separados por puntos)',
        ),
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
    select: { title: 'scientificName', rank: 'rank', path: 'path', primary: 'palettePrimary' },
    prepare({ title, rank, path }) {
      return {
        title: title ?? 'Nodo sin nombre',
        subtitle: [rank, path].filter(Boolean).join(' • '),
      };
    },
  },
});
