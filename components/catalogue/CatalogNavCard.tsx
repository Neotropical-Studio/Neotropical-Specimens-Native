'use client';

import Link from 'next/link';
import Image from 'next/image';

interface CatalogNavCardProps {
  title: string;
  href: string;
  imageCode?: string;
  subtitle?: string;
}

export default function CatalogNavCard({ title, href, imageCode, subtitle }: CatalogNavCardProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const imageUrl = imageCode 
    ? `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/catalogo/especimenes/${imageCode}`
    : null;

  return (
    <Link
      href={href}
      className="group flex flex-col justify-end relative h-64 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-emerald-500 transition-all p-5"
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-70 group-hover:opacity-100"
        />
      )}
      <div className="relative z-10">
        <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
