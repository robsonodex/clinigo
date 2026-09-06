-- Migration: 20260906_world_sensory_updates.sql
-- Descrição: Adiciona o valor 'FINANCIAL' ao enum user_role e ativa o módulo 'evolucao_world_sensory' exclusivamente para World Sensory e Demo Teste.

-- 1. Adicionar FINANCIAL ao enum user_role se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'FINANCIAL'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'FINANCIAL';
    END IF;
END $$;

-- 2. Habilitar módulo exclusivo 'evolucao_world_sensory' para World Sensory e Clinica Demo Teste
INSERT INTO clinica_modulos (clinica_id, modulo_id, ativo, created_at, updated_at)
VALUES 
    ('4c13e586-5390-4393-a180-2c9dd7ed81c7', 'evolucao_world_sensory', true, NOW(), NOW()),
    ('0c9ccb05-8530-4f8d-8d64-dd3eb6614e30', 'evolucao_world_sensory', true, NOW(), NOW())
ON CONFLICT (clinica_id, modulo_id) 
DO UPDATE SET ativo = true, updated_at = NOW();
