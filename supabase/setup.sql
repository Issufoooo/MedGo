-- ================================================================
-- MedGo — Database Setup v2
-- Refined schema: normalised, performant, secure
-- Run once in Supabase SQL Editor
-- ================================================================

-- ── ENUMS ────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('owner', 'operator', 'motoboy');

CREATE TYPE medication_category AS ENUM (
  'FREE', 'PRESCRIPTION', 'RESTRICTED_MONITORED'
);

CREATE TYPE order_status AS ENUM (
  'NEW',
  'PRESCRIPTION_PENDING',
  'IN_VALIDATION',
  'AWAITING_PHARMACY',
  'AWAITING_CLIENT',
  'CONFIRMED',
  'IN_PREPARATION',
  'IN_DELIVERY',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE payment_method AS ENUM ('MPESA','EMOLA','CASH_ON_DELIVERY','POS');
CREATE TYPE payment_status AS ENUM ('PENDING','CONFIRMED','FAILED','REFUNDED');

CREATE TYPE prescription_status AS ENUM (
  'PENDING','APPROVED','REJECTED_UNREADABLE','REJECTED_INVALID','EXPIRED'
);

CREATE TYPE blacklist_severity AS ENUM ('LOW','MEDIUM','HIGH','BLOCKED');
CREATE TYPE cancellation_request_status AS ENUM ('PENDING','APPROVED','REJECTED');

-- ── TIMESTAMP TRIGGER ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Macro for adding the trigger to any table
CREATE OR REPLACE FUNCTION add_updated_at_trigger(tbl TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
    tbl, tbl
  );
END;
$$;

-- ── TABLES ───────────────────────────────────────────────────────

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  role       user_role NOT NULL DEFAULT 'operator',
  phone      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT add_updated_at_trigger('profiles');

CREATE TABLE delivery_zones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  delivery_fee NUMERIC(10,2) NOT NULL CHECK (delivery_fee >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT add_updated_at_trigger('delivery_zones');

INSERT INTO delivery_zones (name, description, delivery_fee, sort_order) VALUES
  ('Zona 1 — Centro Maputo',             'Área central de Maputo',              150.00, 1),
  ('Zona 2 — Arredores Maputo / Matola', 'Periferias de Maputo e Matola centro', 250.00, 2),
  ('Zona 3 — Matola Periferia',          'Zonas mais distantes de Matola',       350.00, 3);

CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  whatsapp_number  TEXT NOT NULL,
  address_notes    TEXT,
  zone_id          UUID REFERENCES delivery_zones(id),
  is_blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
  order_count      INTEGER NOT NULL DEFAULT 0,
  last_order_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customers_whatsapp UNIQUE (whatsapp_number)
);
CREATE INDEX idx_customers_whatsapp ON customers(whatsapp_number);
CREATE INDEX idx_customers_name ON customers USING gin(to_tsvector('portuguese', full_name));
SELECT add_updated_at_trigger('customers');

CREATE TABLE blacklist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID REFERENCES customers(id),
  whatsapp_number  TEXT NOT NULL,
  severity         blacklist_severity NOT NULL DEFAULT 'MEDIUM',
  reason           TEXT NOT NULL,
  notes            TEXT,
  added_by         UUID NOT NULL REFERENCES profiles(id),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_blacklist_phone ON blacklist(whatsapp_number) WHERE is_active = TRUE;
SELECT add_updated_at_trigger('blacklist');

CREATE TABLE pharmacies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  zone_id         UUID REFERENCES delivery_zones(id),
  contact_phone   TEXT,
  whatsapp        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT add_updated_at_trigger('pharmacies');

CREATE TABLE medications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_name       TEXT NOT NULL,
  generic_name          TEXT,
  dosage                TEXT,
  pharmaceutical_form   TEXT,
  package_size          TEXT,
  category              medication_category NOT NULL DEFAULT 'FREE',
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible            BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);
CREATE INDEX idx_medications_search ON medications
  USING gin(to_tsvector('portuguese',
    coalesce(commercial_name,'') || ' ' || coalesce(generic_name,'')
  ));
CREATE INDEX idx_medications_visible ON medications(is_visible, deleted_at);
SELECT add_updated_at_trigger('medications');

CREATE TABLE medication_aliases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  alias         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_aliases_search ON medication_aliases
  USING gin(to_tsvector('portuguese', alias));

-- CORE: Orders
CREATE TABLE orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  customer_id              UUID NOT NULL REFERENCES customers(id),
  medication_id            UUID NOT NULL REFERENCES medications(id),
  medication_name_snapshot TEXT NOT NULL,
  quantity                 INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status                   order_status NOT NULL DEFAULT 'NEW',
  zone_id                  UUID REFERENCES delivery_zones(id),
  delivery_address         TEXT,
  delivery_fee             NUMERIC(10,2),
  medication_price         NUMERIC(10,2),
  total_price              NUMERIC(10,2)
    GENERATED ALWAYS AS (
      CASE WHEN medication_price IS NOT NULL AND delivery_fee IS NOT NULL
           THEN medication_price + delivery_fee ELSE NULL END
    ) STORED,
  payment_method           payment_method NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  payment_status           payment_status NOT NULL DEFAULT 'PENDING',
  pharmacy_id              UUID REFERENCES pharmacies(id),
  assigned_operator_id     UUID REFERENCES profiles(id),
  assigned_motoboy_id      UUID REFERENCES profiles(id),
  prescription_status      prescription_status,
  customer_notes           TEXT,
  operator_notes           TEXT,
  cancellation_reason      TEXT,
  cancelled_by             UUID REFERENCES profiles(id),
  price_confirmed_at       TIMESTAMPTZ,
  client_confirmed_at      TIMESTAMPTZ,
  dispatched_at            TIMESTAMPTZ,
  delivered_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_tracking ON orders(tracking_token);
CREATE INDEX idx_orders_created  ON orders(created_at DESC);
CREATE INDEX idx_orders_motoboy  ON orders(assigned_motoboy_id) WHERE assigned_motoboy_id IS NOT NULL;
CREATE INDEX idx_orders_active   ON orders(status, created_at DESC)
  WHERE status NOT IN ('DELIVERED','CANCELLED');
SELECT add_updated_at_trigger('orders');

-- Computed total_price trigger (for updates after generation)
-- Note: generated column handles inserts; trigger handles updates
CREATE OR REPLACE FUNCTION sync_order_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- total_price is a generated column — no manual update needed
  RETURN NEW;
END;
$$;

CREATE TABLE order_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status  order_status,
  to_status    order_status NOT NULL,
  changed_by   UUID REFERENCES profiles(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_history_order ON order_status_history(order_id, created_at);

CREATE TABLE prescription_refs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  file_type      TEXT NOT NULL,
  original_name  TEXT,
  status         prescription_status NOT NULL DEFAULT 'PENDING',
  reviewed_by    UUID REFERENCES profiles(id),
  reviewed_at    TIMESTAMPTZ,
  reject_reason  TEXT,
  upload_count   INTEGER NOT NULL DEFAULT 1,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE motoboy_deliveries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL UNIQUE REFERENCES orders(id),
  motoboy_id     UUID NOT NULL REFERENCES profiles(id),
  assigned_by    UUID NOT NULL REFERENCES profiles(id),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_up_at   TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  delivery_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_deliveries_motoboy ON motoboy_deliveries(motoboy_id);
CREATE INDEX idx_deliveries_active  ON motoboy_deliveries(motoboy_id)
  WHERE delivered_at IS NULL;

CREATE TABLE cancellation_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  reason       TEXT NOT NULL,
  status       cancellation_request_status NOT NULL DEFAULT 'PENDING',
  reviewed_by  UUID REFERENCES profiles(id),
  reviewed_at  TIMESTAMPTZ,
  review_notes TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cancel_pending ON cancellation_requests(status) WHERE status = 'PENDING';

-- Immutable audit log
CREATE TABLE action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES profiles(id),
  actor_role  user_role,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logs_entity  ON action_logs(entity_type, entity_id);
CREATE INDEX idx_logs_actor   ON action_logs(actor_id);
CREATE INDEX idx_logs_action  ON action_logs(action);
CREATE INDEX idx_logs_created ON action_logs(created_at DESC);

CREATE TABLE system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value, description) VALUES
  ('prescription_timeout_minutes', '30',   'Minutos até cancelamento automático (receita não reenviada)'),
  ('client_confirm_timeout_minutes','30',  'Minutos para cliente confirmar o preço'),
  ('whatsapp_api_url',             '',     'URL da API WhatsApp'),
  ('whatsapp_sender_number',       '',     'Número WhatsApp remetente'),
  ('company_name',         'MedGo',        'Nome da empresa'),
  ('company_whatsapp',     '258XXXXXXXXX', 'WhatsApp suporte (substituir pelo número real)'),
  ('tracking_base_url', 'https://medgo.co.mz/acompanhar', 'URL base para tracking');

-- ── HELPER FUNCTION: increment customer order count ─────────────
CREATE OR REPLACE FUNCTION increment_customer_order_count(customer_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE customers SET order_count = order_count + 1 WHERE id = customer_id;
$$;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_aliases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist             ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_refs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoboy_deliveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config         ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- PROFILES
CREATE POLICY p_profiles_read  ON profiles FOR SELECT USING (id = auth.uid() OR get_user_role() IN ('owner','operator'));
CREATE POLICY p_profiles_owner ON profiles FOR ALL    USING (get_user_role() = 'owner');

-- MEDICATIONS
CREATE POLICY p_med_public_read ON medications FOR SELECT USING (is_visible = TRUE AND deleted_at IS NULL);
CREATE POLICY p_med_internal    ON medications FOR ALL    USING (get_user_role() IN ('owner','operator'));

-- ALIASES
CREATE POLICY p_aliases_read     ON medication_aliases FOR SELECT USING (TRUE);
CREATE POLICY p_aliases_internal ON medication_aliases FOR ALL    USING (get_user_role() IN ('owner','operator'));

-- DELIVERY ZONES
CREATE POLICY p_zones_public ON delivery_zones FOR SELECT USING (is_active = TRUE);
CREATE POLICY p_zones_owner  ON delivery_zones FOR ALL    USING (get_user_role() = 'owner');

-- CUSTOMERS
CREATE POLICY p_customers_read   ON customers FOR SELECT USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_customers_update ON customers FOR UPDATE USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_customers_insert ON customers FOR INSERT WITH CHECK (TRUE);

-- ORDERS
CREATE POLICY p_orders_op_read    ON orders FOR SELECT USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_orders_op_update  ON orders FOR UPDATE USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_orders_mb_read    ON orders FOR SELECT USING (get_user_role() = 'motoboy' AND assigned_motoboy_id = auth.uid());
CREATE POLICY p_orders_mb_update  ON orders FOR UPDATE USING (get_user_role() = 'motoboy' AND assigned_motoboy_id = auth.uid());
CREATE POLICY p_orders_insert     ON orders FOR INSERT WITH CHECK (TRUE);

-- ORDER STATUS HISTORY
CREATE POLICY p_history_read   ON order_status_history FOR SELECT USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_history_insert ON order_status_history FOR INSERT WITH CHECK (TRUE);

-- PRESCRIPTION REFS
CREATE POLICY p_presc_read   ON prescription_refs FOR SELECT USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_presc_insert ON prescription_refs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY p_presc_update ON prescription_refs FOR UPDATE USING (get_user_role() IN ('owner','operator'));

-- PHARMACIES
CREATE POLICY p_pharmacies ON pharmacies FOR ALL USING (get_user_role() IN ('owner','operator'));

-- BLACKLIST
CREATE POLICY p_blacklist ON blacklist FOR ALL USING (get_user_role() IN ('owner','operator'));

-- MOTOBOY DELIVERIES
CREATE POLICY p_del_op_read    ON motoboy_deliveries FOR SELECT USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_del_mb_read    ON motoboy_deliveries FOR SELECT USING (get_user_role() = 'motoboy' AND motoboy_id = auth.uid());
CREATE POLICY p_del_mb_update  ON motoboy_deliveries FOR UPDATE USING (get_user_role() = 'motoboy' AND motoboy_id = auth.uid());
CREATE POLICY p_del_op_insert  ON motoboy_deliveries FOR INSERT WITH CHECK (get_user_role() IN ('owner','operator'));

-- CANCELLATION REQUESTS
CREATE POLICY p_cancel ON cancellation_requests FOR ALL USING (get_user_role() IN ('owner','operator'));

-- ACTION LOGS (insert-only for all, read for internal)
CREATE POLICY p_logs_read   ON action_logs FOR SELECT USING (get_user_role() IN ('owner','operator'));
CREATE POLICY p_logs_insert ON action_logs FOR INSERT WITH CHECK (TRUE);

-- SYSTEM CONFIG
CREATE POLICY p_config_owner   ON system_config FOR ALL    USING (get_user_role() = 'owner');
CREATE POLICY p_config_op_read ON system_config FOR SELECT USING (get_user_role() IN ('operator','motoboy'));

-- ── RPC FUNCTIONS ────────────────────────────────────────────────

-- Public tracking (zero internal data exposure)
CREATE OR REPLACE FUNCTION get_order_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID, status order_status, medication_name_snapshot TEXT,
  medication_price NUMERIC, delivery_fee NUMERIC, total_price NUMERIC,
  payment_method payment_method, cancellation_reason TEXT,
  created_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, status_history JSONB
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    o.id, o.status, o.medication_name_snapshot,
    o.medication_price, o.delivery_fee, o.total_price,
    o.payment_method, o.cancellation_reason,
    o.created_at, o.delivered_at,
    (SELECT jsonb_agg(jsonb_build_object(
       'status', h.to_status, 'created_at', h.created_at
     ) ORDER BY h.created_at)
     FROM order_status_history h WHERE h.order_id = o.id) AS status_history
  FROM orders o
  WHERE o.tracking_token = p_token
  LIMIT 1;
$$;

-- Medication search with alias support
CREATE OR REPLACE FUNCTION search_medications(query TEXT)
RETURNS TABLE (
  id UUID, commercial_name TEXT, generic_name TEXT,
  dosage TEXT, pharmaceutical_form TEXT,
  category medication_category, requires_prescription BOOLEAN
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT DISTINCT ON (m.id)
    m.id, m.commercial_name, m.generic_name,
    m.dosage, m.pharmaceutical_form,
    m.category, m.requires_prescription
  FROM medications m
  LEFT JOIN medication_aliases ma ON ma.medication_id = m.id
  WHERE m.is_visible = TRUE AND m.deleted_at IS NULL
    AND (
      m.commercial_name ILIKE '%' || query || '%'
      OR m.generic_name  ILIKE '%' || query || '%'
      OR ma.alias        ILIKE '%' || query || '%'
    )
  ORDER BY m.id,
    CASE WHEN m.commercial_name ILIKE query || '%' THEN 0
         WHEN m.commercial_name ILIKE '%' || query || '%' THEN 1
         ELSE 2 END
  LIMIT 12;
$$;

-- Dashboard stats for owner
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_orders BIGINT, active_orders BIGINT,
  delivered_today BIGINT, cancelled_today BIGINT,
  pending_cancellations BIGINT
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    (SELECT COUNT(*) FROM orders)::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE status NOT IN ('DELIVERED','CANCELLED'))::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE status = 'DELIVERED' AND delivered_at::date = CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE status = 'CANCELLED' AND updated_at::date = CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM cancellation_requests WHERE status = 'PENDING')::BIGINT;
$$;

-- ── STORAGE BUCKETS ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('prescription-uploads', 'prescription-uploads', FALSE, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('medication-images',    'medication-images',    TRUE,  5242880,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "rx_insert"        ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prescription-uploads');
CREATE POLICY "rx_internal_read" ON storage.objects FOR SELECT USING (bucket_id = 'prescription-uploads' AND get_user_role() IN ('owner','operator'));
CREATE POLICY "rx_delete"        ON storage.objects FOR DELETE USING (bucket_id = 'prescription-uploads' AND get_user_role() IN ('owner','operator'));
CREATE POLICY "med_img_read"     ON storage.objects FOR SELECT USING (bucket_id = 'medication-images');
CREATE POLICY "med_img_write"    ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medication-images' AND get_user_role() IN ('owner','operator'));

-- ── DONE ─────────────────────────────────────────────────────────
-- Create the first owner user:
--   1. Supabase Auth → Add user
--   2. INSERT INTO profiles (id, full_name, role) VALUES ('<uuid>', 'Nome', 'owner');
