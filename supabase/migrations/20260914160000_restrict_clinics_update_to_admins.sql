-- Migration: 20260914160000_restrict_clinics_update_to_admins.sql
-- Description: Restrict UPDATE on public.clinics exclusively to CLINIC_ADMIN and SUPER_ADMIN.
-- Revokes the permissive "Users can update their clinic" policy that lacked role validation.

-- 1. Drop existing permissive and redundant update policies
DROP POLICY IF EXISTS "Users can update their clinic" ON public.clinics;
DROP POLICY IF EXISTS "Clinic Admin can update their whatsapp settings" ON public.clinics;
DROP POLICY IF EXISTS "Clinic Admin can update whatsapp settings" ON public.clinics;
DROP POLICY IF EXISTS "clinic_admin_update_own_clinic" ON public.clinics;

-- 2. Create single unified, strict UPDATE policy for clinic admins and super admins
CREATE POLICY "clinic_admin_update_own_clinic" ON public.clinics
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT u.clinic_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    id IN (
        SELECT u.clinic_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    )
);

-- 3. Restore WorldSensory professional_label to 'Terapeuta' and council_label to 'CREFITO'
UPDATE public.clinics
SET 
    professional_label = 'Terapeuta',
    council_label = 'CREFITO',
    updated_at = NOW()
WHERE id = '4c13e586-5390-4393-a180-2c9dd7ed81c7';
