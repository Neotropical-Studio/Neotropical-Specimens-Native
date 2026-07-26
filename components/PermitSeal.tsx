import Image from 'next/image';
import { FileCheck2, Leaf, ShieldCheck, TreePine, type LucideIcon } from 'lucide-react';

export type PermitCode = 'CITES' | 'VUCE' | 'SENASA' | 'SERFOR';

const ICON: Record<PermitCode, LucideIcon> = {
  CITES: ShieldCheck,
  VUCE: FileCheck2,
  SENASA: Leaf,
  SERFOR: TreePine,
};

interface Props {
  code: PermitCode;
  label?: string;
  // URL definitiva (Cloudinary) del sello oficial. Sin ella se muestra el
  // vector por defecto: mismo tamaño de caja en ambos casos, así que subir la
  // imagen real más tarde no mueve ni un píxel del layout.
  imageSrc?: string | null;
  size?: 'sm' | 'md';
}

const DIMENSIONS = {
  sm: { box: 'h-6 w-6', icon: 11 },
  md: { box: 'h-10 w-10', icon: 17 },
} as const;

export default function PermitSeal({ code, label, imageSrc, size = 'sm' }: Props) {
  const Icon = ICON[code];
  const dims = DIMENSIONS[size];
  const title = label ?? code;

  return (
    <span
      className={`relative inline-flex ${dims.box} shrink-0 items-center justify-center rounded-full`}
      title={title}
      aria-label={title}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="40px"
          className="rounded-full object-cover"
          unoptimized
        />
      ) : (
        <>
          <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
            <circle
              cx="20"
              cy="20"
              r="18.5"
              fill="rgba(16,185,129,0.08)"
              stroke="rgba(16,185,129,0.35)"
              strokeWidth="1.5"
            />
            <circle
              cx="20"
              cy="20"
              r="14.5"
              fill="none"
              stroke="rgba(16,185,129,0.18)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
          </svg>
          <Icon size={dims.icon} className="relative text-emerald-400" strokeWidth={2} />
        </>
      )}
    </span>
  );
}
