// sanity/schemas/taxonomy/familia.ts
import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { cloudinaryMediaField, commonNamesField, geoDistributionField } from './shared';

export default defineType({
  name: 'familia',
  title: 'Familia',
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
      name: 'rubro',
      title: 'Rubro',
      type: 'reference',
      // Referencia ESTRICTA: sólo documentos `rubro`, ningún otro tipo.
      to: [{ type: 'rubro' }],
      validation: (rule) => rule.required(),
    }),
    commonNamesField(),
    cloudinaryMediaField(),
    geoDistributionField(),
  ],
  preview: {
    select: { title: 'name', rubro: 'rubro.name' },
    prepare({ title, rubro }) {
      return { title, subtitle: rubro };
    },
  },
});
