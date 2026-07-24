'use client';

import { createElement, useEffect, useState } from 'react';
import Script from 'next/script';
import { modelUrl, imageUrl } from '@/lib/cloudinary/url';

const MODEL_VIEWER_SRC =
  'https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

// Visor 3D camaleónico: carga el web component sólo cuando se monta (portada
// ligera) y sirve el .glb a través del proxy silencioso de Cloudinary.
export default function ModelViewer({
  publicId,
  posterPublicId,
  alt,
  className,
}: {
  publicId: string;
  posterPublicId?: string | null;
  alt: string;
  className?: string;
}) {
  const [ready, setReady] = useState(
    typeof window !== 'undefined' && 'customElements' in window
      ? !!window.customElements.get('model-viewer')
      : false,
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && window.customElements?.get('model-viewer')) {
      setReady(true);
    }
  }, []);

  return (
    <div className={className}>
      <Script
        type="module"
        src={MODEL_VIEWER_SRC}
        strategy="lazyOnload"
        onReady={() => setReady(true)}
      />
      {ready
        ? createElement('model-viewer', {
            src: modelUrl(publicId),
            poster: posterPublicId ? imageUrl(posterPublicId, ['w_800']) : undefined,
            alt,
            'camera-controls': true,
            'auto-rotate': true,
            'auto-rotate-delay': 0,
            'rotation-per-second': '20deg',
            'shadow-intensity': '1',
            'environment-image': 'neutral',
            exposure: '1.1',
            'interaction-prompt': 'none',
            loading: 'eager',
            reveal: 'auto',
            style: { width: '100%', height: '100%', backgroundColor: 'transparent' },
          })
        : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
            Cargando modelo 3D…
          </div>
        )}
    </div>
  );
}
