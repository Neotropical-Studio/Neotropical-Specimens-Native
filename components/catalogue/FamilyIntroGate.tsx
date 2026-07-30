'use client';

// Puerta de entrada por familia: reproduce el video corto de ESA familia y,
// al terminar (o al saltar), abre el catálogo filtrado solo de esa familia.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { imageUrl, videoMp4, videoPoster } from '@/lib/cloudinary/url';

interface Props {
  familyId: string;
  familyLabel: string;
  videoPublicId: string;
  coverPublicId?: string | null;
  /** Destino tras ended/skip (?view=families o ?view=catalog). */
  catalogHref: string;
  skipLabel?: string;
  hintLabel?: string;
  footerLabel?: string;
}

export default function FamilyIntroGate({
  familyId,
  familyLabel,
  videoPublicId,
  coverPublicId,
  catalogHref,
  skipLabel = 'Ver catálogo',
  hintLabel = 'Al terminar el video entrarás al catálogo de esta familia.',
  footerLabel,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const navigated = useRef(false);
  const footer =
    footerLabel ??
    `Catálogo propio: solo especies y subespecies de ${familyLabel}.`;

  const goNext = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace(catalogHref);
  }, [catalogHref, router]);

  useEffect(() => {
    router.prefetch(catalogHref);
  }, [catalogHref, router]);

  useEffect(() => {
    if (failed) goNext();
  }, [failed, goNext]);

  const src = videoMp4(videoPublicId);
  const poster =
    (coverPublicId
      ? imageUrl(coverPublicId, ['w_1280', 'c_fill', 'g_auto', 'q_auto'])
      : null) || videoPoster(videoPublicId) || undefined;

  useEffect(() => {
    if (!src) goNext();
  }, [src, goNext]);

  if (!src) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-white/50">
        Abriendo {familyLabel}…
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-24 pt-6">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">
          {familyId}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {familyLabel}
        </h1>
        <p className="mt-2 text-sm text-white/50">{hintLabel}</p>
      </header>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
        {poster && failed ? (
          <Image src={poster} alt="" fill unoptimized className="object-cover" sizes="100vw" />
        ) : null}
        <video
          ref={videoRef}
          key={`${familyId}:${videoPublicId}`}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={poster}
          aria-label={`Video de entrada: ${familyLabel}`}
          onEnded={goNext}
          onError={() => setFailed(true)}
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goNext}
          className="inline-flex items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
        >
          {skipLabel}
        </button>
        <p className="text-xs text-white/40">{footer}</p>
      </div>
    </div>
  );
}
