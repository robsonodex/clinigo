-- Migration: create_clinic_custom_permissions
-- Description: Implements granular custom permissions system for SUPER_ADMIN
-- Created: 2026-01-23

-- =====================================================
-- 1. CREATE CLINIC_CUSTOM_PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS clinic_custom_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    enabled_by UUID REFERENCES users(id),
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    disabled_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, feature_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_custom_permissions_clinic ON clinic_custom_permissions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_custom_permissions_feature ON clinic_custom_permissions(feature_key);
CREATE INDEX IF NOT EXISTS idx_clinic_custom_permissions_enabled ON clinic_custom_permissions(is_enabled);

-- =====================================================
-- 2. ADD CUSTOM PRICE COLUMNS TO CLINICS TABLE
-- =====================================================

ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS custom_price_start_date DATE,
ADD COLUMN IF NOT EXISTS custom_price_end_date DATE,
ADD COLUMN IF NOT EXISTS custom_price_reason TEXT;

-- =====================================================
-- 3. CREATE AUDIT TRIGGER FOR CUSTOM PRICE CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_custom_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.custom_price IS DISTINCT FROM OLD.custom_price THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata, created_at)
        VALUES (
            auth.uid(), 
            'CUSTOM_PRICE_CHANGED', 
            'CLINIC', 
            NEW.id, 
            jsonb_build_object(
                'old_price', OLD.custom_price, 
                'new_price', NEW.custom_price,
                'old_start_date', OLD.custom_price_start_date,
                'new_start_date', NEW.custom_price_start_date,
                'old_end_date', OLD.custom_price_end_date,
                'new_end_date', NEW.custom_price_end_date,
                'reason', NEW.custom_price_reason
            ),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_log_custom_price ON clinics;

-- Create trigger
CREATE TRIGGER trigger_log_custom_price
AFTER UPDATE ON clinics 
FOR EACH ROW 
EXECUTE FUNCTION log_custom_price_change();

-- =====================================================
-- 4. CREATE AUDIT TRIGGER FOR PERMISSION CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata, created_at)
    VALUES (
        auth.uid(),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'PERMISSION_CREATED'
            WHEN TG_OP = 'UPDATE' THEN 'PERMISSION_UPDATED'
            WHEN TG_OP = 'DELETE' THEN 'PERMISSION_DELETED'
        END,
        'CLINIC_PERMISSION',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'clinic_id', COALESCE(NEW.clinic_id, OLD.clinic_id),
            'feature_key', COALESCE(NEW.feature_key, OLD.feature_key),
            'is_enabled', COALESCE(NEW.is_enabled, OLD.is_enabled),
            'old_enabled', OLD.is_enabled,
            'reason', COALESCE(NEW.reason, OLD.reason)
        ),
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_log_permission_change ON clinic_custom_permissions;

-- Create trigger
CREATE TRIGGER trigger_log_permission_change
AFTER INSERT OR UPDATE OR DELETE ON clinic_custom_permissions
FOR EACH ROW 
EXECUTE FUNCTION log_permission_change();

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE clinic_custom_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins manage all permissions" ON clinic_custom_permissions;
DROP POLICY IF EXISTS "Clinics view own permissions" ON clinic_custom_permissions;

-- Super admins can do everything
CREATE POLICY "Super admins manage all permissions" ON clinic_custom_permissions
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'SUPER_ADMIN'
    )
);

-- Clinic users can view their own permissions
CREATE POLICY "Clinics view own permissions" ON clinic_custom_permissions
FOR SELECT 
USING (
    clinic_id IN (
        SELECT clinic_id FROM users WHERE id = auth.uid()
    )
);

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_timestamp ON clinic_custom_permissions;

CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON clinic_custom_permissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
