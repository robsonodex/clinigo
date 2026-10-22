# Manual de Produção: Pacote de Release Consolidado - CliniGo (V5.1)

Este documento foi elaborado para o administrador do sistema ou proprietário da plataforma. Contém instruções exatas e sequenciais para manter em produção todas as funcionalidades do CliniGo (Faturamento TISS Premium, Licenciamento por Assento, Gestão de Tarefas, Perfil ReadOnly, Otimizações de Performance) com estabilidade contínua.

---

## 1. Passo Zero: Segurança e Backup Preventivo

Antes de rodar qualquer comando no banco de dados:
1. Acesse o painel do Supabase do projeto de produção.
2. No menu lateral esquerdo, clique em **Project Settings** (ícone de engrenagem) e depois em **Database**.
3. Na seção **Backups**, gere um snapshot sob demanda.
4. Abra o **SQL Editor** do Supabase.

---

## 2. Pré-checagem de Duplicatas (Obrigatório antes das Migrations)

Antes de aplicar qualquer migração estrutural, execute o script de pré-checagem abaixo no SQL Editor do Supabase. Ele é **somente leitura** e não altera nenhum dado:

Arquivo de referência: `docs/release/00_pre_checagem_duplicatas.sql`

```sql
SELECT 
    clinic_id,
    guide_number,
    COUNT(*) AS total_duplicatas,
    ARRAY_AGG(id) AS ids_guias,
    ARRAY_AGG(status) AS status_guias,
    MIN(created_at) AS primeira_criacao,
    MAX(created_at) AS ultima_criacao
FROM tiss_guides
WHERE guide_number IS NOT NULL AND TRIM(guide_number) != ''
GROUP BY clinic_id, guide_number
HAVING COUNT(*) > 1
ORDER BY total_duplicatas DESC, clinic_id;
```

- **Se retornar 0 linhas:** O ambiente está pronto para receber as migrações.
- **Se retornar linhas:** Existem números de guias duplicados no histórico da mesma clínica. Notifique o suporte técnico antes de aplicar o índice único da migration 5.

---

## 3. Ordem Exata de Execução das Migrations

Execute os arquivos da pasta `supabase/migrations/` um a um, **exatamente na ordem abaixo**, no SQL Editor do Supabase:

| Ordem | Arquivo Real da Migration | O que ela faz em uma linha | O que conferir logo após rodar |
|---|---|---|---|
| 1 | `20260929120000_tiss_convenios_glosas_repasse.sql` | Cria catálogos TUSS e ANS, tabela de preços, controle de glosas e colunas de repasse em clínicas. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tuss_procedures';` |
| 2 | `20260929130000_tiss_undo_rpc_and_reimport.sql` | Cria função segura para desfazimento de retorno importado e permite reimportação do mesmo arquivo. | `SELECT count(*) FROM pg_proc WHERE proname = 'tiss_undo_return_import';` |
| 3 | `20260929140000_tiss_batch_hash_tracking.sql` | Adiciona colunas para guardar o código Hash e data de geração do XML dos lotes. | `SELECT count(*) FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'hash_value';` |
| 4 | `20260929150000_tiss_premium_foundation.sql` | Cria contadores automáticos de numeração de guias e histórico de versões de XML. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_guide_counters';` |
| 5 | `20260929160000_tiss_premium_hardening.sql` | Preenche os números anteriores e ativa trava para impedir número de guia repetido. | `SELECT count(*) FROM pg_class WHERE relname = 'uq_tiss_guides_clinic_number';` |
| 6 | `20260929170000_tiss_guide_cancelled_status.sql` | Adiciona suporte a guias canceladas sem distorcer o cálculo de perdas da clínica. | `SELECT count(*) FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'cancellation_reason';` |
| 7 | `20260930100000_create_patient_intake_module.sql` | Cria a estrutura do pré-cadastro online de pacientes com fotos de documentos. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'patient_intake_links';` |
| 8 | `20260930110000_tiss_premium_p0_extensions.sql` | Cria as tabelas de recursos de glosa, anexos em pasta privada e envio manual de lote. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_appeals';` |
| 9 | `20261009120000_seat_licensing.sql` | Cria tabela probatória imutável `seat_billing_events` e campos comerciais de assentos extras. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'seat_billing_events';` |
| 10 | `20261013140000_create_tasks_and_projects_module.sql` | Cria tabelas de projetos corporativos, tarefas com SLA e subtarefas de checklist. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'clinic_tasks';` |
| 11 | `20261015150000_add_readonly_to_user_role.sql` | Adiciona 'READONLY' ao enum `user_role` para suporte a auditores e órgãos de fiscalização. | `SELECT count(*) FROM pg_enum WHERE enumlabel = 'READONLY';` |
| 12 | `20261016230000_optimize_whatsapp_cron_and_index.sql` | Adiciona índice parcial na fila de mensagens e função gate no `pg_cron` para otimizar custos. | `SELECT count(*) FROM pg_proc WHERE proname = 'trigger_scheduled_whatsapp_worker';` |
| 13 | `20261016230001_create_platform_settings.sql` | Cria tabela `platform_settings` para modo de manutenção global e feature flags dinâmicas. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'platform_settings';` |

---

## 4. Publicação do Código (Deploy na Vercel)

Com o banco de dados atualizado, realize a publicação do código oficial:

```bash
git push origin master
npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
```

---

## 5. Roteiro de Validação Pós-Deploy

1. **Gestão de Tarefas da Equipe:** Acesse `/dashboard/tarefas` e confirme a renderização das colunas Kanban (TODO, IN_PROGRESS, DONE) e do farol de prazos (SLA).
2. **Licenciamento por Assento:** Acesse `/dashboard/configuracoes/usuarios` e confirme a exibição do card de assentos contratados e o modal transparente caso o limite seja excedido.
3. **Faturamento TISS Premium:** No painel do Super Admin (`/system-master-hub`), valide o status do interruptor de Faturamento Premium por clínica e a geração atômica de guias.
4. **Perfil Apenas Leitura:** Teste o login com um usuário `READONLY` e verifique se a navegação ocorre em modo estritamente consultivo, com botões de mutação bloqueados.
