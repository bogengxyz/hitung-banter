-- ==============================================================================
-- HITUNG BANTER: Database Migration - ADMIN AUTH & ROW LEVEL SECURITY (RLS)
-- Dialect: PostgreSQL (Supabase Compatible)
-- User: admin_banter (Role: admin)
-- ==============================================================================

-- 1. Ensure username column exists in profiles table
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 2. Function to check if the current requesting user has admin/owner role
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'owner')
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enforce RLS on all operational and financial tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_group_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR ADMIN ACCESS
-- Only authenticated users with admin/owner role can read & write admin data

-- Profiles
DROP POLICY IF EXISTS "Admins can view and manage profiles" ON public.profiles;
CREATE POLICY "Admins can view and manage profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- Orders & Combined Order Groups
DROP POLICY IF EXISTS "Admins can view and manage orders" ON public.orders;
CREATE POLICY "Admins can view and manage orders" ON public.orders
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Admins can view and manage order_groups" ON public.order_groups;
CREATE POLICY "Admins can view and manage order_groups" ON public.order_groups
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- Customer Receipts & Driver Payments
DROP POLICY IF EXISTS "Admins can view and manage customer_receipts" ON public.customer_receipts;
CREATE POLICY "Admins can view and manage customer_receipts" ON public.customer_receipts
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS "Admins can view and manage driver_payments" ON public.driver_payments;
CREATE POLICY "Admins can view and manage driver_payments" ON public.driver_payments
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- Audit Logs
DROP POLICY IF EXISTS "Admins can view and insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can view and insert audit_logs" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());
