-- Migration: 20261020_db_relief_phase3_retention_crons.sql
-- Descricao: Fase 3 do plano de desafogo do banco - Crons de retencao controlada
--   1. clinigo-retention-notifications-read-90d: Remove notificacoes lidas com mais de 90 dias (lote maximo 5000)
--   2. clinigo-retention-checkin-tokens-expired: Remove tokens de captura de check-in expirados ha mais de 7 dias
--
-- Reverso:
--   SELECT cron.unschedule('clinigo-retention-notifications-read-90d');
--   SELECT cron.unschedule('clinigo-retention-checkin-tokens-expired');

SELECT cron.schedule(
  'clinigo-retention-notifications-read-90d',
  '30 6 * * *',  -- 03:30 BRT (06:30 UTC)
  $$DELETE FROM public.notifications
    WHERE id IN (
      SELECT id FROM public.notifications
      WHERE read = true AND created_at < now() - interval '90 days'
      ORDER BY created_at
      LIMIT 5000
    )$$
);

SELECT cron.schedule(
  'clinigo-retention-checkin-tokens-expired',
  '35 6 * * *',  -- 03:35 BRT (06:35 UTC)
  $$DELETE FROM public.checkin_capture_tokens
    WHERE expires_at < now() - interval '7 days'$$
);
