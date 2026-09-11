-- Migration: 20260911_receptionist_delete_patient_documents.sql
-- Permite que recepcionistas excluam documentos operacionais de pacientes da sua própria clínica

DROP POLICY IF EXISTS "documents_delete_by_role" ON patient_documents;

CREATE POLICY "documents_delete_by_role" ON patient_documents
FOR DELETE
TO public
USING (
  CASE get_user_role()
    WHEN 'SUPER_ADMIN'::user_role THEN true
    WHEN 'CLINIC_ADMIN'::user_role THEN (
      patient_id IN (
        SELECT p.id FROM patients p WHERE p.clinic_id = get_user_clinic_id()
      )
    )
    WHEN 'RECEPTIONIST'::user_role THEN (
      category != 'personal' AND
      patient_id IN (
        SELECT p.id FROM patients p WHERE p.clinic_id = get_user_clinic_id()
      )
    )
    WHEN 'DOCTOR'::user_role THEN (
      (uploaded_by = auth.uid()) AND
      CASE
        WHEN (SELECT u.is_coordinator FROM users u WHERE u.id = auth.uid()) THEN (
          patient_id IN (
            SELECT p.id FROM patients p WHERE p.clinic_id = get_user_clinic_id()
          )
        )
        ELSE (
          patient_id IN (
            SELECT DISTINCT a.patient_id
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor_id
            WHERE d.user_id = auth.uid()
          )
        )
      END
    )
    ELSE false
  END
);
