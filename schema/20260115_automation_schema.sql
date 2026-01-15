-- Automation System Schema (2026-01-15)

-- 1. Notification System
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  type VARCHAR(50) NOT NULL, -- 'REMINDER_24H', 'REMINDER_2H', 'REMINDER_15MIN'
  channel VARCHAR(20) NOT NULL, -- 'EMAIL', 'WHATSAPP', 'SMS'
  status VARCHAR(20) DEFAULT 'PENDING', -- 'SENT', 'FAILED', 'SKIPPED'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_appointment ON notification_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_status ON notification_logs(status, created_at);

-- 2. Payroll System
CREATE OR REPLACE FUNCTION update_payroll_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if we have a valid doctor_id
  IF NEW.doctor_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE medical_payroll
  SET 
    total_consultations = (
      SELECT COUNT(*) 
      FROM appointments 
      WHERE doctor_id = NEW.doctor_id 
        AND status = 'COMPLETED'
        AND scheduled_at >= NEW.period_start 
        AND scheduled_at <= NEW.period_end
    ),
    total_amount = (
      SELECT COALESCE(SUM(payment_amount * (dc.percentage / 100)), 0)
      FROM appointments a
      JOIN doctor_contracts dc ON a.doctor_id = dc.doctor_id
      WHERE a.doctor_id = NEW.doctor_id
        AND a.status = 'COMPLETED'
        AND a.scheduled_at >= NEW.period_start 
        AND a.scheduled_at <= NEW.period_end
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_payroll ON medical_payroll;
CREATE TRIGGER trg_update_payroll 
AFTER INSERT OR UPDATE ON medical_payroll
FOR EACH ROW EXECUTE FUNCTION update_payroll_totals();

-- 3. TISS Return Processing
CREATE OR REPLACE FUNCTION notify_new_tiss_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via HTTP (requires pg_net extension usually, or native supabase http)
  -- Using pg_net.http_post if available, otherwise this might need adjustment based on specific supabase setup.
  -- Assuming 'net' extension is enabled as per requirement context.
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_base_url', true) || '/process-tiss-return',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'return_id', NEW.id,
      'storage_path', NEW.storage_path
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_tiss_return ON tiss_returns;
CREATE TRIGGER trg_new_tiss_return
AFTER INSERT ON tiss_returns
FOR EACH ROW
WHEN (NEW.processing_status = 'PENDING')
EXECUTE FUNCTION notify_new_tiss_return();

-- 4. System Health
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'HEALTHY', -- 'HEALTHY', 'DEGRADED', 'DOWN'
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
