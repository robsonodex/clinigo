-- Migration: 20261020_db_relief_phase1_stop_growth.sql
-- Descricao: Fase 1 do plano de desafogo do banco (aplicada via MCP em 20/10/2026)
--   1. Desativa o trigger que alimentava notification_queue (fila sem consumidor ativo)
--   2. Remove crons duplicados de limpeza (mantidos clinigo-cleanup-pg-net-logs e clinigo-cleanup-cron-job-logs)
--   3. Cria a coluna clinics.chamada_painel_tv_habilitada (consultada pelo codigo e inexistente, gerando HTTP 400)
--
-- Reverso:
--   ALTER TABLE public.appointments ENABLE TRIGGER trigger_appointments_notifications;
--   SELECT cron.schedule('limpar-logs-http-diario','0 3 * * *','TRUNCATE TABLE net._http_response');
--   SELECT cron.schedule('limpar-cron-details-semanal','15 3 * * 0','DELETE FROM cron.job_run_details WHERE start_time < NOW() - INTERVAL ''3 days''');
--   ALTER TABLE public.clinics DROP COLUMN IF EXISTS chamada_painel_tv_habilitada;

ALTER TABLE public.appointments DISABLE TRIGGER trigger_appointments_notifications;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-logs-http-diario') THEN
    PERFORM cron.unschedule('limpar-logs-http-diario');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpar-cron-details-semanal') THEN
    PERFORM cron.unschedule('limpar-cron-details-semanal');
  END IF;
END $$;

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS chamada_painel_tv_habilitada boolean NOT NULL DEFAULT true;
