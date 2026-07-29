-- ============================================================================
-- Datos nativos de Morpho godarty didius tingomarensis
-- (Cuenca Amazónica • Tingo María, Perú). Sólo este ejemplar.
-- ============================================================================

update taxonomy
set
  order_name = 'Lepidoptera',
  family_name = 'Nymphalidae',
  subfamily_name = 'Morphinae',
  genus_name = 'Morpho',
  species_name = 'Morpho godarty didius tingomarensis',
  rank_hierarchy = 'Nymphalidae > Morphinae > Morpho > Morpho godarty didius tingomarensis'
where id = 'dc96a9af-b96c-44bc-98f3-b3bf6a75322c'
  and species_name ilike '%godarty didius tingomarensis%';

update global_regions
set
  country = 'PE',
  name = 'Tingo María',
  locality = 'Cuenca Amazónica • Tingo María',
  region_name = 'Cuenca Amazónica • Tingo María',
  gps_coordinates = '-9.3000, -76.0028',
  altitude = '650 m'
where id = '2139d8d7-82a2-4775-b5ea-b315eeaa762c';
