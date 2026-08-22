'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface CatalogNavCardProps {
  title: string;
  href: string;
  imageCode?: string;
  subtitle?: string;
}

export default function CatalogNavCard({ title, href, imageCode, subtitle }: CatalogNavCardProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const [imgError, setImgError] = useState(false);

  const imageUrl = imageCode && cloudName && !imgError
    ? `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/catalogo/especimenes/${imageCode}`
    : null;

  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-end h-64 rounded-2xl overflow-hidden bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/50 transition-all duration-300 p-6 shadow-lg hover:shadow-emerald-950/20"
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-85"
          onError={() => setImgError(true)}
        />
      )}
      
      {/* Gradiente oscuro para asegurar legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
          {title || 'Sin Título'}
        </h4>
        {subtitle && (
          <p className="text-xs text-emerald-400/90 font-mono mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
