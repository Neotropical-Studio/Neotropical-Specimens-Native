// sanity/schemas/taxonomy/subespecie.ts
import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { cloudinaryMediaField, commonNamesField, geoDistributionField } from './shared';

export default defineType({
  name: 'subespecie',
  title: 'Subespecie',
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
      name: 'especie',
      title: 'Especie',
      type: 'reference',
      // Referencia ESTRICTA: sólo documentos `especie`.
      to: [{ type: 'especie' }],
      validation: (rule) => rule.required(),
    }),
    commonNamesField(),
    cloudinaryMediaField(),
    geoDistributionField(),
  ],
  preview: {
    select: { title: 'name', especie: 'especie.name' },
    prepare({ title, especie }) {
      return { title, subtitle: especie };
    },
  },
});
