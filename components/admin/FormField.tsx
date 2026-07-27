// Envoltorio de campo + clases compartidas para inputs/selects/textarea del
// panel admin. Tailwind plano, sin theming camaleónico (herramienta interna).
export const inputClass =
  'rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50';

export const buttonPrimaryClass =
  'inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50';

export const buttonSecondaryClass =
  'inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white';

interface Props {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}

export default function FormField({ label, htmlFor, error, hint, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
