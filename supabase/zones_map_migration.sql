-- ─────────────────────────────────────────────────────────────
-- MedGo v7 — Zones & Map Migration
-- Run this AFTER setup.sql and inventory_migration.sql
-- ─────────────────────────────────────────────────────────────

-- 1. Extend delivery_zones with distance rings and color
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS min_km  NUMERIC(6,2) DEFAULT 0    NOT NULL,
  ADD COLUMN IF NOT EXISTS max_km  NUMERIC(6,2) DEFAULT 999  NOT NULL,
  ADD COLUMN IF NOT EXISTS color   TEXT         DEFAULT '#14b8a6';

-- 2. Seed example zones (only if table is empty)
INSERT INTO delivery_zones (name, delivery_fee, is_active, min_km, max_km, color)
SELECT * FROM (VALUES
  ('Zona Centro',    50,  true,  0,   3,   '#14b8a6'),
  ('Zona Próxima',   100, true,  3,   8,   '#0d9488'),
  ('Zona Média',     150, true,  8,   15,  '#f97316'),
  ('Zona Distante',  200, true,  15,  25,  '#ea580c'),
  ('Fora de cobertura', 0, false, 25, 999, '#ef4444')
) AS v(name, delivery_fee, is_active, min_km, max_km, color)
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones LIMIT 1);

-- 3. Add coordinate columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_lat          NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS delivery_lng          NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS delivery_distance_km  NUMERIC(6,2);

-- 4. Add last-known location to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_known_lat  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS last_known_lng  NUMERIC(10,7);

-- 5. Insert map reference point into system_config
INSERT INTO system_config (key, value) VALUES
  ('map_reference_lat',   '-25.9650'),
  ('map_reference_lng',   '32.5699'),
  ('map_reference_label', 'MedGo HQ')
ON CONFLICT (key) DO NOTHING;
