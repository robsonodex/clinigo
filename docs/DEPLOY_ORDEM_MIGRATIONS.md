# Ordem Oficial de Execução das Migrations - CliniGo (Atualizado até Outubro/2026)

> **IMPORTANTE E OBRIGATÓRIO:** Todas as migrations listadas abaixo **DEVEM** ser executadas no banco de dados Supabase de produção no **SQL Editor**, exatamente na sequência descrita, **ANTES** do deploy do código da aplicação. Caso o deploy seja realizado sem as migrações prévias, rotas de faturamento, tarefas, autenticação e licenciamento falharão por ausência de colunas, enums ou RPCs.

---

## 1. Resumo Executivo da Sequência Completa de Migrations

| Ordem | Arquivo de Migration | Dependência no Código | Status Pré-Deploy |
|---|---|---|---|
| **1** | `20260929120000_tiss_convenios_glosas_repasse.sql` | Catálogo TUSS, tabela de preços, motivos de glosa ANS, saldo em `tiss_authorization_requests` | Obrigatória antes |
| **2** | `20260929130000_tiss_undo_rpc_and_reimport.sql` | RPC `tiss_undo_return_import`, coluna `status` em `tiss_return_imports` | Obrigatória antes |
| **3** | `20260929140000_tiss_batch_hash_tracking.sql` | Colunas `hash_algorithm`, `hash_value`, `xml_generated_at` em `tiss_batches` | Obrigatória antes |
| **4** | `20260929150000_tiss_premium_foundation.sql` | Tabela `tiss_guide_counters`, RPC `generate_tiss_guide_number`, colunas `deleted_at`, `deleted_by`, `version` | Obrigatória antes |
| **5** | `20260929160000_tiss_premium_hardening.sql` | Hardening da RPC `generate_tiss_guide_number` com `SET search_path`, lock transacional e backfill de numeração | Obrigatória antes |
| **6** | `20260929170000_tiss_guide_cancelled_status.sql` | Colunas `cancellation_reason`, `cancelled_at`, `cancelled_by` em `tiss_guides` e tabela `tiss_batch_xml_versions` | Obrigatória antes |
| **7** | `20260930100000_create_patient_intake_module.sql` | Tabela `patient_intake_links` para admissão e pré-cadastro digital com envio de documentos | Obrigatória antes |
| **8** | `20260930110000_tiss_premium_p0_extensions.sql` | Tabelas `tiss_appeals` (recursos de glosa) e `tiss_appeal_templates` (modelos) | Obrigatória antes |
| **9** | `20261009120000_seat_licensing.sql` | Licenciamento por assentos: colunas `seat_price_override_cents`, `seat_overage_waived` e tabela `seat_billing_events` | Obrigatória antes |
| **10** | `20261013140000_create_tasks_and_projects_module.sql` | Módulo de projetos e tarefas: `task_projects`, `clinic_tasks`, `clinic_task_checklists` | Obrigatória antes |
| **11** | `20261015150000_add_readonly_to_user_role.sql` | Extensão do enum nativo `user_role` para incluir o valor 'READONLY' | Obrigatória antes |
| **12** | `20261016230000_optimize_whatsapp_cron_and_index.sql` | Índice parcial `idx_scheduled_whatsapp_pending` e gate condicional `trigger_scheduled_whatsapp_worker()` | Obrigatória antes |
| **13** | `20261016230001_create_platform_settings.sql` | Tabela `platform_settings` para modo de manutenção global e feature flags | Obrigatória antes |

---

## 2. Detalhamento e Queries de Verificação Imediata

### Migrations 1 a 6: Núcleo do Faturamento TISS
- **O que fazem:** Criam o catálogo TUSS oficial, as tabelas de preço por convênio, o versionamento de XML e a numeração sequencial atômica sem colisão.
- **Query de Verificação:**
  ```sql
  SELECT 
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'tuss_procedures') AS tuss_ok,
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_guide_counters') AS counters_ok,
      (SELECT count(*) FROM pg_proc WHERE proname = 'generate_tiss_guide_number') AS rpc_guide_ok,
      (SELECT count(*) FROM pg_proc WHERE proname = 'tiss_undo_return_import') AS rpc_undo_ok;
  ```
  *Todos os campos devem retornar 1.*

### Migrations 7 e 8: Pré-Cadastro Digital e Recursos de Glosa
- **O que fazem:** Permitem que pacientes enviem fotos de documentos e laudos antes da consulta e viabilizam o recurso formal de glosas com prazos e justificativas ANS.
- **Query de Verificação:**
  ```sql
  SELECT 
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'patient_intake_links') AS intake_ok,
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_appeals') AS appeals_ok;
  ```

### Migration 9: Licenciamento por Assentos (`20261009120000_seat_licensing.sql`)
- **O que faz:** Adiciona o modelo corporativo de cobrança transparente por licença adicional, com tabela probatória imutável (`seat_billing_events`) protegida por RLS.
- **Query de Verificação:**
  ```sql
  SELECT 
      (SELECT count(*) FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'seat_price_override_cents') AS col_seat_ok,
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'seat_billing_events') AS table_seat_ok;
  ```

### Migration 10: Projetos e Tarefas da Equipe (`20261013140000_create_tasks_and_projects_module.sql`)
- **O que faz:** Implementa o Kanban corporativo, tarefas com checklists e cálculo de farol de prazos (SLA).
- **Query de Verificação:**
  ```sql
  SELECT 
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'task_projects') AS projects_ok,
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'clinic_tasks') AS tasks_ok,
      (SELECT count(*) FROM information_schema.tables WHERE table_name = 'clinic_task_checklists') AS checklists_ok;
  ```

### Migration 11: Perfil Apenas Leitura (`20261015150000_add_readonly_to_user_role.sql`)
- **O que faz:** Adiciona 'READONLY' ao enum `user_role` no PostgreSQL para suportar auditores e fiscais.
- **Query de Verificação:**
  ```sql
  SELECT count(*) FROM pg_enum 
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
  WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'READONLY';
  ```

### Migration 12: Otimização WhatsApp e pg_cron (`20261016230000_optimize_whatsapp_cron_and_index.sql`)
- **O que faz:** Cria o índice parcial `idx_scheduled_whatsapp_pending` e a função gate que poupa recursos da borda.
- **Query de Verificação:**
  ```sql
  SELECT 
      (SELECT count(*) FROM pg_indexes WHERE indexname = 'idx_scheduled_whatsapp_pending') AS index_ok,
      (SELECT count(*) FROM pg_proc WHERE proname = 'trigger_scheduled_whatsapp_worker') AS gate_ok;
  ```

### Migration 13: Configurações Globais (`20261016230001_create_platform_settings.sql`)
- **O que faz:** Cria a tabela de chave-valor `platform_settings` para modo de manutenção e feature flags sem redeploy.
- **Query de Verificação:**
  ```sql
  SELECT count(*) FROM public.platform_settings WHERE key = 'maintenance_mode';
  ```

---

## 3. Checklist de Conclusão Pré-Deploy

1. [ ] Todas as 13 migrações foram executadas no Supabase SQL Editor de produção sem erro.
2. [ ] Todas as consultas de verificação retornaram confirmação positiva.
3. [ ] Executar o deploy via terminal:
   ```bash
   git push origin master
   npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
   ```
