# Manual de Release e Deploy em Produção — Módulo TISS CliniGo

Este documento estabelece o procedimento operacional padrão para implantação em produção das extensões de faturamento TISS, mantendo compatibilidade retroativa e zero downtime.

---

## 1. Passo Zero: Backup Preventivo
Antes de aplicar qualquer alteração no banco de dados:
1. Acesse o Dashboard do Supabase da clínica ou instância de produção.
2. Navegue até **Project Settings** > **Database** > **Backups**.
3. Realize um backup sob demanda (Point-in-Time Recovery ou Snapshot manual).

---

## 2. Ordem Estrita de Execução das Migrations
Execute as migrations uma por uma no **SQL Editor** do Supabase, na ordem rigorosa abaixo.

> Regra de segurança: Se qualquer migration apresentar erro, **PARE imediatamente e copie a mensagem de erro completa**. Não execute as migrations subsequentes. O código em produção continuará funcionando normalmente porque o deploy da aplicação só é realizado após o banco de dados estar íntegro.

| Ordem | Arquivo de Migration | O que conferir após execução |
|---|---|---|
| 1 | `20260929120000_tiss_guides_structure.sql` | Executar: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'validation_status';` (deve retornar 1 linha). |
| 2 | `20260929130000_tiss_batches_extensions.sql` | Executar: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'hash_algorithm';` (deve retornar 1 linha). |
| 3 | `20260929140000_tiss_glosas_system.sql` | Executar: `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_glosas';` (deve retornar 1). |
| 4 | `20260929150000_tiss_audit_log.sql` | Executar: `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_audit_logs';` (deve retornar 1). |
| 5 | `20260929160000_tiss_faturamento_premium_flag.sql` | Executar: `SELECT faturamento_premium FROM clinics LIMIT 1;` (deve retornar `false` para as clínicas). |
| 6 | `20260929170000_tiss_guide_cancelled_status.sql` | Executar: `SELECT enumlabel FROM pg_enum WHERE enumlabel = 'CANCELLED';` (deve confirmar o label do enum). |
| 7 | `20260930110000_tiss_premium_p0_extensions.sql` | Executar: `SELECT count(*) FROM information_schema.tables WHERE table_name IN ('tiss_appeals', 'tiss_appeal_items', 'tiss_appeal_attachments');` (deve retornar 3). |

---

## 3. Deploy da Aplicação (Master na Vercel)
O deploy deve ser realizado com a feature flag `faturamento_premium` **DESLIGADA** para todas as clínicas.
Como o padrão da migration `20260929160000` define `DEFAULT false`, todas as clínicas permanecem no modo legado por padrão.

Procedimento de deploy via linha de comando ou integração Vercel:
```bash
git push origin master
npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
```

---

## 4. Habilitação Gradual e Roteiro de 10 Minutos de Validação
Após o deploy da master, selecione uma **única clínica de teste** para ativação pioneira.

### 4.1 Como Ligar a Flag na Clínica de Teste
1. Acesse o sistema como Administrador da Clínica (`CLINIC_ADMIN` ou `SUPER_ADMIN`).
2. Acesse: **Menu** > **Configurações** > **Faturamento / TISS** (ou execute via SQL direto se preferir):
   ```sql
   UPDATE clinics SET faturamento_premium = true WHERE id = 'ID_DA_CLINICA_DE_TESTE';
   ```

### 4.2 Roteiro de 10 Minutos por Perfil

#### 1. Perfil RECEPÇÃO (2 minutos):
- Acesse **Faturamento TISS** (`/dashboard/tiss`).
- Clique em **Nova Guia**: verifique a abertura do assistente de emissão em 3 passos com busca de paciente e conferência de convênio.
- Confirme que a recepção não possui acesso a fechamento de lote ou recursos de glosa (bloqueio por menor privilégio).

#### 2. Perfil FINANCEIRO (3 minutos):
- Acesse **Lotes TISS** (`/dashboard/tiss/batches`).
- Visualize a barra de filtros por status (F1) com contadores em tempo real.
- Em um lote em digitação (`DRAFT`), abra o menu e execute **Vincular Guias** (L2) e **Fechar Lote** (L3) com pré-verificação de impeditivos.
- Em um lote fechado (`VALID`/`CLOSED`), verifique a presença da opção **Registrar Envio Manual** (L7) e teste o upload do comprovante.
- Acesse a **Gaveta de Histórico** (F2) do lote para validar o log de auditoria.

#### 3. Perfil ADMINISTRADOR (3 minutos):
- Acesse **Glosas e Recursos** (`/dashboard/tiss/glosas`).
- Lance uma glosa manual (R3) com código ANS e comprove a validação de teto financeiro (`valor <= apresentado - glosas_existentes`).
- Na aba **Recursos de Glosa (C1 - C8)**, agrupe a glosa em um novo recurso formal, verifique o cálculo do prazo legal SLA e anexe documento comprobatório no bucket privado.
- Simule a liquidação financeira (C8) como acatada e valide a baixa contábil.

#### 4. Perfil PROFISSIONAL / MÉDICO (2 minutos):
- Acesse **Meu Financeiro** > **Produção** (`/dashboard/meu-financeiro/producao`).
- Verifique se a produção individual exibe estritamente os atendimentos do próprio profissional (sigilo médico).
- Confirme que o repasse reflete a política da clínica (`CLINICA_ABSORVE`, `DESCONTA_PROFISSIONAL` ou `DESCONTA_SE_MANTIDA`) sem vazamento de dados de outros terapeutas.

---

## 5. Procedimentos de Contingência e Rollback

### 5.1 Como Desligar a Feature Flag Instantaneamente
Se qualquer instabilidade for observada na interface ou na operação, desligue a flag imediatamente. A UI reverte instantaneamente para a versão legada sem necessidade de novo deploy:
```sql
UPDATE clinics SET faturamento_premium = false WHERE id = 'ID_DA_CLINICA';
```
*(Para desligar em todas as clínicas: `UPDATE clinics SET faturamento_premium = false;`)*

### 5.2 Como Reverter o Deploy da Aplicação
1. Acesse o Dashboard da Vercel (`nodexs-projects-8a6ee1f1`).
2. Selecione o projeto `clinigo-frontend`.
3. Na aba **Deployments**, localize o deploy anterior imediatamente estável.
4. Clique no menu de três pontos do deployment anterior e selecione **Instant Rollback** (ou **Promote to Production**).
5. O tráfego será redirecionado em menos de 10 segundos.
