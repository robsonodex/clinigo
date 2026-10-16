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
DO $$
BEGIN
    -- Remover agendamentos anteriores do worker se existirem
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-whatsapp-worker') THEN
        PERFORM cron.unschedule('send-scheduled-whatsapp-worker');
    END IF;
    -- Se o job 1 for o worker, desmarcar para evitar duplicidade
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobid = 1) THEN
        PERFORM cron.unschedule(1);
    END IF;
END $$;

SELECT cron.schedule(
    'send-scheduled-whatsapp-worker',
    '* * * * *',
    $$ SELECT public.trigger_scheduled_whatsapp_worker(); $$
);
