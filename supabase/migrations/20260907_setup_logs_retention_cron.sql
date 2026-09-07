-- ==============================================================================
-- Migration: 20260907_setup_logs_retention_cron.sql
-- Descrição: Configura a política de retenção automática e expurgo de logs 
--            internos das extensões pg_cron e pg_net para evitar acúmulo de bloat.
-- ==============================================================================

-- 1. Expurgo diário de histórico de execuções do pg_cron (> 7 dias)
SELECT cron.schedule(
    'purge-old-cron-job-run-details',
    '0 3 * * *',
    'DELETE FROM cron.job_run_details WHERE start_time < now() - interval ''7 days'';'
);

-- 2. Expurgo diário de respostas HTTP do pg_net (> 3 dias)
SELECT cron.schedule(
    'purge-old-net-http-responses',
    '0 4 * * *',
    'DELETE FROM net._http_response WHERE created < now() - interval ''3 days'';'
);
