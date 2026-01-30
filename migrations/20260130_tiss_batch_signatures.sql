-- ============================================================================
-- CliniGo Migration: TISS Batch Signatures
-- ============================================================================
-- Purpose: Store digital signature audit trail for TISS batches
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: tiss_batch_signatures
-- Purpose: Audit trail for digital signatures on TISS batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiss_batch_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES tiss_batches(id) ON DELETE CASCADE,
    
    -- Certificate Information
    certificate_hash TEXT NOT NULL,           -- SHA-256 hash of certificate
    certificate_cn TEXT,                      -- Common Name from certificate
    certificate_valid_from TIMESTAMPTZ,       -- Certificate validity start
    certificate_valid_until TIMESTAMPTZ,      -- Certificate validity end
    
    -- Signature Details
    signature_algorithm TEXT DEFAULT 'RSA-SHA256',
    canonicalization TEXT DEFAULT 'C14N',
    
    -- Storage
    signed_xml_url TEXT,                      -- URL to signed XML in storage
    
    -- Audit
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    signed_by UUID REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tiss_batch_signatures_batch 
    ON tiss_batch_signatures(batch_id);

CREATE INDEX IF NOT EXISTS idx_tiss_batch_signatures_cert_hash 
    ON tiss_batch_signatures(certificate_hash);

CREATE INDEX IF NOT EXISTS idx_tiss_batch_signatures_signed_at 
    ON tiss_batch_signatures(signed_at);

-- ---------------------------------------------------------------------------
-- Constraint: Batch must be signed before status = 'SENT'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_batch_signature_before_send()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when status changes to 'SENT' or 'SUBMITTED'
    IF NEW.status IN ('SENT', 'SUBMITTED') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('SENT', 'SUBMITTED')) THEN
        
        -- Check if signature exists
        IF NOT EXISTS (
            SELECT 1 FROM tiss_batch_signatures 
            WHERE batch_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Batch must be digitally signed before sending. Use /api/tiss/batches/%/sign endpoint.', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tiss_batches
DROP TRIGGER IF EXISTS enforce_batch_signature ON tiss_batches;
CREATE TRIGGER enforce_batch_signature
    BEFORE UPDATE ON tiss_batches
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_signature_before_send();

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE tiss_batch_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view signatures for batches from their clinic
CREATE POLICY "view_clinic_signatures" ON tiss_batch_signatures
    FOR SELECT USING (
        batch_id IN (
            SELECT id FROM tiss_batches 
            WHERE clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
        )
    );

-- Users can insert signatures for batches from their clinic
CREATE POLICY "insert_clinic_signatures" ON tiss_batch_signatures
    FOR INSERT WITH CHECK (
        batch_id IN (
            SELECT id FROM tiss_batches 
            WHERE clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
        )
    );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT ALL ON tiss_batch_signatures TO authenticated;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE tiss_batch_signatures IS 'Digital signature audit trail for TISS batch submissions';
COMMENT ON COLUMN tiss_batch_signatures.certificate_hash IS 'SHA-256 hash of the X.509 certificate used for signing';
COMMENT ON COLUMN tiss_batch_signatures.certificate_cn IS 'Common Name (CN) from the certificate subject';
COMMENT ON FUNCTION check_batch_signature_before_send IS 'Ensures batches are digitally signed before being marked as sent';

-- ---------------------------------------------------------------------------
-- Rollback Script (for reference)
-- ---------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS enforce_batch_signature ON tiss_batches;
-- DROP FUNCTION IF EXISTS check_batch_signature_before_send();
-- DROP TABLE IF EXISTS tiss_batch_signatures;
