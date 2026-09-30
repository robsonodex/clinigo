# Ordem Oficial de Execução das Migrations - Faturamento Premium TISS

> **IMPORTANTE E OBRIGATÓRIO:** Todas as migrations listadas abaixo **DEVEM** ser executadas no banco de dados Supabase **ANTES** do deploy do código da aplicação em produção. Caso o deploy seja realizado sem as migrations prévias, rotas críticas como emissão de guias, fechamento de lotes e conciliação de retornos falharão por ausência de colunas e RPCs.

---

## 1. Resumo Executivo da Ordem Pré-Deploy

| Ordem | Arquivo de Migration | Dependência no Código | Status Pré-Deploy |
|---|---|---|---|
| **1** | `20260929120000_tiss_convenios_glosas_repasse.sql` | Catálogo TUSS, tabela de preços, motivos de glosa ANS, saldo em `tiss_authorization_requests` | **OBRIGATÓRIA ANTES** |
| **2** | `20260929130000_tiss_undo_rpc_and_reimport.sql` | RPC `tiss_undo_return_import`, coluna `status` em `tiss_return_imports` | **OBRIGATÓRIA ANTES** |
| **3** | `20260929140000_tiss_batch_hash_tracking.sql` | Colunas `hash_algorithm`, `hash_value`, `xml_generated_at` em `tiss_batches` | **OBRIGATÓRIA ANTES** |
| **4** | `20260929150000_tiss_premium_foundation.sql` | Tabela `tiss_guide_counters`, RPC `generate_tiss_guide_number`, colunas `deleted_at`, `deleted_by`, `version` | **OBRIGATÓRIA ANTES** |
| **5** | `20260929160000_tiss_premium_hardening.sql` | Hardening da RPC `generate_tiss_guide_number` com `SET search_path`, lock transacional e backfill de numeração | **OBRIGATÓRIA ANTES** |
| **6** | `20260929170000_tiss_guide_cancelled_status.sql` | Colunas `cancellation_reason`, `cancelled_at`, `cancelled_by` em `tiss_guides` e tabela `tiss_batch_xml_versions` | **OBRIGATÓRIA ANTES** |

---

## 2. Detalhamento Estrutural por Migration

### 2.1 Migration 1: `20260929120000_tiss_convenios_glosas_repasse.sql`
- **Tabelas Criadas:**
  - `tuss_procedures`: Catálogo oficial de procedimentos TUSS (`code`, `description`, `category`, `source`, `is_active`).
  - `health_insurance_price_tables`: Tabela de preços por clínica, operadora e plano (`clinic_id`, `health_insurance_id`, `health_insurance_plan_id`, `tuss_code`, `price`, `copay_amount`, `requires_authorization`, `max_sessions_per_year`).
  - `tiss_glosa_reasons_ans`: Catálogo ANS de códigos de glosa (Tabela 38/61 da ANS).
- **Colunas Adicionadas em Tabelas Existentes:**
  - `clinics`: `repasse_regime` (PRODUCAO / RECEBIMENTO), `glosa_policy` (CLINICA_ABSORVE / DESCONTA_REPASSE).
  - `health_insurances`: `closing_day` (dia de corte), `appeal_deadline_days` (prazo limite de recurso em dias).
  - `tiss_authorization_requests`: `sessions_authorized`, `sessions_used` (controle de saldo de sessões).
- **RLS & Índices:**
  - Políticas de isolamento por `clinic_id` habilitadas em `health_insurance_price_tables`.

### 2.2 Migration 2: `20260929130000_tiss_undo_rpc_and_reimport.sql`
- **Colunas Adicionadas:**
  - `tiss_return_imports`: coluna `status VARCHAR(20) DEFAULT 'COMPLETED'` (permite soft-delete/cancelamento de retorno).
- **Índices & Constraints:**
  - Substituição da constraint estrita por índice único parcial: `uq_tiss_return_file_hash_active` em `(clinic_id, file_hash) WHERE status != 'CANCELLED'`, viabilizando a reimportação do mesmo arquivo após o estorno.
- **Funções SQL (RPC):**
  - `tiss_undo_return_import(p_return_or_batch_id UUID, p_clinic_id UUID, p_user_id UUID, p_user_name TEXT)`:
    - Desfazimento atômico e transacional de processamento de retorno TISS.
    - Bloqueio impeditivo caso haja recursos de glosa ativos (`IN_APPEAL` ou `ACCEPTED`).
    - Bloqueio impeditivo caso a competência financeira já tenha sido liquidada ou conciliada.
    - Reversão contábil e de repasse médico com estorno em `financial_entries`.

### 2.3 Migration 3: `20260929140000_tiss_batch_hash_tracking.sql`
- **Colunas Adicionadas em `tiss_batches`:**
  - `hash_algorithm`: Algoritmo de hash calculado (`SHA-256`, `MD5`, `LEGACY_SHA256_JSON`).
  - `hash_value`: Valor hexadecimal do hash gerado para o lote.
  - `xml_generated_at`: Timestamp UTC da geração e assinatura do arquivo XML.

### 2.4 Migration 4: `20260929150000_tiss_premium_foundation.sql`
- **Tabelas Criadas:**
  - `tiss_guide_counters`: Tabela para geração de números atômicos sob bloqueio (`clinic_id`, `year`, `current_value`, `updated_at`, PK: `clinic_id, year`).
  - `tiss_batch_xml_versions`: Histórico de versões de XML geradas para cada lote (`id`, `clinic_id`, `batch_id`, `version`, `xml_content`, `hash_value`, `hash_algorithm`, `tiss_version`, `created_by`, `created_at`).
  - `tiss_appeal_templates`: Biblioteca de modelos institucionais de recurso de glosa (`id`, `clinic_id`, `title`, `glosa_code`, `template_text`, `created_by`, `is_active`).
- **Colunas Adicionadas em `tiss_guides`:**
  - `deleted_at`: Timestamp para soft-delete de rascunhos.
  - `deleted_by`: UUID do usuário responsável pela exclusão.
  - `version`: Contador inteiro para controle de concorrência otimista (OCC).
- **Colunas Adicionadas em `tiss_batches`:**
  - `closed_at`, `closed_by`: Rastreamento formal de fechamento do lote.
  - `reopened_at`, `reopened_by`, `reopen_reason`: Rastreamento de reabertura com justificativa.
  - `submitted_at`, `submission_receipt_url`: Dados de envio manual ou transmissão via Web Service.
- **Funções SQL (RPC):**
  - `generate_tiss_guide_number(p_clinic_id UUID, p_year INT)`: Geração atômica sob lock `FOR UPDATE`.

### 2.5 Migration 5: `20260929160000_tiss_premium_hardening.sql`
- **Hardening de Segurança e Integridade da Numeração (C1 a C5):**
  - **Backfill Automático:** Inicializa `tiss_guide_counters` a partir do maior número histórico já emitido em cada clínica/ano, impedindo colisão com guias existentes.
  - **Função `generate_tiss_guide_number` Atualizada:**
    - `SECURITY DEFINER` com `SET search_path = public, pg_temp` estrito (mitigação de sequestro de path).
    - Validação de isolamento do usuário autenticado (`auth.uid() = user.clinic_id`).
    - Cálculo com `GREATEST(contador, max_existente) + 1` sob `SELECT ... FOR UPDATE`.
    - Loop anti-colisão em caso de numerações esparsas manuais.
    - `GRANT EXECUTE ON FUNCTION generate_tiss_guide_number TO authenticated, service_role`.
  - **Índice Único Parcial:**
    - `idx_tiss_guides_unique_number_active` em `(clinic_id, guide_number) WHERE deleted_at IS NULL`, garantindo que nunca existam guias ativas duplicadas na mesma clínica.

### 2.6 Migration 6: `20260929170000_tiss_guide_cancelled_status.sql`
- **Colunas Adicionadas em `tiss_guides`:**
  - `cancellation_reason TEXT`: Justificativa formal de cancelamento (mínimo 5 caracteres).
  - `cancelled_at TIMESTAMP WITH TIME ZONE`: Data e hora exata do cancelamento.
  - `cancelled_by UUID REFERENCES users(id)`: Usuário que cancelou a guia.
- **Índices Adicionados:**
  - `idx_tiss_guides_clinic_status`: Otimização de consultas para exclusão de canceladas nos relatórios e dashboard.
- **Tabela e RLS de Versionamento:**
  - `tiss_batch_xml_versions` habilitada com política RLS estrita por `clinic_id`.

---

## 3. Checklist de Validação Pré-Deploy

Antes de executar `git push origin master` e `npx vercel@59.14.0 --prod`:

1. [ ] Conectar ao banco de dados Supabase de Produção ou Staging.
2. [ ] Executar na sequência exata as migrations `20260929120000` até `20260929170000`.
3. [ ] Executar o script de validação idempotente `scripts/staging/verify-tiss-premium.sql` e verificar todos os testes com status `PASS`.
4. [ ] Validar que `generate_tiss_guide_number` responde com privilégios adequados.
5. [ ] Prosseguir com o deploy do código da aplicação.
