// sanity/schemas/taxonomy/rubro.ts
// Nivel superior de la cadena estricta de taxonomía:
//   Rubro → Familia → Subfamilia → Género → Especie → Subespecie
// "Rubro" es el rubro museográfico/comercial (Mariposas, Esqueletos de
// Zoología, Plantas…) — NO es lo mismo que `categories.slug` en Supabase
// (eso es merchandising puro); este es el techo de la jerarquía de CONTENIDO
// en Sanity, del que cuelgan todas las familias.
import { defineType, defineField } from 'sanity';
import { TagIcon } from '@sanity/icons';
import { cloudinaryMediaField, commonNamesField, geoDistributionField } from './shared';

export default defineType({
  name: 'rubro',
  title: 'Rubro',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre',
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
    commonNamesField(),
    defineField({ name: 'description', title: 'Descripción', type: 'text' }),
    cloudinaryMediaField(),
    geoDistributionField(),
  ],
  preview: {
    select: { title: 'name' },
  },
});
