export interface Specimen {
  id: string | number;
  scientific_name: string;
  common_name: string | null;
  family: string;
  category: 'Especímenes secos biológicos' | 'Esqueletos de zoología' | 'Plantas secas no-CITES' | string;
  region: string;
  image_url: string;
  stock: number;
  status: 'active' | 'archived';
  created_at: string;
}

export interface CollectionStats {
  total_specimens: number;
  total_families: number;
  total_regions: number;
}

export interface CategorySummary {
  category: string;
  total_items: number;
  total_stock: number;
}