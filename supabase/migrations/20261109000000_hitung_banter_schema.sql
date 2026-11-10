-- ==============================================================================
-- HITUNG BANTER: Database Schema Migration
-- Dialect: PostgreSQL (Supabase Compatible)
-- Currency: Indonesian Rupiah (BIGINT, no floating point)
-- Distance: NUMERIC(5,2)
-- Timezone: Asia/Jakarta (TIMESTAMPTZ)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES & ACCESS CONTROL
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'viewer');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'admin',
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    vehicle_plate VARCHAR(20),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_code ON drivers(code);

-- 3. TARIFF CONFIGURATION & SNAPSHOTS
CREATE TABLE IF NOT EXISTS tariff_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    base_distance_km NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    base_rate BIGINT NOT NULL DEFAULT 8000,
    per_km_rate BIGINT NOT NULL DEFAULT 2500,
    admin_cut_per_km BIGINT NOT NULL DEFAULT 500,
    max_admin_cut BIGINT NOT NULL DEFAULT 2000,
    banter_percent NUMERIC(4,3) NOT NULL DEFAULT 0.100,
    rain_fee BIGINT NOT NULL DEFAULT 5000,
    night_fee BIGINT NOT NULL DEFAULT 5000,
    extra_stop_rate BIGINT NOT NULL DEFAULT 2000,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TYPE order_status AS ENUM ('draft', 'pending', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'overpaid');

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    driver_name VARCHAR(150) NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    notes TEXT,

    -- Distance calculations
    distance_raw_km NUMERIC(5,2) NOT NULL CHECK (distance_raw_km >= 0),
    distance_rounded_km INTEGER NOT NULL CHECK (distance_rounded_km >= 0),
    is_rain BOOLEAN NOT NULL DEFAULT false,
    is_night BOOLEAN NOT NULL DEFAULT false,
    extra_stops_count INTEGER NOT NULL DEFAULT 0 CHECK (extra_stops_count >= 0),

    -- Financial pricing breakdown (Stored in integer Rupiah)
    delivery_fee BIGINT NOT NULL CHECK (delivery_fee >= 0),
    admin_share BIGINT NOT NULL CHECK (admin_share >= 0),
    banter_share BIGINT NOT NULL CHECK (banter_share >= 0),
    driver_delivery_share BIGINT NOT NULL CHECK (driver_delivery_share >= 0),
    extra_fees_total BIGINT NOT NULL DEFAULT 0 CHECK (extra_fees_total >= 0),
    driver_total_delivery_entitlement BIGINT NOT NULL CHECK (driver_total_delivery_entitlement >= 0),

    -- Shopping expenses breakdown
    total_shopping_cost BIGINT NOT NULL DEFAULT 0 CHECK (total_shopping_cost >= 0),
    driver_shopping_modal BIGINT NOT NULL DEFAULT 0 CHECK (driver_shopping_modal >= 0),
    admin_shopping_modal BIGINT NOT NULL DEFAULT 0 CHECK (admin_shopping_modal >= 0),

    -- Grand totals
    customer_total_bill BIGINT NOT NULL CHECK (customer_total_bill >= 0),
    driver_total_entitlement BIGINT NOT NULL CHECK (driver_total_entitlement >= 0),

    -- Payment tracking
    customer_payment_status payment_status NOT NULL DEFAULT 'unpaid',
    customer_paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (customer_paid_amount >= 0),

    driver_payout_status payment_status NOT NULL DEFAULT 'unpaid',
    driver_received_from_customer BIGINT NOT NULL DEFAULT 0 CHECK (driver_received_from_customer >= 0),
    driver_transferred_by_admin BIGINT NOT NULL DEFAULT 0 CHECK (driver_transferred_by_admin >= 0),
    driver_total_received BIGINT NOT NULL DEFAULT 0 CHECK (driver_total_received >= 0),
    driver_balance_remaining BIGINT NOT NULL,

    status order_status NOT NULL DEFAULT 'pending',
    cancellation_reason TEXT,
    pricing_snapshot JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 5. EXPENSE ITEMS & FUNDING SOURCE
CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    funding_source VARCHAR(20) NOT NULL CHECK (funding_source IN ('driver', 'admin')),
    receipt_photo_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_order_id ON expense_items(order_id);

-- 6. CUSTOMER RECEIPTS
CREATE TABLE IF NOT EXISTS customer_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'qris', 'transfer')),
    recipient VARCHAR(20) NOT NULL CHECK (recipient IN ('admin', 'driver')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_number VARCHAR(100),
    proof_url TEXT,
    notes TEXT,
    allocation JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON customer_receipts(order_id);

-- 7. DRIVER PAYMENTS (DISBURSEMENT FROM ADMIN TO DRIVER)
CREATE TABLE IF NOT EXISTS driver_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'transfer', 'qris')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_number VARCHAR(100),
    proof_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES driver_payments(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    allocated_amount BIGINT NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT LOGS (IMMUTABLE)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES profiles(id),
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
CREATE POLICY "Authenticated users can read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read drivers" ON drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read expenses" ON expense_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read customer receipts" ON customer_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read driver payments" ON driver_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read audit logs" ON audit_logs FOR SELECT TO authenticated USING (true);

-- Restrict mutations to owner & admin
CREATE POLICY "Admins can insert orders" ON orders FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true)
);

CREATE POLICY "Admins can update orders" ON orders FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true)
);

-- 10. POSTGRESQL PRICING FUNCTION
CREATE OR REPLACE FUNCTION calculate_banter_pricing(
    p_distance NUMERIC,
    p_rain BOOLEAN DEFAULT false,
    p_night BOOLEAN DEFAULT false,
    p_extra_stops INTEGER DEFAULT 0
) RETURNS TABLE (
    rounded_distance INTEGER,
    delivery_fee BIGINT,
    admin_share BIGINT,
    banter_share BIGINT,
    driver_share BIGINT,
    extra_fees BIGINT,
    driver_total_entitlement BIGINT
) AS $$
DECLARE
    v_rounded INTEGER;
    v_extra_km INTEGER;
    v_ongkir BIGINT;
    v_admin BIGINT;
    v_banter BIGINT;
    v_driver BIGINT;
    v_extra BIGINT;
BEGIN
    v_rounded := FLOOR(p_distance + 0.5);
    v_extra_km := GREATEST(v_rounded - 2, 0);
    v_ongkir := 8000 + (v_extra_km * 2500);
    v_admin := LEAST(v_extra_km * 500, 2000);
    v_banter := ROUND(0.10 * (v_ongkir - v_admin));
    v_driver := v_ongkir - v_admin - v_banter;
    
    v_extra := (CASE WHEN p_rain THEN 5000 ELSE 0 END) +
               (CASE WHEN p_night THEN 5000 ELSE 0 END) +
               (GREATEST(p_extra_stops, 0) * 2000);

    RETURN QUERY SELECT
        v_rounded,
        v_ongkir,
        v_admin,
        v_banter,
        v_driver,
        v_extra,
        (v_driver + v_extra);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
