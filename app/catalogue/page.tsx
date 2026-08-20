import { redirect } from 'next/navigation';

/** Catálogo legado sin idioma → hub i18n. */
export default function LegacyCatalogueRedirect() {
const lang = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'es';
const acceptLanguage = headersList.get('accept-language') || 'es';
const browserLang = acceptLanguage.split(',')[0].split('-')[0];
const lang = ['es', 'en'].includes(browserLang) ? browserLang : 'es';
}
