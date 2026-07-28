'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SecureMediaViewer from '@/components/SecureMediaViewer'

// Refleja la tabla `taxonomy` (singular) tal como existe en el proyecto de
// Supabase en vivo. `specimens.taxonomy_id` es una Foreign Key real hacia
// `taxonomy.id` (confirmado vía el schema de PostgREST). No usar variantes
// en plural: no tienen ninguna relación configurada desde `specimens`.
interface Taxonomy {
  id: string
  species_id: string | null
  species_name: string | null
  author: string | null
  genus_name: string | null
  subfamily_name: string | null
  family_name: string | null
  order_name: string | null
  classification_type: string | null
  created_at: string
  rank_hierarchy: string | null
}

// Refleja las columnas reales de `specimens` en el proyecto de Supabase en
// vivo, más la relación embebida `taxonomy` producida por
// `.select('*, taxonomy(*)')`.
interface Specimen {
  id: string
  species_name: string
  author: string | null
  media_url: string | null
  created_at: string
  taxonomy_id: string | null
  region_id: string | null
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
          .returns<Specimen[]>()

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
    <main className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {specimens.map((specimen) => {
          const taxonLabel = [specimen.taxonomy?.family_name, specimen.taxonomy?.genus_name]
            .filter(Boolean)
            .join(' · ')

          return (
            <div key={specimen.id} className="flex flex-col items-center bg-gray-900 p-4 rounded">
              <SecureMediaViewer
                type="image"
                mediaUrl={specimen.media_url ?? ''}
                specimenName={specimen.species_name}
              />
              <h2 className="text-white mt-2">{specimen.species_name}</h2>
              {specimen.author && <p className="text-gray-500 text-sm">{specimen.author}</p>}
              {taxonLabel && <p className="text-gray-400">{taxonLabel}</p>}
            </div>
          )
        })}
      </div>
    </main>
  )
}
