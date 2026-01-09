-- ============================================
-- CliniGo - Patients Table
-- Data: 2026-01-09
-- ============================================

-- Create patients table if not exists
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    
    -- Personal data
    full_name TEXT NOT NULL,
    cpf TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'O')),
    
    -- Address
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    
    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    -- Medical info
    blood_type TEXT,
    allergies TEXT,
    observations TEXT,
    
    -- LGPD
    is_active BOOLEAN DEFAULT TRUE,
    is_anonymized BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table already exists (migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'patients' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.patients ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'patients' 
                   AND column_name = 'is_anonymized') THEN
        ALTER TABLE public.patients ADD COLUMN is_anonymized BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'patients' 
                   AND column_name = 'gender') THEN
        ALTER TABLE public.patients ADD COLUMN gender TEXT CHECK (gender IN ('M', 'F', 'O'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'patients' 
                   AND column_name = 'allergies') THEN
        ALTER TABLE public.patients ADD COLUMN allergies TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'patients' 
                   AND column_name = 'blood_type') THEN
        ALTER TABLE public.patients ADD COLUMN blood_type TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "patients_select" ON public.patients;
CREATE POLICY "patients_select" ON public.patients
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "patients_insert" ON public.patients;
CREATE POLICY "patients_insert" ON public.patients
    FOR INSERT WITH CHECK (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "patients_update" ON public.patients;
CREATE POLICY "patients_update" ON public.patients
    FOR UPDATE USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "patients_delete" ON public.patients;
CREATE POLICY "patients_delete" ON public.patients
    FOR DELETE USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
    );

-- Indexes (only create if column exists)
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON public.patients(full_name);

-- Create partial index only if is_active column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'patients' 
               AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_patients_is_active ON public.patients(is_active) WHERE is_active = TRUE;
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT 'patients table created/updated successfully' as status;
