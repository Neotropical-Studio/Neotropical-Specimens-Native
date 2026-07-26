import Image from 'next/image';
import { Languages } from 'lucide-react';

interface Props {
  code: string;
  label?: string;
  // URL definitiva (Cloudinary) del glifo/bandera del idioma. Vector propio
  // (no bandera) mientras no se defina: misma caja fija en ambos casos.
  imageSrc?: string | null;
  size?: 'sm' | 'md';
}

const DIMENSIONS = {
  sm: { box: 'h-5 w-5', icon: 11 },
  md: { box: 'h-8 w-8', icon: 16 },
} as const;

export default function LanguageBadge({ code, label, imageSrc, size = 'sm' }: Props) {
  const dims = DIMENSIONS[size];
  const title = label ?? code;

  return (
    <span
      className={`relative inline-flex ${dims.box} shrink-0 items-center justify-center rounded-full bg-sky-400/10 ring-1 ring-inset ring-sky-400/25`}
      title={title}
      aria-label={title}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="32px"
          className="rounded-full object-cover"
          unoptimized
        />
      ) : (
        <Languages size={dims.icon} className="text-sky-300" strokeWidth={2} />
      )}
    </span>
  );
}
