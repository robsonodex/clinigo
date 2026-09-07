-- ================================================================
-- Migration: Expand slot_duration_minutes and shift limits on schedules table
-- Purpose: Allow flexible therapy durations (50m, 80m, 90m, 120m, 180m, custom)
-- Date: 2026-09-07
-- ================================================================

DO $$
BEGIN
  -- Drop old restrictive constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_slot_duration'
  ) THEN
    ALTER TABLE schedules DROP CONSTRAINT valid_slot_duration;
  END IF;

  -- Add new flexible constraint allowing durations from 5 minutes to 480 minutes (8h)
  ALTER TABLE schedules
  ADD CONSTRAINT valid_slot_duration
  CHECK (slot_duration_minutes >= 5 AND slot_duration_minutes <= 480);
END $$;
