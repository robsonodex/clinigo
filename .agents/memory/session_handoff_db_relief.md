# Handoff - Desafogo do Banco Supabase (20/10/2026)

## Contexto
Usuário pediu análise e redução de uso do Supabase (Free plan). Painel: DB 240/500 MB, Log Ingestion 1,84/1 GB e Log Query 129,9/100 GB (ambos acima da cota). Relatório completo: `C:\Users\Robson\.gemini\antigravity-ide\brain\3ab774c7-a2b8-4843-861d-73bac4848e8d\diagnostico_supabase.md`.
Regra do usuário: NADA sem aprovação explícita dele.

## Já executado (aprovado pelo usuário, opção B)
- Migração `supabase/migrations/20261020_db_relief_phase1_stop_growth.sql` (com script reverso):
  - trigger `trigger_appointments_notifications` DESATIVADO (alimentava `notification_queue` sem consumidor);
  - crons duplicados removidos (`limpar-logs-http-diario`, `limpar-cron-details-semanal`);
  - coluna `clinics.chamada_painel_tv_habilitada boolean default true` criada (erro 400 cessou).
- TRUNCATE `notification_queue` (39.705 PENDING PRE_CHECKIN_LINK).
- DELETE `notifications` com mais de 30 dias (95.297); restam ~23,4 mil.
- `scheduled_whatsapp_messages.image_base64` = NULL em 7 enviadas/falhas; VACUUM FULL feito.
- DELETE 1.272 `checkin_capture_tokens` expirados (VACUUM FULL feito) e 1.164 `active_sessions` inativas >30 dias.
- Banco: 215 MB -> 173 MB.
- Documentado em `DOCUMENTACAO_TECNICA_V3.md` (entrada 20/10/2026).

## Agendado para hoje à noite (pg_cron, UTC)
- `clinigo-oneoff-vacuum-notifications` 01:05 UTC 21/10 (22:05 BRT): VACUUM FULL public.notifications
- `clinigo-oneoff-vacuum-active-sessions` 01:08 UTC: VACUUM FULL public.active_sessions
- `clinigo-oneoff-vacuum-cleanup` 01:30 UTC: remove os 3 jobs

## PRIMEIRA COISA AMANHÃ (verificação)
1. `select jobname, status, return_message, start_time, end_time from cron.job_run_details where command ilike '%VACUUM FULL%' order by start_time desc;`
2. Confirmar que os 3 jobs oneoff sumiram de `cron.job`.
3. Medir `pg_database_size` (esperado ~140 MB) e `pg_total_relation_size('public.notifications')`.
4. query_logs: erros em postgres_logs entre 01:00 e 01:40 UTC.
5. Lembrar o usuário de confirmar no GitHub Actions que o backup de 20/10 05:00 BRT foi concluído.

## Pendente (exige aprovação do usuário)
- Fase 3: publicação `supabase_realtime` está FOR ALL TABLES -> trocar para lista explícita (appointments, clinics, appointment_checkins, appointment_queue, chat_messages, import_jobs, appointment_slot_locks, notifications) após varredura completa; cron diário de retenção (notifications >30d, tokens, sessões); 1 notificação por série recorrente (triggers `on_new_appointment` e `trg_notify_appointment_created`); remover índices sem uso; cron 10 a cada 2 minutos (opcional).
- Fase 4 (código): middleware `getUser()` -> `getClaims()` + cache de role/clinic_id; assinaturas Base64 (25 MB em appointments.digital_signature_url) para Storage; QR sem imagem em `qr_data`; imagens WhatsApp no Storage.

## Caixa de achados (não corrigidos)
- Coluna inexistente `clinics.chamada_whatsapp_habilitada` (erro residual), `clinic_settings.smtp_host`, `doctors.percentage`.
- `auditoria_acesso_planos_sessao.resultado` recebendo NULL (15/dia).
- `/api/cron/send-notifications`: emojis nas mensagens e e-mail simulado (`return true`).
