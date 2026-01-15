-- ==========================================
-- MASTER FIX FOR 500/404 API ERRORS
-- ==========================================
-- Purpose: Fix ALL missing schema elements causing API failures.
-- Includes:
-- 1. Missing columns in 'clinics' (Billing)
-- 2. Missing columns in 'financial_entries' (Billing)
-- 3. Missing table 'appointment_slot_locks' (Appointments)
-- 4. Missing table 'appointment_lock_audit' (Appointments)
-- 5. Missing columns in 'medical_records' (Medical Records - Re-apply)
-- ==========================================

-- 1. FIX CLINICS TABLE (Billing)
-- ==========================================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days');
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'active';

-- 2. FIX FINANCIAL_ENTRIES TABLE (Billing)
-- ==========================================
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. CREATE APPOINTMENT SLOT LOCKS (Appointments)
-- ==========================================
CREATE TABLE IF NOT EXISTS appointment_slot_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    slot_datetime TIMESTAMPTZ NOT NULL,
    locked_by UUID NOT NULL REFERENCES auth.users(id),
    lock_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, CONFIRMED, RELEASED
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup/cleanup
CREATE INDEX IF NOT EXISTS idx_slot_locks_doctor_datetime ON appointment_slot_locks(doctor_id, slot_datetime);
CREATE INDEX IF NOT EXISTS idx_slot_locks_expires_at ON appointment_slot_locks(expires_at);

-- RLS
ALTER TABLE appointment_slot_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to locks" ON appointment_slot_locks;
CREATE POLICY "Public access to locks" ON appointment_slot_locks FOR ALL USING (true);


-- 4. CREATE APPOINTMENT LOCK AUDIT (Appointments)
-- ==========================================
CREATE TABLE IF NOT EXISTS appointment_lock_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_id UUID NOT NULL REFERENCES appointment_slot_locks(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointment_lock_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert audit" ON appointment_lock_audit;
CREATE POLICY "Public insert audit" ON appointment_lock_audit FOR INSERT WITH CHECK (true);


-- 5. CREATE DOCTOR HEALTH INSURANCES (If missing)
-- ==========================================
-- Ensure referenced tables exist first (basic check, assume health_insurance_plans exists or will error beneficially)
-- If this fails because health_insurance_plans is missing, run health-insurances.sql first.

CREATE TABLE IF NOT EXISTS doctor_health_insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    health_insurance_plan_id UUID NOT NULL, -- Weak reference to avoid dependency hell if table missing, ideally REFERENCES health_insurance_plans(id)
    consultation_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    accepts_new_patients BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doctor_id, health_insurance_plan_id)
);

ALTER TABLE doctor_health_insurances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access doctor insurances" ON doctor_health_insurances;
CREATE POLICY "Public access doctor insurances" ON doctor_health_insurances FOR ALL USING (true);


-- 6. FIX MEDICAL RECORDS (Medical Records)
-- ==========================================
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS present_illness TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS physical_exam TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS treatment_plan TEXT;

-- Verify clinic_id exists on medical_records (it should from base schema, but ensure)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'clinic_id') THEN
        ALTER TABLE medical_records ADD COLUMN clinic_id UUID REFERENCES clinics(id);
    END IF;
END $$;
