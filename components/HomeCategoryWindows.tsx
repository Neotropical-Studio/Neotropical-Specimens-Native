'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
}

interface Props {
  categories?: Category[];
  lang: string;
}

export default function HomeCategoryWindows({ categories = [], lang }: Props) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {categories.map((cat) => {
        const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/catalogo/rubros/${cat.slug}`;

        return (
          <Link
            key={cat.id}
            href={`/${lang}/catalogue/${cat.slug}`}
            className="group relative h-80 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 transition-all duration-300"
          >
            <Image
              src={imageUrl}
              alt={cat.name || 'Categoría'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                {cat.name}
              </h3>
              <p className="text-sm text-neutral-400 font-mono mt-1">
                {cat.itemCount ?? 0} ítems
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
