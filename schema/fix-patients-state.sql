-- Fix: Add missing address columns to patients table

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS state VARCHAR(2);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS address VARCHAR(255);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN ('state', 'city', 'zip_code', 'address', 'neighborhood', 'address_number', 'address_complement');
