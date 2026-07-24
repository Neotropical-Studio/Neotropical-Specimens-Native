'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Play, X, MapPin, Ruler } from 'lucide-react';
import { imageUrl, videoMp4 } from '@/lib/cloudinary/url';
import type { SpecimenView } from '@/lib/specimens/view';
import ModelViewer from './ModelViewer';

const SEX_LABEL: Record<string, string> = {
  M: '♂ Macho', F: '♀ Hembra', P: 'Pareja', EP: 'Ex-pupa', S: 'Set',
};

export default function SpecimenCard({ s }: { s: SpecimenView }) {
  const [hover, setHover] = useState(false);
  const [viewer, setViewer] = useState<null | '3d' | 'video'>(null);

  const front = s.primaryImage ? imageUrl(s.primaryImage, ['w_640', 'ar_1', 'c_fill']) : null;
  const back = s.secondaryImage ? imageUrl(s.secondaryImage, ['w_640', 'ar_1', 'c_fill']) : null;
  const shown = hover && back ? back : front;

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-sm transition-colors hover:border-emerald-400/40"
      >
        {/* Media */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-950">
          {shown ? (
            <Image
              src={shown}
              alt={s.scientificName}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-600">Sin imagen</div>
          )}

          {/* Badges superiores */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {s.grade && (
              <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-xs font-bold text-amber-950">
                {s.grade}
              </span>
            )}
            {s.regionCode && (
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-emerald-300 backdrop-blur">
                {s.regionCode}
              </span>
            )}
          </div>

          {/* Acciones media (3D / video) */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {s.model3d && (
              <button
                onClick={() => setViewer('3d')}
                aria-label="Ver modelo 3D"
                className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-emerald-300 backdrop-blur transition hover:bg-emerald-500 hover:text-white"
              >
                <Box size={16} />
              </button>
            )}
            {s.video && (
              <button
                onClick={() => setViewer('video')}
                aria-label="Ver video 360°"
                className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-emerald-300 backdrop-blur transition hover:bg-emerald-500 hover:text-white"
              >
                <Play size={16} />
              </button>
            )}
          </div>

          {/* Swatches de color */}
          {s.colors.length > 0 && (
            <div className="absolute bottom-3 left-3 flex gap-1">
              {s.colors.slice(0, 4).map((c, i) => (
                <span
                  key={i}
                  title={c}
                  className="h-3 w-3 rounded-full border border-white/40"
                  style={{ backgroundColor: colorHint(c) }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            {s.family ?? 'taxón'} · {s.code}
          </div>
          <h3 className="text-base font-bold italic leading-tight text-white">{s.scientificName}</h3>
          {s.commonName && <p className="-mt-1 text-sm text-neutral-400">{s.commonName}</p>}

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
            {s.sex && <span>{SEX_LABEL[s.sex] ?? s.sex}</span>}
            {s.wingspanMm && (
              <span className="inline-flex items-center gap-1">
                <Ruler size={12} /> {s.wingspanMm} mm
              </span>
            )}
            {s.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {s.country}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between pt-3">
            <div>
              {s.price != null ? (
                <span className="text-lg font-bold text-emerald-300">
                  {s.currency} {s.price.toFixed(2)}
                </span>
              ) : (
                <span className="text-sm text-neutral-500">Consultar</span>
              )}
            </div>
            <span className={`text-xs font-medium ${s.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.stock > 0 ? `${s.stock} en stock` : 'Agotado'}
            </span>
          </div>
        </div>
      </motion.article>

      {/* Modal visor */}
      <AnimatePresence>
        {viewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"
            onClick={() => setViewer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div>
                  <h4 className="font-bold italic text-white">{s.scientificName}</h4>
                  <p className="text-xs text-neutral-500">
                    {viewer === '3d' ? 'Modelo 3D interactivo' : 'Video 360°'} · {s.code}
                  </p>
                </div>
                <button
                  onClick={() => setViewer(null)}
                  aria-label="Cerrar"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="aspect-video w-full bg-gradient-to-br from-neutral-900 to-black">
                {viewer === '3d' && s.model3d ? (
                  <ModelViewer
                    publicId={s.model3d}
                    posterPublicId={s.primaryImage}
                    alt={s.scientificName}
                    className="h-full w-full"
                  />
                ) : viewer === 'video' && s.video ? (
                  <video
                    src={videoMp4(s.video)}
                    poster={s.primaryImage ? imageUrl(s.primaryImage, ['w_1200']) : undefined}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Mapea nombres de color comunes (ES) a un hint hex para el swatch.
function colorHint(name: string): string {
  const map: Record<string, string> = {
    azul: '#2563eb', negro: '#111827', blanco: '#f8fafc', rojo: '#dc2626',
    verde: '#16a34a', amarillo: '#eab308', naranja: '#ea580c', marron: '#78350f',
    marrón: '#78350f', gris: '#6b7280', morado: '#7c3aed', violeta: '#7c3aed',
    turquesa: '#06b6d4', dorado: '#d4af37', plateado: '#cbd5e1',
  };
  return map[name.toLowerCase()] ?? '#64748b';
}
