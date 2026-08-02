import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Volver universal — touch-friendly en móvil / tablet / iPad / laptop / PC.
 * min 44px (Apple HIG / Android), safe-area, full-width en pantallas chicas.
 */
export default function CatalogBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex min-h-[44px] w-full max-w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/55 hover:bg-emerald-500/15 hover:text-emerald-100 active:scale-[0.99] sm:mb-4 sm:w-auto sm:justify-start touch-manipulation"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 truncate text-left">{label}</span>
    </Link>
  );
}
