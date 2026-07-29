'use client';

// ============================================================================
// Sello / logotipo institucional de un permiso oficial (CITES, VUCE, SENASA,
// SERFOR). Carga el PNG/WebP transparente desde Cloudinary; si el asset aún
// no existe (404), degrada a una etiqueta tipográfica neutra — NUNCA a un
// ícono decorativo inventado que aparente ser la marca oficial.
// ============================================================================
import { useState } from 'react';
import Image from 'next/image';
import { permitLogoUrl, type PermitCode } from '@/lib/cloudinary/permits';

export type { PermitCode };

interface Props {
  code: PermitCode;
  label?: string;
  /** Override opcional (URL completa). Por defecto usa Cloudinary. */
  imageSrc?: string | null;
  size?: 'sm' | 'md';
}

const DIMENSIONS = {
  sm: { box: 'h-7 w-[4.5rem]', sizes: '72px' },
  md: { box: 'h-10 w-28', sizes: '112px' },
} as const;

export default function PermitSeal({ code, label, imageSrc, size = 'sm' }: Props) {
  const [failed, setFailed] = useState(false);
  const dims = DIMENSIONS[size];
  const title = label ?? code;
  const src = imageSrc || permitLogoUrl(code);

  return (
    <span
      className={[
        'group/permit relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        'border border-white/10 bg-white/[0.04] backdrop-blur-sm',
        'transition-all duration-500',
        'hover:border-emerald-400/35 hover:bg-emerald-400/[0.06]',
        'hover:shadow-[0_0_12px_rgba(16,185,129,0.18)]',
        dims.box,
        'px-1.5 py-0.5',
      ].join(' ')}
      title={title}
      aria-label={title}
    >
      {/* Anillo camaleónico sutil: reacciona al hover con tono institucional */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-emerald-400/0 transition duration-500 group-hover/permit:ring-emerald-400/25"
      />

      {src && !failed ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes={dims.sizes}
          className="object-contain p-0.5 opacity-90 transition duration-500 group-hover/permit:opacity-100"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        // Fallback tipográfico: la entidad aún no tiene PNG en Cloudinary.
        // No inventamos un logo falso.
        <span className="relative z-[1] text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">
          {code}
        </span>
      )}
    </span>
  );
}
