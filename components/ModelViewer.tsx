'use client';

import { createElement, useEffect, useState } from 'react';
import { modelUrl, imageUrl } from '@/lib/cloudinary/url';

// Visor 3D camaleónico: carga el web component sólo cuando se monta (portada
// ligera) y sirve el .glb a través del proxy silencioso de Cloudinary.
//
// El componente se importa del PROPIO bundle (dependencia npm), no de unpkg.com:
// los CDN públicos son inestables o inalcanzables en China continental y una
// etiqueta <script> a un tercero dejaba el visor 3D muerto en toda la región.
// El import dinámico lo mantiene fuera del bundle inicial: sólo se descarga —
// desde nuestro origen — cuando el usuario abre el visor.
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.customElements?.get('model-viewer')) {
      setReady(true);
      return;
    }

    let active = true;
    // Registra <model-viewer> desde el bundle local; si el chunk no llega
    // (red degradada), se muestra el póster en vez de un hueco vacío.
    import('@google/model-viewer')
      .then(() => active && setReady(true))
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, []);

  const poster = posterPublicId ? imageUrl(posterPublicId, ['w_800']) : null;

  // Failover de render: sin el visor, el espécimen sigue viéndose (imagen fija).
  if (failed) {
    return (
      <div className={className}>
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
            {alt}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {ready
        ? createElement('model-viewer', {
            src: modelUrl(publicId),
            poster: poster ?? undefined,
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
