import { sql } from '@/lib/db';
import type { SpecimenView } from './view';

export async function loadCatalogueSpecimens(): Promise<{
  specimens: SpecimenView[];
  error: string | null;
}> {
  try {
    const specimens = (await sql`
      SELECT 
        id,
        code,
        species_name as "speciesName",
        scientific_name as "scientificName",
        common_name as "commonName",
        family,
        family_id as "family_id",
        category_id,
        region_id,
        rubro_id,
        country,
        cover_public_id as "coverPublicId",
        video_public_id as "videoPublicId",
        price
      FROM especies_clean;
    `) as unknown as SpecimenView[];

    if (specimens.length === 0) {
      console.error('El catálogo no contiene especímenes.');
      return { specimens: [], error: 'Catálogo vacío' };
    }

    return { specimens, error: null };
  } catch (error: unknown) {
    console.error('Error al cargar catálogo:', error);
    const message = error instanceof Error ? error.message : 'Error en DB';
    return { specimens: [], error: message };
  }
}
