-- Migration: Otimização e Índices para Extrato de Repasse via WhatsApp (Prioridade 1)
-- Data: 02/09/2026

-- 1. Índices para busca rápida por telefone e perfil do profissional
CREATE INDEX IF NOT EXISTS idx_users_phone_role ON users(phone, role);
CREATE INDEX IF NOT EXISTS idx_users_clinic_phone ON users(clinic_id, phone);

-- 2. Índice composto para cálculo de repasse mensal instantâneo
CREATE INDEX IF NOT EXISTS idx_appointments_repasse_calc ON appointments(clinic_id, doctor_id, status, appointment_date);

-- 3. Índice para busca de contratos ativos do profissional
CREATE INDEX IF NOT EXISTS idx_doctor_contracts_active ON doctor_contracts(doctor_id, is_active, clinic_id);

-- 4. Comentário explicativo
COMMENT ON INDEX idx_users_phone_role IS 'Índice de alta performance para autenticação de comandos WhatsApp por telefone';
COMMENT ON INDEX idx_appointments_repasse_calc IS 'Índice otimizado para cálculo de extrato e produção em tempo real';
