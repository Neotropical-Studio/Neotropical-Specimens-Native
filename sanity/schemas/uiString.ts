// sanity/schemas/uiString.ts
// Cadena de interfaz traducible (chrome de la UI: botones, etiquetas, avisos).
// El contenido del espécimen se localiza en sus propios campos; esto cubre el
// texto estático de la aplicación. Se consume vía lib/i18n/strings.ts.
//
// Modelo: un documento por CLAVE (ej: product.add_to_cart) con un arreglo de
// valores por locale. Las traducciones ausentes las completa el fallback de
// traducción automática (lib/i18n/translate.ts) en runtime.
import { defineType, defineField, defineArrayMember } from 'sanity';
import { TranslateIcon } from '@sanity/icons';

const BCP47 = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export default defineType({
  name: 'uiString',
  title: 'Cadena de UI (i18n)',
  type: 'document',
  icon: TranslateIcon,
  fields: [
    defineField({
      name: 'key',
      title: 'Clave',
      type: 'string',
      description: 'Identificador estable con puntos. Ej: product.add_to_cart, badges.rarity.',
      validation: (rule) =>
        rule.required().custom((v: string | undefined) =>
          !v || /^[a-z0-9_]+(\.[a-z0-9_]+)*$/.test(v)
            ? true
            : 'Usa minúsculas separadas por puntos (ej: product.add_to_cart)',
        ),
    }),
    defineField({
      name: 'sourceText',
      title: 'Texto Fuente (idioma por defecto)',
      type: 'string',
      description: 'Base desde la que se traduce automáticamente si falta un locale.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'values',
      title: 'Traducciones',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'locale',
              title: 'Locale (BCP-47)',
              type: 'string',
              validation: (rule) =>
                rule.required().custom((v: string | undefined) =>
                  !v || BCP47.test(v) ? true : 'Código BCP-47 inválido',
                ),
            }),
            defineField({ name: 'text', title: 'Texto', type: 'string' }),
          ],
          preview: { select: { title: 'text', subtitle: 'locale' } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'key', subtitle: 'sourceText' },
  },
});
