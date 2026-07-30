import { redirect } from 'next/navigation';

/** Catálogo legado sin idioma → hub i18n. */
export default function LegacyCatalogueRedirect() {
  const lang = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'es';
  redirect(`/${lang}/catalogue`);
}
