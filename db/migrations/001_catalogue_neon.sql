CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS global_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text,
  region_name text,
  country text,
  locality text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE global_regions ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE global_regions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE global_regions ADD COLUMN IF NOT EXISTS region_name text;
ALTER TABLE global_regions ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE global_regions ADD COLUMN IF NOT EXISTS locality text;
ALTER TABLE global_regions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

INSERT INTO global_regions (code, name, region_name)
SELECT defaults.code, defaults.code, defaults.code
FROM (VALUES ('NEO-SA'), ('AFR'), ('AUS'), ('EUR'), ('NA')) AS defaults(code)
WHERE NOT EXISTS (
  SELECT 1
  FROM global_regions existing
  WHERE lower(trim(coalesce(existing.code, existing.name, existing.region_name, ''))) = lower(trim(defaults.code))
);

CREATE TABLE IF NOT EXISTS especimenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  scientific_name text NOT NULL,
  nombre_cientifico text NOT NULL,
  common_name text,
  nombre_comun text,
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

ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS specimen_id uuid;
ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS public_id text;
ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS view_name text;
ALTER TABLE especimen_medios ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS especimenes_family_idx ON especimenes (lower(trim(family)));
CREATE INDEX IF NOT EXISTS especimenes_category_idx ON especimenes (lower(trim(category)));
CREATE INDEX IF NOT EXISTS especimenes_region_idx ON especimenes (lower(trim(region)));
CREATE INDEX IF NOT EXISTS especimen_medios_specimen_idx ON especimen_medios (specimen_id, display_order);

ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS common_name text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS nombre_cientifico text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS nombre_comun text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE especimenes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
