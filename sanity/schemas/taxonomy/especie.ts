// sanity/schemas/taxonomy/especie.ts
import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { cloudinaryMediaField, commonNamesField, geoDistributionField } from './shared';

export default defineType({
  name: 'especie',
  title: 'Especie',
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
      name: 'genero',
      title: 'Género',
      type: 'reference',
      // Referencia ESTRICTA: sólo documentos `genero`.
      to: [{ type: 'genero' }],
      validation: (rule) => rule.required(),
    }),
    commonNamesField(),
    cloudinaryMediaField(),
    geoDistributionField(),
  ],
  preview: {
    select: { title: 'name', genero: 'genero.name' },
    prepare({ title, genero }) {
      return { title, subtitle: genero };
    },
  },
});
