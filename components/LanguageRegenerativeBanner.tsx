'use client';

// ============================================================================
// Banner de bienvenida i18n: detecta navigator.language en el cliente (la ruta
// ya resolvió el idioma en servidor, esto es sólo una sugerencia) y ofrece
// cambiar a ese idioma. Se oculta solo si ya coincide con el idioma activo o
// si el usuario lo cierra. Sin banderas: nombre del idioma vía Intl.DisplayNames.
// ============================================================================
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import LanguageBadge from './LanguageBadge';
import styles from './LanguageRegenerativeBanner.module.css';

interface Props {
  lang: string;
  strings: Record<string, string>;
}

function baseTag(code: string): string {
  return code.split('-')[0].toLowerCase();
}

function displayName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default function LanguageRegenerativeBanner({ lang, strings }: Props) {
  const [detected, setDetected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Helper i18n cliente: lee del mapa serializable resuelto en servidor.
  const t = (key: string, fallback: string) => strings[key] ?? fallback;

  useEffect(() => {
    const nav = typeof navigator !== 'undefined' ? navigator.language : null;
    if (nav && baseTag(nav) !== baseTag(lang)) setDetected(nav);
  }, [lang]);

  if (!detected || dismissed) return null;

  const name = displayName(detected);

  const switchLanguage = () => {
    document.cookie = `NEXT_LOCALE=${encodeURIComponent(detected)}; path=/; max-age=31536000; samesite=lax`;
    const rest = (pathname ?? `/${lang}`).split('/').slice(2).join('/');
    router.push(`/${detected}${rest ? `/${rest}` : ''}`);
  };

  return (
    <div className={styles.banner} role="region" aria-label={t('lang_banner.aria', 'Sugerencia de idioma')}>
      <p className={styles.text}>
        <LanguageBadge code={detected} size="sm" />
        {t('lang_banner.message_before', 'Este catálogo está disponible en')}{' '}
        <span className={styles.highlight}>{name}</span>{' '}
        {t('lang_banner.message_after', 'y en más de 220 idiomas adicionales.')}
      </p>

      <div className={styles.actions}>
        <button onClick={switchLanguage} className={styles.button}>
          {t('lang_banner.cta', 'Cambiar a')} {name}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t('lang_banner.dismiss', 'Cerrar aviso')}
          className={styles.dismiss}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
