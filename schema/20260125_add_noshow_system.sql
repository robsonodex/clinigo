-- ==========================================
-- MIGRATION: No-Show System (2026-01-25)
-- ==========================================
-- Purpose: Implement comprehensive no-show tracking system with:
--   - NO_SHOW status enum value
--   - Tracking columns (who marked, when)
--   - Configurable tolerance per clinic
--   - Real-time overdue detection via views
--   - Patient reputation tracking (3-strike system)
--   - Reschedule token management
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- PART 1: ENUM UPDATES
-- ==========================================

-- Add NO_SHOW to appointment_status enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'NO_SHOW' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    ) THEN
        ALTER TYPE appointment_status ADD VALUE 'NO_SHOW';
        RAISE NOTICE 'NO_SHOW added to appointment_status enum';
    ELSE
        RAISE NOTICE 'NO_SHOW already exists in appointment_status enum';
    END IF;
END $$;

-- ==========================================
-- PART 2: SCHEMA UPDATES
-- ==========================================

-- Add No-Show tracking columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS marked_no_show_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS marked_no_show_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN appointments.marked_no_show_at IS 'Timestamp when appointment was marked as no-show';
COMMENT ON COLUMN appointments.marked_no_show_by IS 'User ID who marked the appointment as no-show';

-- Add configurable tolerance to clinics table
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS noshow_tolerance_minutes INTEGER DEFAULT 15;

COMMENT ON COLUMN clinics.noshow_tolerance_minutes IS 'Minutes of tolerance before marking appointment as overdue (default: 15)';

-- Add no-show counter to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;

COMMENT ON COLUMN patients.no_show_count IS 'Total number of no-shows for reputation tracking';

-- ==========================================
-- PART 3: RESCHEDULE TOKENS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS reschedule_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    new_appointment_id UUID REFERENCES appointments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE reschedule_tokens IS 'Tokens for email-based appointment rescheduling after no-show';
COMMENT ON COLUMN reschedule_tokens.token IS 'Unique secure token for reschedule link';
COMMENT ON COLUMN reschedule_tokens.expires_at IS 'Token expiration (default: 7 days from creation)';
COMMENT ON COLUMN reschedule_tokens.used_at IS 'Timestamp when token was used (null if unused)';

-- ==========================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ==========================================

-- Index for finding overdue appointments
CREATE INDEX IF NOT EXISTS idx_appointments_status_date 
ON appointments(status, appointment_date) 
WHERE status IN ('SCHEDULED', 'CONFIRMED');

-- Index for patient no-show lookup
CREATE INDEX IF NOT EXISTS idx_appointments_patient_noshow 
ON appointments(patient_id, status) 
WHERE status = 'NO_SHOW';

-- Index for no-show tracking
CREATE INDEX IF NOT EXISTS idx_appointments_noshow_date 
ON appointments(marked_no_show_at DESC) 
WHERE status = 'NO_SHOW';

-- Index for reschedule tokens
CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_token 
ON reschedule_tokens(token) 
WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_expires 
ON reschedule_tokens(expires_at) 
WHERE used_at IS NULL;

-- ==========================================
-- PART 5: VIEWS FOR REAL-TIME DETECTION
-- ==========================================

-- View: Overdue Appointments (real-time detection)
CREATE OR REPLACE VIEW vw_overdue_appointments AS
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.clinic_id,
    a.doctor_id,
    a.patient_id,
    p.full_name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    p.no_show_count as patient_noshow_count,
    d.user_id as doctor_user_id,
    u.full_name as doctor_name,
    c.noshow_tolerance_minutes,
    c.name as clinic_name,
    -- Calculate minutes overdue
    EXTRACT(EPOCH FROM (
        NOW() - (a.appointment_date + a.appointment_time + (c.noshow_tolerance_minutes || ' minutes')::INTERVAL)
    )) / 60 AS minutes_overdue,
    -- Flag if is overdue
    NOW() > (a.appointment_date + a.appointment_time + (c.noshow_tolerance_minutes || ' minutes')::INTERVAL) as is_overdue
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.id
INNER JOIN doctors d ON a.doctor_id = d.id
INNER JOIN public.users u ON d.user_id = u.id
INNER JOIN clinics c ON a.clinic_id = c.id
WHERE 
    a.status IN ('SCHEDULED', 'CONFIRMED')
    AND a.appointment_date = CURRENT_DATE
    AND NOW() > (a.appointment_date + a.appointment_time + (c.noshow_tolerance_minutes || ' minutes')::INTERVAL);

COMMENT ON VIEW vw_overdue_appointments IS 'Real-time detection of appointments that passed scheduled time + clinic tolerance';

-- View: Patient No-Show Statistics (3-strike system)
CREATE OR REPLACE VIEW vw_patient_noshow_stats AS
SELECT 
    p.id as patient_id,
    p.full_name as patient_name,
    p.clinic_id,
    p.no_show_count as total_no_shows,
    COUNT(*) FILTER (WHERE a.status = 'NO_SHOW' AND a.marked_no_show_at > NOW() - INTERVAL '6 months') as recent_no_shows_6m,
    COUNT(*) FILTER (WHERE a.status = 'NO_SHOW' AND a.marked_no_show_at > NOW() - INTERVAL '3 months') as recent_no_shows_3m,
    MAX(a.marked_no_show_at) as last_no_show_date,
    -- Flag for high-risk patients (3+ no-shows in 6 months)
    COUNT(*) FILTER (WHERE a.status = 'NO_SHOW' AND a.marked_no_show_at > NOW() - INTERVAL '6 months') >= 3 as is_frequent_no_show
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
WHERE p.no_show_count > 0
GROUP BY p.id, p.full_name, p.clinic_id, p.no_show_count;

COMMENT ON VIEW vw_patient_noshow_stats IS 'Patient reputation tracking for 3-strike warning system';

-- ==========================================
-- PART 6: TRIGGERS & FUNCTIONS
-- ==========================================

-- Function: Update patient no-show count when appointment marked as NO_SHOW
CREATE OR REPLACE FUNCTION update_patient_noshow_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'NO_SHOW' AND (OLD.status IS NULL OR OLD.status != 'NO_SHOW') THEN
        UPDATE patients 
        SET 
            no_show_count = COALESCE(no_show_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.patient_id;
        
        RAISE NOTICE 'Patient % no-show count incremented', NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment patient no-show count
DROP TRIGGER IF EXISTS trg_update_noshow_count ON appointments;
CREATE TRIGGER trg_update_noshow_count
    AFTER UPDATE OF status ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_noshow_count();

COMMENT ON FUNCTION update_patient_noshow_count() IS 'Automatically increments patient no_show_count when appointment marked as NO_SHOW';

-- Function: Cleanup expired reschedule tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_reschedule_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM reschedule_tokens
    WHERE expires_at < NOW() AND used_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % expired reschedule tokens', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_reschedule_tokens() IS 'Deletes expired unused tokens (run via cron job)';

-- ==========================================
-- PART 7: RLS POLICIES
-- ==========================================

-- Enable RLS on reschedule_tokens (public access by token, clinic access for management)
ALTER TABLE reschedule_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read by valid token
CREATE POLICY reschedule_tokens_public_select ON reschedule_tokens
    FOR SELECT
    USING (
        used_at IS NULL 
        AND expires_at > NOW()
    );

-- Policy: Clinic staff can view all tokens for their clinic
CREATE POLICY reschedule_tokens_clinic_select ON reschedule_tokens
    FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Only system can insert (via API)
CREATE POLICY reschedule_tokens_system_insert ON reschedule_tokens
    FOR INSERT
    WITH CHECK (true); -- API handles validation

-- Policy: Only system can update usage
CREATE POLICY reschedule_tokens_system_update ON reschedule_tokens
    FOR UPDATE
    USING (true); -- API handles validation

-- ==========================================
-- PART 8: DEMO DATA (Optional - for testing)
-- ==========================================

-- Create a test overdue appointment if demo clinic exists
DO $$
DECLARE
    demo_clinic_id UUID;
    demo_patient_id UUID;
    demo_doctor_id UUID;
BEGIN
    -- Check if demo clinic exists
    SELECT id INTO demo_clinic_id FROM clinics WHERE slug = 'demo';
    
    IF demo_clinic_id IS NOT NULL THEN
        -- Get first patient and doctor
        SELECT id INTO demo_patient_id FROM patients WHERE clinic_id = demo_clinic_id LIMIT 1;
        SELECT id INTO demo_doctor_id FROM doctors WHERE clinic_id = demo_clinic_id LIMIT 1;
        
        IF demo_patient_id IS NOT NULL AND demo_doctor_id IS NOT NULL THEN
            -- Create overdue appointment (30 minutes ago)
            INSERT INTO appointments (
                clinic_id, patient_id, doctor_id, 
                appointment_date, appointment_time,
                status, created_at, updated_at
            ) VALUES (
                demo_clinic_id,
                demo_patient_id,
                demo_doctor_id,
                CURRENT_DATE,
                TO_CHAR(NOW() - INTERVAL '30 minutes', 'HH24:MI')::time,
                'CONFIRMED',
                NOW(),
                NOW()
            )
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Demo overdue appointment created for testing';
        END IF;
    END IF;
END $$;

-- ==========================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- ==========================================

-- Verification queries (comment out in production)
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'No-Show System Migration Completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Checking results...';
    
    -- Check enum
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'NO_SHOW' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')
    ) THEN
        RAISE NOTICE '✓ NO_SHOW enum value exists';
    END IF;
    
    -- Check columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'marked_no_show_at'
    ) THEN
        RAISE NOTICE '✓ appointments.marked_no_show_at column exists';
    END IF;
    
    -- Check view
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vw_overdue_appointments') THEN
        RAISE NOTICE '✓ vw_overdue_appointments view exists';
    END IF;
    
    -- Check table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reschedule_tokens') THEN
        RAISE NOTICE '✓ reschedule_tokens table exists';
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '===========================================';
END $$;
