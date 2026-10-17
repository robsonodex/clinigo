-- Migration: 20261016230000_optimize_whatsapp_cron_and_index.sql
-- Descrição: Cria índice parcial para scheduled_whatsapp_messages e adiciona gate condicional no pg_cron
-- Data: 2026-10-16

-- 1. Índice parcial para consultas da fila pendente (index scan ultra-rápido)
CREATE INDEX IF NOT EXISTS idx_scheduled_whatsapp_pending 
    ON public.scheduled_whatsapp_messages(scheduled_for) 
    WHERE status = 'pending';

-- 2. Criar função gate que só aciona o worker via pg_net se houver mensagens pendentes vencidas
CREATE OR REPLACE FUNCTION public.trigger_scheduled_whatsapp_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
BEGIN
    -- Só executa a requisição HTTP se houver pelo menos uma mensagem pendente com data vencida
    IF EXISTS (
        SELECT 1 
        FROM public.scheduled_whatsapp_messages 
        WHERE status = 'pending' 
        AND scheduled_for <= now()
    ) THEN
        PERFORM net.http_get(
            url := 'https://clinigo.app/api/cron/send-scheduled-whatsapp',
            timeout_milliseconds := 15000
        );
    END IF;
END;
$$;

-- Revogar acesso público e conceder apenas ao banco
REVOKE ALL ON FUNCTION public.trigger_scheduled_whatsapp_worker() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_scheduled_whatsapp_worker() TO postgres;

-- 3. Atualizar o agendamento no pg_cron para usar a função gate
-- Remove qualquer agendamento anterior cujo comando contenha 'send-scheduled-whatsapp' (nunca por jobid fixo)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT jobid 
        FROM cron.job 
        WHERE (command LIKE '%send-scheduled-whatsapp%' OR command LIKE '%trigger_scheduled_whatsapp_worker%')
    ) LOOP
        PERFORM cron.unschedule(r.jobid);
    END LOOP;
END $$;

-- Agendar execução a cada 1 minuto com o gate condicional
SELECT cron.schedule(
    'send-scheduled-whatsapp-gate',
    '* * * * *',
    $$ SELECT public.trigger_scheduled_whatsapp_worker(); $$
);

/*
-- ============================================================================
-- SQL DE ROLLBACK (Executar no Supabase SQL Editor para reverter totalmente):
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT jobid 
        FROM cron.job 
        WHERE command LIKE '%trigger_scheduled_whatsapp_worker%'
    ) LOOP
        PERFORM cron.unschedule(r.jobid);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.trigger_scheduled_whatsapp_worker();
DROP INDEX IF EXISTS public.idx_scheduled_whatsapp_pending;

-- Restaurar agendamento direto anterior caso necessário:
SELECT cron.schedule(
    'send-scheduled-whatsapp-direct',
    '* * * * *',
    $$ SELECT net.http_get(url := 'https://clinigo.app/api/cron/send-scheduled-whatsapp'); $$
);
-- ============================================================================
*/
