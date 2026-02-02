-- FIX: Corrigir políticas RLS da tabela import_jobs
-- Execute este SQL no Supabase Dashboard -> SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own clinic imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can manage imports" ON import_jobs;
DROP POLICY IF EXISTS "Users can select own clinic imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can insert imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can update imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can delete imports" ON import_jobs;

-- Policy for SELECT: Users can view their clinic's imports
CREATE POLICY "Users can select own clinic imports" ON import_jobs
  FOR SELECT
  USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Policy for INSERT: Admins can create imports
CREATE POLICY "Admins can insert imports" ON import_jobs
  FOR INSERT
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
  );

-- Policy for UPDATE: Admins can update their clinic's imports
CREATE POLICY "Admins can update imports" ON import_jobs
  FOR UPDATE
  USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
  );

-- Policy for DELETE: Admins can delete their clinic's imports
CREATE POLICY "Admins can delete imports" ON import_jobs
  FOR DELETE
  USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
  );
