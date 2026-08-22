'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SpecimenImageProps {
  code: string;
  alt: string;
  className?: string;
}

export function SpecimenImage({ code, alt, className = '' }: SpecimenImageProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  const primarySrc = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/catalogo/especimenes/${code}`;
  const fallbackSrc = '/placeholder.webp';

  const [imgSrc, setImgSrc] = useState(primarySrc);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
}
