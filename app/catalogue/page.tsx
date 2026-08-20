import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/** Catálogo legado sin idioma - hud i18n. */
export default async function LegacyCatalogueRedirect() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || 'es';
  const browserLang = acceptLanguage.split(',')[0].split('-')[0];
  
  // Detecta si el navegador es español o usa 'es' por defecto
  const lang = ['es', 'en'].includes(browserLang) ? browserLang : 'es';

  redirect(`/${lang}/catalogue`);
}