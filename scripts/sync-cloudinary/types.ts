export interface CloudinaryResourceInfo {
  publicId: string;
  secureUrl: string;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
  folder: string;
  bytes: number;
  createdAt: string;
  context?: Record<string, string>;
  tags?: string[];
}

export interface FolderNode {
  path: string;
  name: string;
  children: FolderNode[];
  resources: CloudinaryResourceInfo[];
}

export type TaxonRank =
  | 'region'
  | 'family'
  | 'subfamily'
  | 'tribe'
  | 'genus'
  | 'species'
  | 'binomial'
  | 'trinomial'
  | 'unknown';

export interface SegmentClassification {
  kind: TaxonRank;
  /** Para 'binomial'/'trinomial', value es "Genero|especie[|subespecie]". Para el resto, el nombre resuelto. */
  value: string;
  raw: string;
}

/** Estado taxonómico acumulado mientras se recorre una rama del árbol de carpetas. Todo opcional: aún puede estar incompleto. */
export interface TaxonContext {
  regionName?: string;
  familyName?: string;
  subfamilyName?: string;
  genusName?: string;
  speciesName?: string;
  subspeciesName?: string;
  orderName?: string;
}

/**
 * Cadena genealógica ya validada como completa: región → familia → género →
 * especie son obligatorios. Subfamilia y subespecie son las dos ramas
 * opcionales (la estructura real de Cloudinary no siempre tiene un nivel de
 * subfamilia — ver classifier.ts::missingRequiredLevels). Ningún
 * `ClassifiedLeaf` existe sin cumplir el mínimo obligatorio — ver
 * `isCompleteContext` en classifier.ts, que es el único lugar donde se
 * construye este tipo.
 */
export interface CompleteTaxonContext {
  regionName: string;
  familyName: string;
  subfamilyName?: string;
  genusName: string;
  speciesName: string;
  subspeciesName?: string;
  orderName?: string;
}

export interface SpecimenGroup {
  /** Clave derivada del nombre de archivo (sin sufijos de vista/índice) que agrupa fotos del mismo individuo. */
  groupKey: string;
  resources: CloudinaryResourceInfo[];
}

export interface ClassifiedLeaf {
  folderPath: string;
  context: CompleteTaxonContext;
  specimenGroups: SpecimenGroup[];
}

export interface UnclassifiedFolder {
  folderPath: string;
  reason: string;
  resourceCount: number;
}

export interface DiscoveryReport {
  leaves: ClassifiedLeaf[];
  unclassified: UnclassifiedFolder[];
  regionsFound: Set<string>;
}

export interface SyncStats {
  regions: number;
  families: number;
  subfamilies: number;
  genera: number;
  species: number;
  subspecies: number;
  taxonomyRows: number;
  specimens: number;
  media: number;
  skippedFolders: number;
  errors: { context: string; message: string }[];
}
