'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SecureMediaViewer from '@/components/SecureMediaViewer'

interface Taxonomy {
  id: string
  name: string
  scientific_name: string | null
  rank: string
  slug: string
}

interface Specimen {
  id: string
  catalog_code: string
  title: string | null
  description: string | null
  taxonomy_id: string | null
  origin_banner_url: string | null
  taxonomy: Taxonomy | null
}

export default function CataloguePage() {
  const [specimens, setSpecimens] = useState<Specimen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSpecimens() {
      try {
        const { data, error } = await supabase
          .from('specimens')
          .select('*, taxonomy(*)')
          .limit(10)

        if (error) {
          console.error('Error al consultar Supabase:', error.message)
        } else if (data) {
          setSpecimens(data as Specimen[])
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
          {specimens.map((specimen) => {
            const taxonomy = specimen.taxonomy
            const specimenName =
              taxonomy?.scientific_name || taxonomy?.name || specimen.title || specimen.catalog_code

            return (
              <div key={specimen.id} className="flex flex-col items-center">
                <SecureMediaViewer
                  mediaUrl={specimen.origin_banner_url || 'https://res.cloudinary.com/demo/image/upload/sample.jpg'}
                  specimenName={specimenName}
                  type="image"
                />
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
