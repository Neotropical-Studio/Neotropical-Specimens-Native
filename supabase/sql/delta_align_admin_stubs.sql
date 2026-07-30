-- ============================================================================
-- DELTA · Alinear stubs live → contrato admin (categories / shipments /
-- shipment_permits). ADITIVO e IDEMPOTENTE. NO borra datos.
--
-- Contexto (probe 2026-07-30 service_role):
--   · categories         = taxonomía (category_name, order_id) sin name/slug
--   · shipments          = stub (id, tracking_code, created_at)
--   · shipment_permits   = stub (id, shipment_id, permit_details)
--   · orders             = taxonomía (order_name) — NO tocar (no es e-commerce)
--   · sync_event         = stub (id, created_at) — no crítico para admin hoy
--
-- ANTES o DESPUÉS de este delta, pegar también:
--   supabase/sql/espejo_universal_industrial.sql
-- (specimens contrato + campaigns title/banner + specimen_media espejo +
--  mirror_sync_runs). Ese archivo NO cubre logistics/categories.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. categories — contrato admin (name, slug) sobre taxonomía live
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill desde category_name si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'category_name'
  ) THEN
    EXECUTE $u$
      UPDATE categories
      SET name = coalesce(nullif(btrim(name), ''), nullif(btrim(category_name), ''), 'Sin nombre')
      WHERE name IS NULL OR btrim(name) = ''
    $u$;
  ELSE
    UPDATE categories
    SET name = coalesce(nullif(btrim(name), ''), 'Sin nombre')
    WHERE name IS NULL OR btrim(name) = '';
  END IF;
END $$;

UPDATE categories
SET slug = coalesce(
  nullif(btrim(slug), ''),
  lower(regexp_replace(coalesce(name, 'cat'), '[^a-zA-Z0-9]+', '-', 'g'))
)
WHERE slug IS NULL OR btrim(slug) = '';

ALTER TABLE categories ALTER COLUMN name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug_key
  ON categories (slug) WHERE slug IS NOT NULL;

-- Seed mínimo admin (idempotente por slug). Incluye category_name si la
-- columna live lo exige (NOT NULL sin default).
DO $$
DECLARE
  has_cat_name boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categories' AND column_name='category_name'
  ) INTO has_cat_name;

  IF has_cat_name THEN
    INSERT INTO categories (name, slug, settings, category_name)
    SELECT v.name, v.slug, v.settings::jsonb, v.name
    FROM (VALUES
      ('Polillas', 'polillas', '{"display_mode":"grid"}'),
      ('Escarabajos', 'escarabajos', '{"display_mode":"grid"}'),
      ('Artrópodos', 'artropodos', '{"display_mode":"grid"}'),
      ('Raros y Especiales', 'raros-especiales', '{"display_mode":"grid"}')
    ) AS v(name, slug, settings)
    WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = v.slug);
  ELSE
    INSERT INTO categories (name, slug, settings)
    SELECT v.name, v.slug, v.settings::jsonb
    FROM (VALUES
      ('Polillas', 'polillas', '{"display_mode":"grid"}'),
      ('Escarabajos', 'escarabajos', '{"display_mode":"grid"}'),
      ('Artrópodos', 'artropodos', '{"display_mode":"grid"}'),
      ('Raros y Especiales', 'raros-especiales', '{"display_mode":"grid"}')
    ) AS v(name, slug, settings)
    WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = v.slug);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. shipments — stub → contrato admin (0003)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_code TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_type TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_country TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_customer TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS qr_payload TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS qr_cloudinary_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS updated_at
  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- tracking_code live → shipment_code / tracking_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'tracking_code'
  ) THEN
    EXECUTE $u$
      UPDATE shipments
      SET shipment_code = coalesce(nullif(btrim(shipment_code), ''), nullif(btrim(tracking_code), ''))
      WHERE shipment_code IS NULL OR btrim(shipment_code) = ''
    $u$;
    EXECUTE $u$
      UPDATE shipments
      SET tracking_number = coalesce(nullif(btrim(tracking_number), ''), nullif(btrim(tracking_code), ''))
      WHERE tracking_number IS NULL
    $u$;
  END IF;
END $$;

UPDATE shipments
SET shipment_code = coalesce(
  nullif(btrim(shipment_code), ''),
  'LEGACY-SHP-' || upper(substr(replace(id::text, '-', ''), 1, 8))
)
WHERE shipment_code IS NULL OR btrim(shipment_code) = '';

UPDATE shipments SET shipment_type = coalesce(shipment_type, 'export') WHERE shipment_type IS NULL;
UPDATE shipments SET status = coalesce(status, 'draft') WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_type_check') THEN
    ALTER TABLE shipments ADD CONSTRAINT shipments_type_check
      CHECK (shipment_type IN ('export', 'import'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_status_check') THEN
    ALTER TABLE shipments ADD CONSTRAINT shipments_status_check
      CHECK (status IN ('draft', 'permits_pending', 'ready', 'in_transit', 'delivered', 'cancelled'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE shipments ALTER COLUMN shipment_code SET NOT NULL;
ALTER TABLE shipments ALTER COLUMN shipment_type SET NOT NULL;
ALTER TABLE shipments ALTER COLUMN status SET NOT NULL;
ALTER TABLE shipments ALTER COLUMN shipment_type SET DEFAULT 'export';
ALTER TABLE shipments ALTER COLUMN status SET DEFAULT 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_shipment_code_key ON shipments (shipment_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments (status);
CREATE INDEX IF NOT EXISTS idx_shipments_created ON shipments (created_at DESC);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. shipment_permits — stub → contrato admin (0003)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS permit_code TEXT;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS permit_number TEXT;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS issued_at DATE;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS document_cloudinary_id TEXT;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS created_at
  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE shipment_permits ADD COLUMN IF NOT EXISTS updated_at
  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Backfill suave desde permit_details JSON si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shipment_permits'
      AND column_name = 'permit_details'
  ) THEN
    EXECUTE $u$
      UPDATE shipment_permits
      SET
        permit_code = coalesce(
          nullif(btrim(permit_code), ''),
          nullif(btrim(permit_details->>'permit_code'), ''),
          nullif(btrim(permit_details->>'code'), '')
        ),
        permit_number = coalesce(
          nullif(btrim(permit_number), ''),
          nullif(btrim(permit_details->>'permit_number'), ''),
          nullif(btrim(permit_details->>'number'), '')
        ),
        status = coalesce(
          nullif(btrim(status), ''),
          nullif(btrim(permit_details->>'status'), ''),
          'pending'
        )
      WHERE permit_code IS NULL OR status IS NULL
    $u$;
  END IF;
END $$;

UPDATE shipment_permits SET status = coalesce(status, 'pending') WHERE status IS NULL;

-- Filas legacy sin código: marcar CITES placeholder solo si hay 1 fila/shipment
-- (no inventar códigos en masa). Dejar NULL y dejar que el admin complete.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipment_permits_code_check') THEN
    ALTER TABLE shipment_permits ADD CONSTRAINT shipment_permits_code_check
      CHECK (permit_code IS NULL OR permit_code IN ('CITES', 'VUCE', 'SENASA', 'SERFOR'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipment_permits_status_check') THEN
    ALTER TABLE shipment_permits ADD CONSTRAINT shipment_permits_status_check
      CHECK (status IN ('pending', 'submitted', 'approved', 'rejected'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE shipment_permits ALTER COLUMN status SET NOT NULL;
ALTER TABLE shipment_permits ALTER COLUMN status SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_permits_shipment_code_key
  ON shipment_permits (shipment_id, permit_code)
  WHERE permit_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_permits_shipment ON shipment_permits (shipment_id);

ALTER TABLE shipment_permits ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificación
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='categories' AND column_name IN ('name','slug','category_name');
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='shipments' AND column_name IN ('shipment_code','status','tracking_code');
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='shipment_permits' AND column_name IN ('permit_code','status');
