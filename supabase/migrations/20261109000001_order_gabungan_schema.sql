-- ==============================================================================
-- HITUNG BANTER: Database Schema Migration - ORDER GABUNGAN
-- Dialect: PostgreSQL (Supabase Compatible)
-- Currency: Indonesian Rupiah (BIGINT, no floating point)
-- Distance: NUMERIC(5,2)
-- Status: waiting_driver, driver_assigned, in_progress, shopping, delivering, completed, cancelled
-- ==============================================================================

-- 1. Create or extend service_type
DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM ('ojek', 'antar_barang', 'order_gabungan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE combined_order_status_enum AS ENUM (
        'waiting_driver',
        'driver_assigned',
        'in_progress',
        'shopping',
        'delivering',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ORDER GROUPS TABLE (ORDER GABUNGAN)
CREATE TABLE IF NOT EXISTS order_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_number VARCHAR(50) UNIQUE NOT NULL,
    service_type service_type_enum NOT NULL DEFAULT 'order_gabungan',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_time TIME NOT NULL DEFAULT CURRENT_TIME,
    customer_count SMALLINT NOT NULL CHECK (customer_count BETWEEN 1 AND 3),
    status combined_order_status_enum NOT NULL DEFAULT 'waiting_driver',
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Surcharges (100% Driver)
    is_rain BOOLEAN NOT NULL DEFAULT false,
    is_night BOOLEAN NOT NULL DEFAULT false,
    extra_locations_count INT NOT NULL DEFAULT 0,
    extra_locations_fee BIGINT NOT NULL DEFAULT 0,
    rain_fee BIGINT NOT NULL DEFAULT 0,
    night_fee BIGINT NOT NULL DEFAULT 0,
    extra_fees_total BIGINT NOT NULL DEFAULT 0,

    -- Pricing Split
    total_delivery_fee BIGINT NOT NULL DEFAULT 0,
    admin_share BIGINT NOT NULL DEFAULT 0,
    banter_share BIGINT NOT NULL DEFAULT 0,
    driver_delivery_share BIGINT NOT NULL DEFAULT 0,
    driver_total_delivery_entitlement BIGINT NOT NULL DEFAULT 0,

    -- Shopping modal
    total_shopping_cost BIGINT NOT NULL DEFAULT 0,
    driver_shopping_modal BIGINT NOT NULL DEFAULT 0,
    admin_shopping_modal BIGINT NOT NULL DEFAULT 0,

    -- Financial totals
    customer_total_bill BIGINT NOT NULL DEFAULT 0,
    driver_total_entitlement BIGINT NOT NULL DEFAULT 0,

    -- Payout tracking
    driver_payout_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (driver_payout_status IN ('unpaid', 'partial', 'paid', 'overpaid')),
    driver_total_received BIGINT NOT NULL DEFAULT 0,
    driver_balance_remaining BIGINT NOT NULL DEFAULT 0,

    cancellation_reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_groups_status ON order_groups(status);
CREATE INDEX IF NOT EXISTS idx_order_groups_driver ON order_groups(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_groups_date ON order_groups(order_date);

-- 3. COMBINED ORDER CUSTOMERS
CREATE TABLE IF NOT EXISTS order_group_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30),
    delivery_address TEXT NOT NULL,
    delivery_maps_url TEXT,
    distance_km NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    delivery_fee BIGINT NOT NULL DEFAULT 0,
    shopping_subtotal BIGINT NOT NULL DEFAULT 0,
    customer_total_bill BIGINT NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    paid_amount BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_customers_group ON order_group_customers(group_id);

-- 4. PURCHASE LOCATIONS (TEMPAT PEMBELIAN)
CREATE TABLE IF NOT EXISTS purchase_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES order_group_customers(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    maps_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_locations_cust ON purchase_locations(customer_id);

-- 5. PURCHASE ITEMS (DAFTAR BARANG)
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES purchase_locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    qty INT NOT NULL DEFAULT 1 CHECK (qty >= 1),
    unit_price BIGINT NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_price BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_loc ON purchase_items(location_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE order_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_group_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on order_groups"
    ON order_groups FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admin/owner manage order_groups"
    ON order_groups FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Allow authenticated read on order_group_customers"
    ON order_group_customers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admin/owner manage order_group_customers"
    ON order_group_customers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Allow authenticated read on purchase_locations"
    ON purchase_locations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admin/owner manage purchase_locations"
    ON purchase_locations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Allow authenticated read on purchase_items"
    ON purchase_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admin/owner manage purchase_items"
    ON purchase_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'admin')
        )
    );
