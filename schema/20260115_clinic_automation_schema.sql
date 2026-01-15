-- ==========================================
-- CLINIC AUTOMATION CONFIGS
-- ==========================================
-- Stores personalized automation settings for each clinic.

CREATE TABLE IF NOT EXISTS public.clinic_automation_configs (
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  automation_type VARCHAR(50) NOT NULL, -- 'appointment_reminders', 'doctor_payroll', 'tiss_batch'
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinic_id, automation_type)
);

-- Enable RLS
ALTER TABLE public.clinic_automation_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their clinic configs" 
ON public.clinic_automation_configs
FOR SELECT 
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can update their clinic configs" 
ON public.clinic_automation_configs
FOR ALL
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role = 'CLINIC_ADMIN'
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.clinic_automation_configs;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.clinic_automation_configs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_auto_clinic ON public.clinic_automation_configs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_auto_type ON public.clinic_automation_configs(automation_type);

-- Default values insertion (Optional helper, can be run manually or via app logic)
-- INSERT INTO clinic_automation_configs (clinic_id, automation_type, is_enabled, config)
-- SELECT id, 'appointment_reminders', true, '{"reminder_24h": true}'::jsonb FROM clinics WHERE is_active = true ON CONFLICT DO NOTHING;
