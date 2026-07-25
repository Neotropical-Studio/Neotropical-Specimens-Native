// sanity/schemas/siteSettings.ts
// Singleton de configuración global: define el conjunto de idiomas habilitados
// (i18n escalable a 220+) y el locale por defecto. La app lo consume en runtime
// vía lib/i18n/locales.ts — nunca se hardcodea la lista de idiomas en el código.
import { defineType, defineField, defineArrayMember } from 'sanity';
import { CogIcon } from '@sanity/icons';

// BCP-47: 'en', 'es', 'zh-CN', 'pt-BR', 'ar', … (subetiquetas separadas por guion).
const BCP47 = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export default defineType({
  name: 'siteSettings',
  title: 'Configuración Global',
  type: 'document',
  icon: CogIcon,
  // Singleton: se restringe a un único documento desde la estructura del Studio.
  fields: [
    defineField({
      name: 'title',
      title: 'Título del Sitio',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'defaultLocale',
      title: 'Idioma por Defecto (BCP-47)',
      type: 'string',
      description: 'Fallback global cuando no hay traducción ni coincidencia geo. Ej: en, es.',
      validation: (rule) =>
        rule.required().custom((v: string | undefined) =>
          !v || BCP47.test(v) ? true : 'Código BCP-47 inválido (ej: en, es, zh-CN)',
        ),
    }),
    defineField({
      name: 'enabledLocales',
      title: 'Idiomas Habilitados (BCP-47)',
      type: 'array',
      description:
        'Conjunto de idiomas expuestos en las rutas /[lang]/…. Editable sin desplegar código. ' +
        'Los que no estén aquí caen al idioma por defecto.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'code',
              title: 'Código (BCP-47)',
              type: 'string',
              validation: (rule) =>
                rule.required().custom((v: string | undefined) =>
                  !v || BCP47.test(v) ? true : 'Código BCP-47 inválido',
                ),
            }),
            defineField({ name: 'label', title: 'Nombre nativo', type: 'string' }),
            defineField({
              name: 'dir',
              title: 'Dirección',
              type: 'string',
              options: {
                list: [
                  { title: 'Izq→Der (LTR)', value: 'ltr' },
                  { title: 'Der→Izq (RTL)', value: 'rtl' },
                ],
                layout: 'radio',
              },
              initialValue: 'ltr',
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'code' } },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'branding',
      title: 'Identidad Visual (Cloudinary Public IDs)',
      type: 'object',
      fields: [
        defineField({ name: 'logo', title: 'Logo', type: 'string' }),
        defineField({ name: 'banner', title: 'Banner', type: 'string' }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', def: 'defaultLocale' },
    prepare({ title, def }) {
      return { title: title ?? 'Configuración Global', subtitle: `Default: ${def ?? '—'}` };
    },
  },
});
