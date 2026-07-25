// app/studio/[[...tool]]/page.tsx — server shell (metadata sólo se puede
// exportar desde un server component); el Studio en sí vive en Studio.tsx
// ('use client') para no cruzar funciones por el límite servidor/cliente.
// 'studio' ya está reservado en middleware.ts para que nunca se le anteponga
// un segmento de idioma.
import Studio from './Studio';

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  return <Studio />;
}
