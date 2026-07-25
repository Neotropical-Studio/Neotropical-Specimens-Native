'use client';

// El config de Sanity (validaciones, hidden(), preview.prepare…) tiene
// funciones — RSC no puede serializarlas de servidor a cliente. Por eso el
// import de sanity.config vive ENTERO dentro de este client component, y
// page.tsx (server) nunca lo recibe como prop.
import { NextStudio } from 'next-sanity/studio';
import config from '../../../sanity.config';

export default function Studio() {
  return <NextStudio config={config} />;
}
