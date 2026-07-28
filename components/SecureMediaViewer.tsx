import React from 'react'

interface SecureMediaViewerProps {
  mediaUrl?: string
  specimenName?: string
  type?: 'image' | 'video' | '3d'
}

export default function SecureMediaViewer({ mediaUrl = '', specimenName = '', type = 'image' }: SecureMediaViewerProps) {
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    alert('Contenido protegido por derechos de propiedad intelectual.')
  }

  return (
    <div 
      className="relative overflow-hidden rounded-xl shadow-2xl bg-black border border-zinc-800 select-none"
      onContextMenu={handleContextMenu}
      style={{ width: '100%', maxWidth: '600px', height: '400px' }}
    >
      <div className="absolute inset-0 z-10 pointer-events-auto bg-transparent" />

      {!mediaUrl && (
        <div className="flex h-full w-full items-center justify-center text-zinc-600 text-sm">
          Sin contenido multimedia
        </div>
      )}

      {mediaUrl && type === 'image' && (
        <img 
          src={mediaUrl} 
          alt={specimenName}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      )}

      {mediaUrl && type === 'video' && (
        <video 
          src={mediaUrl} 
          className="w-full h-full object-cover pointer-events-none"
          controls={false}
          autoPlay
          loop
          muted
        />
      )}

      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-4 text-white">
        <span className="font-bold text-sm block">{specimenName}</span>
        <span className="text-xs text-zinc-400">Protegido contra descargas y bots</span>
      </div>
    </div>
  )
}
