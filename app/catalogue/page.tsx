'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SecureMediaViewer from '@/components/SecureMediaViewer'

interface Specimen {
  id: string
  species_name: string
  author: string
  media_url?: string
}

export default function CataloguePage() {
  const [specimens, setSpecimens] = useState<Specimen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSpecimens() {
      try {
        const { data, error } = await supabase
          .from('species')
          .select('id, species_name, author')
          .limit(10)

        if (error) {
          console.error('Error al consultar Supabase:', error.message)
        } else if (data) {
          setSpecimens(data)
        }
      } catch (err) {
        console.error('Error inesperado:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSpecimens()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-xl animate-pulse">Cargando catálogos protegidos...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Catálogo de Especímenes</h1>
          <p className="text-zinc-400">Sistema de visualización segura de alta fidelidad y protección anti-bots.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {specimens.map((specimen) => (
            <div key={specimen.id} className="flex flex-col items-center">
              <SecureMediaViewer 
                mediaUrl={specimen.media_url || 'https://res.cloudinary.com/demo/image/upload/sample.jpg'}
                specimenName={`${specimen.species_name} ${specimen.author ? `(${specimen.author})` : ''}`}
                type="image"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
