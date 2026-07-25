// sanity/schemas/taxonomy/subfamilia.ts
import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { cloudinaryMediaField, commonNamesField, geoDistributionField } from './shared';

export default defineType({
  name: 'subfamilia',
  title: 'Subfamilia',
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
      name: 'familia',
      title: 'Familia',
      type: 'reference',
      // Referencia ESTRICTA: sólo documentos `familia`.
      to: [{ type: 'familia' }],
      validation: (rule) => rule.required(),
    }),
    commonNamesField(),
    cloudinaryMediaField(),
    geoDistributionField(),
  ],
  preview: {
    select: { title: 'name', familia: 'familia.name' },
    prepare({ title, familia }) {
      return { title, subtitle: familia };
    },
  },
});
