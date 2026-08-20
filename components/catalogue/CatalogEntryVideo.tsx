'use client';

// Video de entrada corto (Cloudinary). Si no hay public_id, no renderiza nada.
import { useState } from 'react';
import { videoMp4, videoPoster } from '@/lib/cloudinary/url';

interface Props {
  videoPublicId: string | null | undefined;
  title?: string;
  /** hero = banda ancha; card = relleno del marco. */
  variant?: 'hero' | 'card';
  className?: string;
  /** Por defecto true (decorativo). Intro de familia: false + onEnded. */
  loop?: boolean;
  onEnded?: () => void;
  onError?: () => void;
}

export default function CatalogEntryVideo({
  videoPublicId,
  title,
  variant = 'hero',
  className = '',
  loop = true,
  onEnded,
  onError,
}: Props) {
  const [failed, setFailed] = useState(false);
  const id = typeof videoPublicId === 'string' ? videoPublicId.trim() : '';
  if (!id || failed) return null;

  const src = videoMp4(id);
  const poster = videoPoster(id);
  if (!src) return null;

  const frame =
    variant === 'hero'
      ? 'relative aspect-[21/9] w-full overflow-hidden bg-neutral-950'
      : 'relative h-full w-full overflow-hidden bg-neutral-950';

  return (
    <div className={`${frame} ${className}`.trim()}>
      <video preload="none"
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop={loop}
        playsInline
       
        poster={poster || undefined}
        aria-label={title ? `Video: ${title}` : 'Video de entrada'}
        onEnded={onEnded}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
