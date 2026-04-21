-- ─────────────────────────────────────────────────────────────
-- MedGo — Pharmacy Inventory Schema
-- Add these tables to your existing Supabase setup
-- ─────────────────────────────────────────────────────────────

-- Stock status enum
CREATE TYPE stock_status AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- ── pharmacy_inventory ────────────────────────────────────────
-- Each pharmacy × medication combination with current stock level
CREATE TABLE pharmacy_inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id       UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medication_id     UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,

  -- Current stock
  quantity          INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price        NUMERIC(10,2),                     -- price at this pharmacy
  status            stock_status NOT NULL DEFAULT 'OUT_OF_STOCK',

  -- Metadata
  notes             TEXT,
  last_updated_by   UUID REFERENCES profiles(id),
  last_synced_at    TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  -- One record per pharmacy+medication
  UNIQUE (pharmacy_id, medication_id)
);

-- ── inventory_movements ───────────────────────────────────────
-- Audit trail of every stock change
CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id    UUID NOT NULL REFERENCES pharmacy_inventory(id) ON DELETE CASCADE,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id),
  medication_id   UUID NOT NULL REFERENCES medications(id),

  -- Movement details
  movement_type   TEXT NOT NULL CHECK (movement_type IN (
    'SYNC',         -- manual sync from pharmacy
    'ADJUSTMENT',   -- manual correction
    'ORDER_RESERVE',-- reserved for a confirmed order
    'ORDER_RELEASE',-- released (order cancelled)
    'ORDER_FULFILL' -- consumed (order delivered)
  )),
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,  -- positive = added, negative = removed
  quantity_after  INTEGER NOT NULL,

  notes           TEXT,
  order_id        UUID REFERENCES orders(id),
  performed_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_inventory_pharmacy    ON pharmacy_inventory(pharmacy_id);
CREATE INDEX idx_inventory_medication  ON pharmacy_inventory(medication_id);
CREATE INDEX idx_inventory_status      ON pharmacy_inventory(status);
CREATE INDEX idx_movements_inventory   ON inventory_movements(inventory_id);
CREATE INDEX idx_movements_pharmacy    ON inventory_movements(pharmacy_id);
CREATE INDEX idx_movements_created     ON inventory_movements(created_at DESC);

-- ── Auto-update status based on quantity ─────────────────────
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity = 0 THEN
    NEW.status = 'OUT_OF_STOCK';
  ELSIF NEW.quantity <= 5 THEN
    NEW.status = 'LOW_STOCK';
  ELSE
    NEW.status = 'IN_STOCK';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_status
  BEFORE INSERT OR UPDATE ON pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- ── RLS Policies ──────────────────────────────────────────────
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Stock managers can read and write inventory
CREATE POLICY "stock_managers_full_access_inventory"
  ON pharmacy_inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('stock_manager', 'owner')
    )
  );

-- Operators can read inventory (for order confirmation)
CREATE POLICY "operators_read_inventory"
  ON pharmacy_inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('operator', 'owner', 'stock_manager')
    )
  );

-- Full access to movements for authorised roles
CREATE POLICY "authorised_access_movements"
  ON inventory_movements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('stock_manager', 'owner', 'operator')
    )
  );

-- ── Helper view: inventory with pharmacy + medication names ───
CREATE OR REPLACE VIEW inventory_overview AS
SELECT
  pi.id,
  pi.pharmacy_id,
  p.name          AS pharmacy_name,
  p.address       AS pharmacy_address,
  pi.medication_id,
  m.commercial_name AS medication_name,
  m.generic_name,
  m.category,
  m.dosage,
  pi.quantity,
  pi.unit_price,
  pi.status,
  pi.notes,
  pi.last_synced_at,
  pi.updated_at,
  pr.full_name    AS last_updated_by_name
FROM pharmacy_inventory pi
JOIN pharmacies p    ON p.id = pi.pharmacy_id
JOIN medications m   ON m.id = pi.medication_id
LEFT JOIN profiles pr ON pr.id = pi.last_updated_by;

-- ── stock_manager role in profiles check ─────────────────────
-- Make sure your profiles table allows 'stock_manager' as a role value
-- If using an enum, run:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'stock_manager';
