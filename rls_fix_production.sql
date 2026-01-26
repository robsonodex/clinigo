-- ==========================================
-- CORREÇÃO DE PERMISSÕES (RLS) PARA PRODUÇÃO
-- Execute este script no SQL Editor do Supabase
-- ==========================================

-- 1. Garantir que RLS está ativo
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para Tabela DOCTORS

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Doctors viewable by everyone" ON doctors;
DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON doctors;
DROP POLICY IF EXISTS "Admins can manage doctors" ON doctors;

-- LEITURA: Permitir que qualquer pessoa autenticada (ou não, se público) veja médicos
-- Isso corrige o erro 404 ao tentar buscar um médico que existe mas está "invisível"
CREATE POLICY "Doctors viewable by everyone" 
ON doctors FOR SELECT 
USING (true);

-- ESCRITA: Permitir que Admins gerenciem médicos da sua clínica
CREATE POLICY "Admins can manage doctors" 
ON doctors FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE clinic_id = doctors.clinic_id AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
  )
);

-- 3. Políticas para Tabela SCHEDULES

-- Remover políticas antigas
DROP POLICY IF EXISTS "Schedules viewable by everyone" ON schedules;
DROP POLICY IF EXISTS "Schedules are viewable by everyone" ON schedules;
DROP POLICY IF EXISTS "Admins and Doctors can manage schedules" ON schedules;

-- LEITURA: Permitir ver horários
CREATE POLICY "Schedules viewable by everyone" 
ON schedules FOR SELECT 
USING (true);

-- ESCRITA: Permitir Admin e o próprio Médico editar
CREATE POLICY "Admins and Doctors can manage schedules" 
ON schedules FOR ALL 
USING (
  -- Admin da mesma clínica
  (auth.uid() IN (
    SELECT id FROM users 
    WHERE clinic_id = schedules.clinic_id AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
  ))
  OR 
  -- O próprio médico
  (auth.uid() IN (
    SELECT user_id FROM doctors WHERE id = schedules.doctor_id
  ))
);

-- FIM DO SCRIPT
