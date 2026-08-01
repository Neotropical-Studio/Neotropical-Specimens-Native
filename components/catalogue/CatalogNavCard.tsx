'use client';

// Card de navegación del catálogo (rubro / categoría / familia).
// Familias: cover en card; el video de entrada se reproduce en FamilyIntroGate.
import Link from 'next/link';
import Image from 'next/image';
import { catalogCardImageUrl } from '@/lib/cloudinary/url';
import type { CatalogueNavNode } from '@/lib/specimens/catalogueNav';

interface Props {
  node: CatalogueNavNode;
  href: string;
  /** En familias: indica que hay video de entrada (badge); no autoplay en card. */
  showCardVideo?: boolean;
  childLabel?: string;
  /** Hex camaleónico opcional (tinte regenerativo). */
  chameleonHex?: string;
}

export default function CatalogNavCard({
  node,
  href,
  showCardVideo = false,
  childLabel = 'ítems',
  chameleonHex,
}: Props) {
  const cover =
    node.coverPublicId
      ? catalogCardImageUrl(node.coverPublicId, { width: 720, chameleonHex })
      : null;
  const hasVideo = showCardVideo && Boolean(node.videoPublicId?.trim());

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 transition hover:border-emerald-500/35 hover:bg-neutral-900/80"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width:768px) 100vw, 33vw"
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/30">
            Sin imagen
          </div>
        )}
        {hasVideo ? (
          <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/85">
            Video
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight text-white group-hover:text-emerald-200">
          {node.label}
        </h2>
        <p className="text-xs text-white/45">
          {node.count} {childLabel}
          {hasVideo ? ' · intro' : ''}
        </p>
      </div>
    </Link>
  );
}
