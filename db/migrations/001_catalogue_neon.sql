CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS global_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  region_name text,
  country text,
  locality text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS especimenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  scientific_name text NOT NULL,
  common_name text,
  specimen_kind text NOT NULL DEFAULT 'dried_specimen',
  order_name text,
  family text,
  subfamily text,
  genus text,
  species text,
  subspecies text,
  category_id uuid,
  region_id uuid REFERENCES global_regions(id) ON DELETE SET NULL,
  category text,
  region text,
  country text,
  locality text,
  gps text,
  sex text,
  grade text,
  dominant_color text,
  dimensions text,
  weight_grams numeric,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  retail_price numeric NOT NULL CHECK (retail_price >= 0),
  wholesale_price numeric CHECK (wholesale_price IS NULL OR wholesale_price >= 0),
  wholesale_min_qty integer,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'OUT_OF_STOCK',
  description text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS especimen_medios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specimen_id uuid NOT NULL REFERENCES especimenes(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image',
  media_url text,
  public_id text,
  display_order integer NOT NULL DEFAULT 0,
  view_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS especimenes_family_idx ON especimenes (lower(trim(family)));
CREATE INDEX IF NOT EXISTS especimenes_category_idx ON especimenes (lower(trim(category)));
CREATE INDEX IF NOT EXISTS especimenes_region_idx ON especimenes (lower(trim(region)));
CREATE INDEX IF NOT EXISTS especimen_medios_specimen_idx ON especimen_medios (specimen_id, display_order);

ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS common_name text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
