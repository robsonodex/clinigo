-- =====================================================
-- MIGRAÇÃO: Suporte a CHECKED_IN e IN_QUEUE no enum appointment_status
-- Data: 2026-09-07
-- Descrição: 
-- Adiciona os valores 'CHECKED_IN' e 'IN_QUEUE' ao enum appointment_status,
-- eliminando erro PostgreSQL 22P02 ao registrar check-in facial,
-- check-in por totem/QR e ao consultar a fila da recepção.
-- =====================================================

ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'CHECKED_IN';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'IN_QUEUE';
