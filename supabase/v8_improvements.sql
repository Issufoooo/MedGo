-- ─────────────────────────────────────────────────────────────
-- MedGo v8 — Improvements & Payment Gateway Infrastructure
-- Run AFTER setup.sql + inventory_migration.sql + zones_map_migration.sql
-- ─────────────────────────────────────────────────────────────

-- 1. Add payment columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference      TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_ref    TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_initiated_at   TIMESTAMPTZ;

-- 2. Payment gateway config keys
INSERT INTO system_config (key, value) VALUES
  ('payment_gateway_provider',     ''),   -- 'mpesa_api' | 'emola_api' | 'paydunya' | ''
  ('payment_gateway_api_key',      ''),
  ('payment_gateway_merchant_code',''),
  ('payment_gateway_environment',  'sandbox'),  -- 'sandbox' | 'production'
  ('payment_gateway_webhook_secret',''),
  ('whatsapp_api_token',           '')
ON CONFLICT (key) DO NOTHING;

-- 3. Update get_order_by_token to return lat/lng for customer map
CREATE OR REPLACE FUNCTION get_order_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID, status order_status, medication_name_snapshot TEXT,
  medication_price NUMERIC, delivery_fee NUMERIC, total_price NUMERIC,
  payment_method payment_method, payment_status payment_status,
  cancellation_reason TEXT, created_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  status_history JSONB,
  delivery_lat NUMERIC, delivery_lng NUMERIC, delivery_distance_km NUMERIC,
  zone_name TEXT
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    o.id, o.status, o.medication_name_snapshot,
    o.medication_price, o.delivery_fee, o.total_price,
    o.payment_method, o.payment_status,
    o.cancellation_reason, o.created_at, o.delivered_at,
    (SELECT jsonb_agg(jsonb_build_object(
       'status', h.to_status, 'created_at', h.created_at
     ) ORDER BY h.created_at)
     FROM order_status_history h WHERE h.order_id = o.id) AS status_history,
    o.delivery_lat, o.delivery_lng, o.delivery_distance_km,
    dz.name AS zone_name
  FROM orders o
  LEFT JOIN delivery_zones dz ON dz.id = o.zone_id
  WHERE o.tracking_token = p_token
  LIMIT 1;
$$;
