-- ============================================================================
-- ESPEJO UNIVERSAL INDUSTRIAL — Cloudinary ↔ Supabase
--
-- ESTADO LIVE (verificado Jul 2026 via PostgREST OpenAPI):
--   ✅ Sección A YA aplicada (columnas planas en specimens + cloudinary_public_id).
--   ⚠️ Secciones B y C NO están en live aún (opcionales).
--
-- Qué hacer ahora:
--   1) NO hace falta re-pegar la sección A (idempotente si la corres igual).
--   2) Consola admin → botón ESPEJO C↔S funciona con columnas A + specimen_media
--      básico (sin sync_status). Para estados de espejo ricos, corre solo C.
--   3) Sección B solo si quieres campaigns ricas / specimen_code / attributes.
--
-- NO borra datos. ADD COLUMN IF NOT EXISTS + índices.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- A. INVENTARIO PLANO (YA en live — seguro re-ejecutar)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE specimens
  ADD COLUMN IF NOT EXISTS rubro TEXT DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS familia TEXT,
  ADD COLUMN IF NOT EXISTS subfamilia TEXT,
  ADD COLUMN IF NOT EXISTS genero TEXT,
  ADD COLUMN IF NOT EXISTS especie TEXT,
  ADD COLUMN IF NOT EXISTS subespecie TEXT,
  ADD COLUMN IF NOT EXISTS gps TEXT,
  ADD COLUMN IF NOT EXISTS origen TEXT,
  ADD COLUMN IF NOT EXISTS localidad TEXT,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS calidad TEXT,
  ADD COLUMN IF NOT EXISTS color_dominante TEXT,
  ADD COLUMN IF NOT EXISTS dimensiones TEXT,
  ADD COLUMN IF NOT EXISTS peso_gramos NUMERIC,
  ADD COLUMN IF NOT EXISTS precio_menor NUMERIC,
  ADD COLUMN IF NOT EXISTS precio_mayor NUMERIC,
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS idx_specimens_rubro ON specimens(rubro);
CREATE INDEX IF NOT EXISTS idx_specimens_cloudinary ON specimens(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_specimens_familia ON specimens(familia);
CREATE INDEX IF NOT EXISTS idx_specimens_genero ON specimens(genero);
CREATE INDEX IF NOT EXISTS idx_specimens_status ON specimens(status);

COMMENT ON COLUMN specimens.rubro IS
  'Espejo carpeta Cloudinary (GENERAL / RUBROS / …). Default GENERAL.';
COMMENT ON COLUMN specimens.cloudinary_public_id IS
  'public_id canónico Cloudinary del cover. Debe existir o crearse vía espejo.';
COMMENT ON COLUMN specimens.familia IS
  'Denormalizado desde carpeta Cloudinary / taxonomy.family_name.';
COMMENT ON COLUMN specimens.genero IS
  'Denormalizado desde carpeta Cloudinary / taxonomy.genus_name.';

-- ═══════════════════════════════════════════════════════════════════════════
-- B. CONTRATO ADMIN (sobre el plano — no reemplaza A)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS specimen_code TEXT;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS attributes    JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS metadata      JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS stock         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS pricing       JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS media_assets  JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS stock_status  TEXT;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS category_id   UUID;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS global_region_id UUID;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS updated_at
  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS mirror_status TEXT;
ALTER TABLE specimens ADD COLUMN IF NOT EXISTS last_mirror_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'specimens_stock_nonneg') THEN
    ALTER TABLE specimens ADD CONSTRAINT specimens_stock_nonneg CHECK (stock >= 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'specimens_stock_status_check') THEN
    ALTER TABLE specimens ADD CONSTRAINT specimens_stock_status_check
      CHECK (stock_status IS NULL OR stock_status IN ('IN_STOCK','OUT_OF_STOCK','PENDING'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'specimens_mirror_status_check') THEN
    ALTER TABLE specimens ADD CONSTRAINT specimens_mirror_status_check
      CHECK (mirror_status IS NULL OR mirror_status IN ('MIRRORED','PENDING','PLACEHOLDER','ERROR'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_specimens_specimen_code_key
  ON specimens (specimen_code) WHERE specimen_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_specimens_attributes ON specimens USING gin (attributes jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_specimens_metadata   ON specimens USING gin (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_specimens_pricing    ON specimens USING gin (pricing jsonb_path_ops);

-- Backfill espejo región
UPDATE specimens SET global_region_id = region_id
WHERE global_region_id IS NULL AND region_id IS NOT NULL;

-- stock_status desde status plano
UPDATE specimens
SET stock_status = CASE
  WHEN coalesce(stock, 0) > 0 THEN 'IN_STOCK'
  WHEN lower(coalesce(status, '')) IN ('out','out_of_stock','agotado') THEN 'OUT_OF_STOCK'
  ELSE 'PENDING'
END
WHERE stock_status IS NULL;

ALTER TABLE specimens ALTER COLUMN stock_status SET DEFAULT 'PENDING';

UPDATE specimens SET mirror_status = coalesce(mirror_status, 'PENDING') WHERE mirror_status IS NULL;
ALTER TABLE specimens ALTER COLUMN mirror_status SET DEFAULT 'PENDING';

-- pricing desde precio_menor / precio_mayor
UPDATE specimens
SET pricing = coalesce(pricing, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'retail_price', precio_menor,
  'wholesale_price', precio_mayor,
  'currency', 'USD'
))
WHERE (pricing IS NULL OR pricing = '{}'::jsonb)
  AND (precio_menor IS NOT NULL OR precio_mayor IS NOT NULL);

-- attributes desde columnas planas
UPDATE specimens
SET attributes = coalesce(attributes, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'sex', nullif(btrim(sexo), ''),
  'quality', nullif(btrim(calidad), ''),
  'grade_code', nullif(btrim(calidad), ''),
  'country_origin', nullif(btrim(origen), ''),
  'primary_colors', CASE
    WHEN color_dominante IS NOT NULL AND btrim(color_dominante) <> ''
    THEN jsonb_build_array(btrim(color_dominante)) ELSE NULL END,
  'dimensions', nullif(btrim(dimensiones), ''),
  'weight_g', peso_gramos,
  'specimen_kind', 'dried_specimen'
))
WHERE attributes = '{}'::jsonb OR attributes IS NULL;

-- metadata denormalizada (espejo carpetas Cloudinary)
UPDATE specimens
SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'rubro', nullif(btrim(rubro), ''),
  'region', nullif(btrim(region), ''),
  'categoria', nullif(btrim(categoria), ''),
  'family_name', nullif(btrim(familia), ''),
  'familia', nullif(btrim(familia), ''),
  'subfamilia', nullif(btrim(subfamilia), ''),
  'genus', nullif(btrim(genero), ''),
  'genero', nullif(btrim(genero), ''),
  'especie', nullif(btrim(especie), ''),
  'subespecie', nullif(btrim(subespecie), ''),
  'nombre_cientifico', nullif(btrim(species_name), ''),
  'localidad', nullif(btrim(localidad), ''),
  'gps', nullif(btrim(gps), ''),
  'sexo', nullif(btrim(sexo), ''),
  'calidad', nullif(btrim(calidad), ''),
  'precio', precio_menor
))
WHERE metadata = '{}'::jsonb OR metadata IS NULL;

-- cloudinary_public_id desde media_url si vacío
UPDATE specimens
SET cloudinary_public_id = trim(both '/' from regexp_replace(
  regexp_replace(split_part(media_url, '/upload/', 2), '^v[0-9]+/', ''),
  '\.[A-Za-z0-9]+$', ''
))
WHERE (cloudinary_public_id IS NULL OR btrim(cloudinary_public_id) = '')
  AND media_url IS NOT NULL
  AND media_url LIKE '%/upload/%';

-- media_assets cover
UPDATE specimens
SET media_assets = jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
  'type', 'photo_webp',
  'view', 'dorsal',
  'cloudinary_id', coalesce(nullif(btrim(cloudinary_public_id), ''), nullif(btrim(media_url), ''))
)))
WHERE (media_assets IS NULL OR media_assets = '[]'::jsonb)
  AND (
    (cloudinary_public_id IS NOT NULL AND btrim(cloudinary_public_id) <> '')
    OR (media_url IS NOT NULL AND btrim(media_url) <> '')
  );

UPDATE specimens
SET specimen_code = 'LEGACY-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE specimen_code IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- C. SPECIMEN_MEDIA + ESPEJO
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS view TEXT;
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS sync_status TEXT;
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS cloudinary_exists BOOLEAN;
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE specimen_media ADD COLUMN IF NOT EXISTS mirror_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'specimen_media_sync_status_check') THEN
    ALTER TABLE specimen_media ADD CONSTRAINT specimen_media_sync_status_check
      CHECK (sync_status IS NULL OR sync_status IN (
        'MIRRORED','PENDING_UPLOAD','PENDING_DB','ORPHAN_CLOUD','ORPHAN_DB','ERROR'
      ));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE specimen_media SET sync_status = coalesce(sync_status, 'PENDING_DB') WHERE sync_status IS NULL;
ALTER TABLE specimen_media ALTER COLUMN sync_status SET DEFAULT 'PENDING_DB';

CREATE UNIQUE INDEX IF NOT EXISTS idx_specimen_media_public_id_key
  ON specimen_media (public_id)
  WHERE public_id IS NOT NULL AND btrim(public_id) <> '';

CREATE INDEX IF NOT EXISTS idx_specimen_media_sync_status ON specimen_media (sync_status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'specimen_media_specimen_id_fkey') THEN
    ALTER TABLE specimen_media DROP CONSTRAINT specimen_media_specimen_id_fkey;
  END IF;
  ALTER TABLE specimen_media
    ADD CONSTRAINT specimen_media_specimen_id_fkey
    FOREIGN KEY (specimen_id) REFERENCES specimens(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- D. CAMPAIGNS (stub id+name → contrato admin)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_at
  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at
  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='campaigns' AND column_name='name'
  ) THEN
    EXECUTE $u$
      UPDATE campaigns
      SET title = coalesce(nullif(btrim(title),''), nullif(btrim(name),''), 'Campaña sin título')
      WHERE title IS NULL OR btrim(title) = ''
    $u$;
  ELSE
    UPDATE campaigns
    SET title = coalesce(nullif(btrim(title),''), 'Campaña sin título')
    WHERE title IS NULL OR btrim(title) = '';
  END IF;
END $$;

UPDATE campaigns
SET
  starts_at = coalesce(starts_at, timezone('utc'::text, now())),
  ends_at   = coalesce(ends_at,   timezone('utc'::text, now()) + interval '30 days')
WHERE starts_at IS NULL OR ends_at IS NULL;

ALTER TABLE campaigns ALTER COLUMN title SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN starts_at SET NOT NULL;
ALTER TABLE campaigns ALTER COLUMN ends_at SET NOT NULL;

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaigns_public_read ON campaigns;
CREATE POLICY campaigns_public_read ON campaigns FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- E. AUDITORÍA ESPEJO + VISTAS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mirror_sync_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at     TIMESTAMPTZ,
  mode            TEXT NOT NULL DEFAULT 'apply'
                    CHECK (mode IN ('discover','apply')),
  triggered_by    TEXT,
  cloud_scanned   INTEGER NOT NULL DEFAULT 0,
  db_scanned      INTEGER NOT NULL DEFAULT 0,
  upserted_media  INTEGER NOT NULL DEFAULT 0,
  created_cloud   INTEGER NOT NULL DEFAULT 0,
  placeholders    INTEGER NOT NULL DEFAULT 0,
  orphans_cloud   INTEGER NOT NULL DEFAULT 0,
  orphans_db      INTEGER NOT NULL DEFAULT 0,
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary         JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE mirror_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mirror_sync_runs_started ON mirror_sync_runs (started_at DESC);

CREATE OR REPLACE VIEW v_mirror_db_without_cloud_flag AS
SELECT sm.id, sm.specimen_id, sm.public_id, sm.media_url, sm.sync_status,
       sm.cloudinary_exists, sm.is_placeholder, s.species_name, s.specimen_code, s.rubro
FROM specimen_media sm
LEFT JOIN specimens s ON s.id = sm.specimen_id
WHERE coalesce(sm.cloudinary_exists, false) = false
   OR sm.sync_status IN ('PENDING_UPLOAD','ORPHAN_DB','ERROR');

CREATE OR REPLACE VIEW v_mirror_specimens_without_media AS
SELECT s.id, s.species_name, s.specimen_code, s.rubro, s.cloudinary_public_id, s.media_url, s.mirror_status
FROM specimens s
WHERE NOT EXISTS (SELECT 1 FROM specimen_media m WHERE m.specimen_id = s.id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificación rápida
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='specimens'
--    AND column_name IN ('rubro','cloudinary_public_id','specimen_code','attributes','mirror_status');
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='campaigns' AND column_name IN ('title','active','starts_at');
