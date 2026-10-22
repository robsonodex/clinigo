# CliniGo - Guia de Deploy e Operações em Produção

> **Projeto de Produção Oficial (Vercel):** `clinigo-saas` (conectado à branch `master`)  
> **Escopo da Conta Vercel:** `nodexs-projects-8a6ee1f1`  
> **URL Oficial:** `https://clinigo.app`  
> **Infraestrutura de Banco:** Supabase PostgreSQL 15+ gerenciado com RLS  
> **Armazenamento de Prontuários:** Cloudflare R2 (Compatível com AWS S3)

---

## 1. Protocolo de Deploy em Produção (Mandatório e Inviolável)

Para publicar em produção e assegurar a vinculação correta ao projeto oficial da Vercel no ambiente Windows, execute estritamente a sequência de comandos abaixo:

```bash
git push origin master
npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
```

> **Aviso Crítico de Versão do Vercel CLI:**
> Nunca utilize o comando `vercel --prod` sem `npx` ou versões superiores à 59.14.0 no Windows. A partir da versão 59.15+, o Vercel CLI perde o escopo da conta ("Not authorized" / "scope-not-accessible"), bloqueando o deployment de produção. A fixação na versão `59.14.0` com `--scope nodexs-projects-8a6ee1f1` garante a aprovação imediata do pipeline.

---

## 2. Ordem de Execução das Migrations no Banco de Dados

Todas as alterações estruturais de banco de dados **devem ser aplicadas no Supabase SQL Editor ANTES** do deploy do código em produção.

A sequência canônica das migrações recentes do sistema é:

1. `supabase/migrations/20260929120000_tiss_convenios_glosas_repasse.sql` (Catálogo TUSS, tabelas de preço e colunas de repasse)
2. `supabase/migrations/20260929130000_tiss_undo_rpc_and_reimport.sql` (Função RPC atômica de estorno de retorno de convênio)
3. `supabase/migrations/20260929140000_tiss_batch_hash_tracking.sql` (Rastreamento de algoritmo e valor de hash XML)
4. `supabase/migrations/20260929150000_tiss_premium_foundation.sql` (Contadores de numeração de guias e histórico de XML)
5. `supabase/migrations/20260929160000_tiss_premium_hardening.sql` (Hardening da RPC `generate_tiss_guide_number` e índice anti-colisão)
6. `supabase/migrations/20260929170000_tiss_guide_cancelled_status.sql` (Justificativa formal e histórico de guias canceladas)
7. `supabase/migrations/20260930100000_create_patient_intake_module.sql` (Admissão e pré-cadastro digital de pacientes)
8. `supabase/migrations/20260930110000_tiss_premium_p0_extensions.sql` (Tabelas de recursos de glosa e modelos institucionais)
9. `supabase/migrations/20261009120000_seat_licensing.sql` (Licenciamento por assentos, colunas comerciais e tabela probatória)
10. `supabase/migrations/20261013140000_create_tasks_and_projects_module.sql` (Módulo corporativo de projetos, tarefas da equipe e SLA)
11. `supabase/migrations/20261015150000_add_readonly_to_user_role.sql` (Adição do valor 'READONLY' ao enum nativo `user_role`)
12. `supabase/migrations/20261016230000_optimize_whatsapp_cron_and_index.sql` (Índice parcial e gate condicional para pg_cron)
13. `supabase/migrations/20261016230001_create_platform_settings.sql` (Tabela `platform_settings` para modo de manutenção e flags)

---

## 3. Matriz de Variáveis de Ambiente Críticas

As seguintes chaves devem estar configuradas nas variáveis de ambiente da Vercel (Production / Preview):

### 3.1 Infraestrutura Básica e Supabase
- `NEXT_PUBLIC_APP_URL`: URL oficial da aplicação (`https://clinigo.app`).
- `NEXT_PUBLIC_SUPABASE_URL`: Endpoint de API do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave pública para clientes web e PWA.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave privada de acesso elevado exclusiva para endpoints de backend e workers.

### 3.2 Armazenamento Seguro (Cloudflare R2)
- `R2_ACCOUNT_ID`: Identificador da conta na Cloudflare.
- `R2_ACCESS_KEY_ID`: Chave de acesso S3 gerada no painel R2.
- `R2_SECRET_ACCESS_KEY`: Chave secreta de autenticação do R2.
- `R2_BUCKET_NAME`: Nome do bucket de documentos de pacientes (ex: `clinigo-patient-documents`).
- `R2_PUBLIC_URL`: Endpoint canônico para geração de URLs pré-assinadas.

### 3.3 Pagamentos, Billing e Licenciamento
- `SEAT_BILLING_MODE`: Modo de aplicação do licenciamento por assentos (`enforce`).
- `ASAAS_API_KEY`: Chave de API do gateway Asaas para assinaturas e cobrança bancária.
- `ASAAS_ENVIRONMENT`: Ambiente de integração (`production` ou `sandbox`).
- `ASAAS_WEBHOOK_TOKEN`: Token de segurança para validação de webhooks de recebimento do Asaas.
- `MERCADOPAGO_ACCESS_TOKEN`: Token de produção do Mercado Pago.
- `MERCADOPAGO_WEBHOOK_SECRET`: Segredo de validação de assinatura dos webhooks do Mercado Pago.

### 3.4 Telemedicina e Comunicação
- `DAILY_API_KEY`: Chave de provisionamento de salas virtuais na Daily.co.
- `LIVEKIT_URL`: URL do cluster LiveKit para streaming WebRTC de baixa latência.
- `LIVEKIT_API_KEY`: Chave de autenticação LiveKit.
- `LIVEKIT_API_SECRET`: Segredo criptográfico para geração de tokens de vídeo.

### 3.5 E-mail Institucional e Governança
- `SMTP_HOST`: Endereço do servidor SMTP (ex: `smtp.sendgrid.net`).
- `SMTP_PORT`: Porta de transmissão segura (587 ou 465).
- `SMTP_USER`: Usuário autenticado do SMTP.
- `SMTP_PASSWORD`: Senha ou API Key do serviço de e-mail.
- `SMTP_FROM_NAME`: Nome de remetente institucional (`CliniGo`).
- `SMTP_FROM_EMAIL`: E-mail de remetente verificado (`noreply@clinigo.app`).
- `SMTP_SECURE`: `false` para TLS na porta 587; `true` para SSL na porta 465.
- `SUPER_ADMIN_EMAILS`: Lista separada por vírgula de e-mails autorizados para o painel Super Admin.
- `JWT_SECRET`: Segredo para assinatura criptográfica de sessões de pacientes e cotações de assento.

---

## 4. Checklist Pré-Deploy e Pós-Deploy

### Pré-Deploy:
1. Executar bateria de validação de sintaxe e tipos:
   ```bash
   npm run build
   ```
2. Executar suíte de testes de integridade e segurança:
   ```bash
   npm test
   ```
3. Confirmar que nenhuma migration estrutural está pendente de execução no banco de produção.

### Pós-Deploy:
1. Validar endpoint de integridade operacional: `https://clinigo.app/api/health`.
2. Acessar o sistema com perfil `CLINIC_ADMIN` e confirmar o carregamento do dashboard principal.
3. Verificar no menu Super Admin (`https://clinigo.app/system-master-hub`) o status das clínicas e logs de integridade.
