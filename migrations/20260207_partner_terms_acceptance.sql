-- Migration: Add terms acceptance fields to partners table
-- Date: 2026-02-07
-- Purpose: Track partner terms acceptance with metadata

-- Add terms acceptance fields
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_accepted_ip VARCHAR(45) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN partners.terms_accepted_at IS 'Timestamp when partner accepted the partnership terms';
COMMENT ON COLUMN partners.terms_version IS 'Version of terms accepted (e.g., 1.0)';
COMMENT ON COLUMN partners.terms_accepted_ip IS 'IP address from which terms were accepted';

-- Index for auditing purposes
CREATE INDEX IF NOT EXISTS idx_partners_terms_accepted 
ON partners(terms_accepted_at) 
WHERE terms_accepted_at IS NOT NULL;
