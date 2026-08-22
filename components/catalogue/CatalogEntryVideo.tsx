'use client';

interface CatalogEntryVideoProps {
  mediaCode: string;
  posterCode?: string;
  className?: string;
}

export default function CatalogEntryVideo({ mediaCode, posterCode, className = '' }: CatalogEntryVideoProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!mediaCode) return null;

  const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,vc_h264/catalogo/videos/${mediaCode}.mp4`;
  const posterUrl = posterCode 
    ? `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/catalogo/especimenes/${posterCode}`
    : undefined;

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-black ${className}`}>
      <video
        src={videoUrl}
        poster={posterUrl}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
