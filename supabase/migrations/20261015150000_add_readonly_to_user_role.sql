-- Migration: 20261015150000_add_readonly_to_user_role.sql
-- Descrição: Adiciona o valor 'READONLY' ao enum nativo user_role no PostgreSQL para suportar o perfil de Apenas Leitura (Auditoria / Visualização)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'READONLY'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'READONLY';
    END IF;
END $$;
