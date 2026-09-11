-- Migration: 20260910_allow_student_in_recurring_appointment_type.sql
-- Description: Permite o valor 'STUDENT' no check constraint valid_appointment_type da tabela recurring_appointment_series

ALTER TABLE recurring_appointment_series 
DROP CONSTRAINT IF EXISTS valid_appointment_type;

ALTER TABLE recurring_appointment_series 
ADD CONSTRAINT valid_appointment_type 
CHECK (appointment_type = ANY (ARRAY['presencial'::text, 'online'::text, 'STUDENT'::text]));
