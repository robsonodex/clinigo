# CliniGo - Guia Corporativo de Resolução de Problemas (Troubleshooting)

> **Padrão de Suporte:** Engenharia de Sistemas e Operações Clínicas  
> **Última Atualização:** Outubro de 2026  
> **Padrão de Resposta:** Técnico, formal e determinístico (Zero Emojis)

---

## 1. Autenticação, Identidade e Validação Local de JWT

### 1.1 Erro "Token de autenticação inválido ou expirado"
- **Causa Provável:** O token JWT na requisição expirou ou foi emitido com chave secreta divergente da configurada no ambiente.
- **Procedimento de Resolução:**
  1. Verificar no arquivo `.env` ou painel da Vercel se `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` correspondem exatamente ao mesmo projeto Supabase.
  2. Confirmar se o cookie de sessão ou cabeçalho `Authorization: Bearer <token>` está sendo transmitido.
  3. No caso de validação local via biblioteca `jose` (`lib/auth/verify-token.ts`), garantir que a chave JWT secret não possui espaços ou quebras de linha acidentais.

### 1.2 Loop de redirecionamento para a tela de login
- **Causa Provável:** O usuário possui perfil cadastrado, mas a clínica vinculada (`clinic_id`) está com `is_active = false` ou o perfil não possui papel válido no enum `user_role`.
- **Procedimento de Resolução:**
  1. Consultar a clínica no banco: `SELECT id, name, is_active FROM clinics WHERE id = '<clinic_id>';`. Se `is_active` for falso, a aplicação redireciona legitimamente para `/conta-bloqueada`.
  2. Verificar o papel do usuário: `SELECT id, email, role FROM users WHERE id = '<user_id>';`. Confirmar se o papel está contemplado em `user_role`.

---

## 2. Armazenamento Seguro e Prontuários (Cloudflare R2)

### 2.1 Erro 404 ou link expirado ao baixar documentos de pacientes
- **Causa Provável:** A URL pré-assinada ultrapassou o tempo limite de segurança de 600 segundos (10 minutos) ou a chave no banco não possui o prefixo canônico `r2://`.
- **Procedimento de Resolução:**
  1. No banco de dados, verificar o campo `file_url` na tabela `patient_documents`. Deve iniciar com `r2://` (ex: `r2://patient-documents/UUID/arquivo.pdf`).
  2. Confirmar se as variáveis de ambiente `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME` estão configuradas na Vercel.
  3. Solicitar um novo clique no botão de download para gerar uma nova Presigned URL segura.

---

## 3. Licenciamento por Assentos e Cobrança de Adicionais

### 3.1 Modal de cotação acusa "Cotação expirada ou inválida (HMAC)"
- **Causa Provável:** A cotação emitida possui prazo de validade estrito de 15 minutos para evitar divergências em caso de alteração cadastral simultânea, ou os parâmetros de assentos foram adulterados no cliente.
- **Procedimento de Resolução:**
  1. Fechar o modal e tentar adicionar o colaborador novamente. O backend recalculará o valor atualizado e emitirá uma nova assinatura HMAC-SHA256 válida.
  2. Verificar se o relógio do servidor de banco e da aplicação estão sincronizados via NTP UTC.

### 3.2 Impossibilidade de salvar usuário por limite de assentos
- **Causa Provável:** A clínica atingiu o limite do plano e o administrador rejeitou o modal de autorização de cobrança adicional de R$ 49,90/mês.
- **Procedimento de Resolução:**
  1. Para prosseguir, o administrador deve autorizar a licença adicional clicando em "Confirmar e Ativar Assento".
  2. Caso a clínica possua acordo comercial de isenção, o Super Admin pode marcar a coluna `seat_overage_waived = true` na tabela `clinics`, permitindo o cadastro com prova de aceite probatória sem cobrança.

---

## 4. Faturamento TISS, Numeração e Glosas

### 4.1 Erro "duplicate key value violates unique constraint uq_tiss_guides_clinic_number"
- **Causa Provável:** Tentativa de inserção manual de guia ou concorrência com número de guia já existente no ano para a mesma clínica.
- **Procedimento de Resolução:**
  1. Verificar se a migration `20260929160000_tiss_premium_hardening.sql` foi executada. Ela substitui a lógica por um loop com bloqueio `SELECT ... FOR UPDATE` via RPC `generate_tiss_guide_number`.
  2. Executar no SQL Editor:
     ```sql
     SELECT MAX(NULLIF(regexp_replace(guide_number, '\D', '', 'g'), '')::bigint) 
     FROM tiss_guides WHERE clinic_id = '<clinic_id>';
     ```
  3. Atualizar a tabela `tiss_guide_counters` com o valor máximo encontrado caso haja defasagem no contador legado.

### 4.2 Falha na validação do arquivo XML no portal da operadora
- **Causa Provável:** Divergência de expectativa no algoritmo de hash (SHA-256 vs MD5 canônico) ou ausência de campos obrigatórios no cadastro do profissional (CRM, UF, CBO).
- **Procedimento de Resolução:**
  1. Conferir se os campos de conselho (`crm`, `crm_state`) do profissional executante estão completos em `/dashboard/medicos/[id]`.
  2. Nas configurações de convênio da clínica, alternar o algoritmo de hash entre `LEGACY_SHA256_JSON` e `ANS_MD5_CANONICAL` conforme exigência da operadora de saúde parceira (conforme orientado em `docs/pendencias/VALIDACAO_HASH_E_XSD.md`).

---

## 5. Telemedicina e Salas Virtuais WebRTC

### 5.1 Tela oscilando / piscando continuamente na chamada de vídeo
- **Causa Provável:** Recriação cíclica de ouvintes no canal do Supabase Realtime decorrente de dependências voláteis em hooks React.
- **Procedimento de Resolução:**
  1. Confirmar se a versão do código em produção contém o commit `426cd81`, que estabiliza o canal Realtime utilizando referências persistentes (`useRef`) em vez de recriação contínua de callbacks.

---

## 6. Mensageria WhatsApp e Agendador pg_cron

### 6.1 Mensagens programadas não são enviadas no horário
- **Causa Provável:** O agendamento no `pg_cron` está desativado ou a extensão `pg_net` não possui permissão de saída HTTP.
- **Procedimento de Resolução:**
  1. Verificar agendamentos ativos no Supabase:
     ```sql
     SELECT jobid, jobname, schedule, active, command FROM cron.job;
     ```
  2. Confirmar se a função `trigger_scheduled_whatsapp_worker()` está agendada.
  3. Verificar se há registros pendentes com data vencida:
     ```sql
     SELECT count(*) FROM scheduled_whatsapp_messages WHERE status = 'pending' AND scheduled_for <= now();
     ```
  4. Executar manualmente a função para teste de conectividade: `SELECT public.trigger_scheduled_whatsapp_worker();`.

---

## 7. Publicação e Deploy na Vercel

### 7.1 Erro "Not authorized / scope-not-accessible" no terminal Windows
- **Causa Provável:** Uso do utilitário `vercel` global em versão 59.15+ no ambiente Windows, que apresenta incompatibilidade com tokens de escopo de equipe.
- **Procedimento de Resolução:**
  1. Executar o comando estritamente fixado na versão homologada:
     ```bash
     npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
     ```

### 7.2 Erro de dependência durante instalação na Vercel (npm ERR! ERESOLVE)
- **Causa Provável:** Resolução estrita de dependências conflitantes entre pacotes de terceiros no React 19.
- **Procedimento de Resolução:**
  1. O arquivo `vercel.json` deve incluir no comando de instalação: `npm install --legacy-peer-deps`.
