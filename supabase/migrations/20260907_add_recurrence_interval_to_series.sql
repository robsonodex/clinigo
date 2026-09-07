-- ================================================================
-- Migration: Add recurrence_interval and frequency to recurring_appointment_series
-- Purpose: Support biweekly / fortnightly (de 15 em 15 dias) and monthly recurring appointments
-- Date: 2026-09-07
-- ================================================================

ALTER TABLE recurring_appointment_series
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;

ALTER TABLE recurring_appointment_series
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'weekly';

COMMENT ON COLUMN recurring_appointment_series.recurrence_interval IS 'Intervalo em semanas: 1=Semanal (toda semana), 2=Quinzenal (de 15 em 15 dias / a cada 2 semanas), 4=Mensal';
COMMENT ON COLUMN recurring_appointment_series.frequency IS 'Tipo de periodicidade: weekly | biweekly | monthly';
