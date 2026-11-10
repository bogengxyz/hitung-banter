-- ============================================================================
-- SUPABASE MIGRATION: HITUNG BANTER DRIVER LIVE TRACKING
-- Migration: 20261109000002_driver_tracking_schema.sql
-- ============================================================================
-- Aturan Arsitektur:
-- 1. Table driver_locations menyimpan hanya 1 baris lokasi terbaru per driver (driver_id PK/Unique).
-- 2. Dilarang menyimpan riwayat GPS titik rekam jejak (breadcrumbs).
-- 3. Terkoneksi dengan Socket.IO / VPS Oracle & Supabase Realtime.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id VARCHAR(64) PRIMARY KEY,
  driver_code VARCHAR(32) NOT NULL,
  driver_name VARCHAR(128) NOT NULL,
  phone VARCHAR(32),
  vehicle_plate VARCHAR(32),
  avatar_url TEXT,
  
  -- GPS Coordinates
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy REAL DEFAULT 10.0,
  heading REAL DEFAULT 0.0,
  speed_kmh REAL DEFAULT 0.0,
  
  -- Statuses
  duty_status VARCHAR(20) NOT NULL DEFAULT 'off_duty' CHECK (duty_status IN ('on_duty', 'off_duty')),
  work_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (work_status IN ('available', 'delivering')),
  connection_status VARCHAR(20) NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('online', 'disconnected', 'expired')),
  
  -- Active Order linkage (optional)
  active_order_id VARCHAR(64),
  active_order_number VARCHAR(64),
  service_type VARCHAR(32),
  customer_name VARCHAR(128),
  delivery_address TEXT,
  
  -- Timestamps
  device_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duty_started_at TIMESTAMPTZ,
  duty_ended_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Admin, Owner, and Authenticated staff can read all driver locations
CREATE POLICY "Allow authenticated staff to read driver locations"
  ON public.driver_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Driver can update ONLY their own location
CREATE POLICY "Allow driver to upsert own location"
  ON public.driver_locations
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = driver_id)
  WITH CHECK (auth.uid()::text = driver_id);

-- Enable Supabase Realtime on driver_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Create index for faster querying of on-duty drivers
CREATE INDEX IF NOT EXISTS idx_driver_locations_duty ON public.driver_locations (duty_status, work_status);
