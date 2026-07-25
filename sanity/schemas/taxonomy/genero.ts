// sanity/schemas/taxonomy/genero.ts
import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { cloudinaryMediaField, commonNamesField, geoDistributionField } from './shared';

export default defineType({
  name: 'genero',
  title: 'Género',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre Científico',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subfamilia',
      title: 'Subfamilia',
      type: 'reference',
      // Referencia ESTRICTA: sólo documentos `subfamilia`.
      to: [{ type: 'subfamilia' }],
      validation: (rule) => rule.required(),
    }),
    commonNamesField(),
    cloudinaryMediaField(),
    geoDistributionField(),
  ],
  preview: {
    select: { title: 'name', subfamilia: 'subfamilia.name' },
    prepare({ title, subfamilia }) {
      return { title, subtitle: subfamilia };
    },
  },
});
