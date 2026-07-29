-- ============================================================================
-- Datos nativos de Morpho godarty didius tingomarensis
-- (Cuenca Amazónica • Tingo María, Perú). Sólo este ejemplar.
-- ============================================================================

update taxonomy
set
  order_name = 'Lepidoptera',
  family_name = 'Morphidae',
  subfamily_name = 'Morphinae',
  genus_name = 'Morpho',
  species_name = 'Morpho godarty didius tingomarensis',
  rank_hierarchy = 'Morphidae > Morphinae > Morpho > Morpho godarty didius tingomarensis'
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

-- Atributos comerciales / ficha del ejemplar Morpho (id fijo).
update specimens
set
  species_name = 'Morpho godarty didius tingomarensis',
  catalog_code = 'NEO-MORPHO-TINGO-01',
  stock = 3,
  price_amount = 260,
  currency = 'USD',
  attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object(
    'sex', 'M',
    'grade_code', 'A1',
    'grade_name', 'A.1',
    'common_name', 'Morpho azul de Tingo María',
    'primary_colors', jsonb_build_array('Azul Iridiscente'),
    'gps_coordinates', '-9.3000, -76.0028',
    'country_origin', 'Perú',
    'description',
      'Ejemplar de Morpho godarty didius tingomarensis con coloración azul iridiscente, procedente de la Cuenca Amazónica • Tingo María, Perú.'
  ),
  pricing = coalesce(pricing, '{}'::jsonb) || jsonb_build_object(
    'retail_price', 260,
    'wholesale_price', 180,
    'wholesale_min_qty', 5,
    'currency', 'USD'
  )
where id = 'd20ad72d-7957-405a-ada8-53a320009e03';

-- Multimedia Morpho: dorsal + ventral/reverso (Cloudinary).
insert into specimen_media (specimen_id, media_type, media_url, public_id, display_order)
values
  (
    'd20ad72d-7957-405a-ada8-53a320009e03',
    'image',
    'https://res.cloudinary.com/juufg4mn/image/upload/MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_dwd53c',
    'MORPHO_GODARTY_DIDIUS_TINGOMARIENSIS_dwd53c',
    0
  ),
  (
    'd20ad72d-7957-405a-ada8-53a320009e03',
    'image',
    'https://res.cloudinary.com/juufg4mn/image/upload/Morpho_gadrty_didius_tingomarensis_yomszy',
    'Morpho_gadrty_didius_tingomarensis_yomszy',
    1
  )
on conflict do nothing;
