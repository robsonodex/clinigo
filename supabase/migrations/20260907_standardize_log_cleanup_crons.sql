-- Migration: 20260907_standardize_log_cleanup_crons.sql
-- Descricao: Padronizacao das rotinas automaticas de limpeza de logs no Postgres (pg_net e pg_cron)
-- Data: 2026-09-07

-- 1. Assegurar remocao de crons duplicados
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-cron-job-run-details') THEN
        PERFORM cron.unschedule('purge-old-cron-job-run-details');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-net-http-responses') THEN
        PERFORM cron.unschedule('purge-old-net-http-responses');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clinigo-cleanup-pg-net-logs') THEN
        PERFORM cron.unschedule('clinigo-cleanup-pg-net-logs');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clinigo-cleanup-cron-job-logs') THEN
        PERFORM cron.unschedule('clinigo-cleanup-cron-job-logs');
    END IF;
END $$;

-- 2. Agendar limpeza diaria de logs do pg_net (03:00 UTC, retencao de 3 dias)
SELECT cron.schedule(
    'clinigo-cleanup-pg-net-logs',
    '0 3 * * *',
    $$ DELETE FROM net._http_response WHERE created < now() - interval '3 days'; $$
);

-- 3. Agendar limpeza diaria de logs do pg_cron (03:10 UTC, retencao de 14 dias)
SELECT cron.schedule(
    'clinigo-cleanup-cron-job-logs',
    '10 3 * * *',
    $$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '14 days'; $$
);
