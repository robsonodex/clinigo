# Checklist Obrigatório de Deploy em Produção (Módulo TISS e Convênios)

> Documento obrigatório para homologação e publicação em produção das alterações do Módulo TISS, Convênios, Glosas e Repasse.
> Data: 29/09/2026

---

## 1. Pré-Requisitos e Preparação de Infraestrutura

- [ ] **1.1 Backup Integral do Banco de Produção:**
  - Gerar snapshot / backup completo no painel do Supabase antes de aplicar qualquer migration.
  - Guardar o dump com data e hora: `backup_producao_pre_tiss_YYYYMMDD_HHMM.sql`.

- [ ] **1.2 Staging Homologado com Sucesso:**
  - Executar as 3 migrations no ambiente de Staging.
  - Executar o script `scripts/staging/verify-tiss-migrations.sql`.
  - Confirmar que todos os 9 testes retornaram status **PASS**.

- [ ] **1.3 Geração de Tipos TypeScript Atualizados:**
  - Rodar `npx supabase gen types typescript --project-id ... > types/supabase.generated.ts`.
  - Validar compilação limpa com `npm run build`.

---

## 2. Janela de Manutenção e Ordem de Migrações

- [ ] **2.1 Janela de Baixo Uso:**
  - Realizar o deploy exclusivamente fora do horário comercial (ex: após 21h ou finais de semana).

- [ ] **2.2 Aplicação Sequencial das Migrations no Supabase Produção:**
  1. `supabase/migrations/20260929120000_tiss_convenios_glosas_repasse.sql` (Tabelas base, RLS, índices parciais e colunas).
  2. `supabase/migrations/20260929130000_tiss_undo_rpc_and_reimport.sql` (Função RPC atômica de estorno e índice de reimportação).
  3. `supabase/migrations/20260929140000_tiss_batch_hash_tracking.sql` (Rastreabilidade de algoritmo e hash do lote).

---

## 3. Configurações de Segurança e Feature Flags

- [ ] **3.1 Padrão de Segurança Ativo por Padrão (Sem Alterar Clínicas Existentes):**
  - Todas as clínicas permanecem no regime de repasse por `PRODUÇÃO` e política de glosa `CLINICA_ABSORVE`.
  - O algoritmo de hash do lote permanece `LEGACY_SHA256_JSON` para 100% das clínicas ativas.
  - O adaptador de validação opera em modo `ESTRUTURAL` (seguro e sem dependência externa).

- [ ] **3.2 Build e Deploy da Aplicação:**
  ```bash
  git push origin master
  npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
  ```

---

## 4. Plano de Reversão (Rollback)

Em caso de qualquer falha crítica detectada nas primeiras 2 horas:

1. **Reversão do Frontend:**
   - No painel da Vercel, clicar em **Instant Rollback** para o deployment anterior estável.
2. **Reversão do Banco de Dados:**
   - As colunas adicionadas são nulas e não quebram o código legado.
   - Caso seja necessário reverter a migration:
     - As tabelas novas (`tuss_procedures`, `health_insurance_price_tables`, `tiss_glosa_reasons_ans`, `tiss_return_imports`) podem ser mantidas ou excluídas via script de rollback.
     - A função RPC `tiss_undo_return_import` é isolada e não afeta consultas normais.
3. **Notificação da Equipe:**
   - Registrar o motivo da reversão e os logs do Sentry / Vercel.

---

## 5. Monitoramento Crítico nas Primeiras 48 Horas

Monitorar ativamente no Sentry, logs do Supabase e painel de atendimento:

- [ ] **5.1 Logs de RBAC / 403:**
  - Verificar se usuários legítimos (recepcionistas e administradores) conseguem emitir guias normalmente sem bloqueios indevidos de autorização.
- [ ] **5.2 Emissão e Download de XMLs:**
  - Monitorar o tempo de resposta do endpoint `POST /api/tiss/batches/[id]/generate-xml`.
  - Confirmar se o upload para o bucket `documents` do Storage ocorre sem erros de permissão.
- [ ] **5.3 Desfazimento de Retornos (UNDO):**
  - Se alguma clínica acionar o desfazimento de retorno, verificar se o estorno contábil transacional em `financial_entries` e `tiss_glosas` foi executado atomicamente.
- [ ] **5.4 Integridade dos Prontuários e Agendamentos:**
  - Confirmar que o fluxo clínico dos profissionais médicos e terapeutas não sofreu nenhuma alteração ou lentidão.
