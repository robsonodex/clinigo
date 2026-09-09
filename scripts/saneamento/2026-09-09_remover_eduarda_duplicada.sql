-- Saneamento Seguro: Remover profissional duplicada Eduarda (id: 225a86a0-4f9b-4c70-a352-5918823ea794)
-- O perfil ativo oficial da Eduarda permanece intacto (id: 188d57d9-645a-414e-8595-f0b668c7e350).
-- Backup realizado previamente em scripts/saneamento/backup_eduarda_225a86a0_2026-09-09.json.

BEGIN;

-- 1. Deletar notificacoes pendentes dos 628 agendamentos orfaos
DELETE FROM notification_queue
WHERE appointment_id IN (
    SELECT id FROM appointments WHERE doctor_id = '225a86a0-4f9b-4c70-a352-5918823ea794'
);

-- 2. Deletar os 628 agendamentos orfaos que causavam o status "Indisponivel"
DELETE FROM appointments
WHERE doctor_id = '225a86a0-4f9b-4c70-a352-5918823ea794';

-- 3. Deletar as 4 series recorrentes da profissional inativa
DELETE FROM recurring_appointment_series
WHERE doctor_id = '225a86a0-4f9b-4c70-a352-5918823ea794';

-- 4. Deletar o registro de doutor duplicado
DELETE FROM doctors
WHERE id = '225a86a0-4f9b-4c70-a352-5918823ea794';

COMMIT;
