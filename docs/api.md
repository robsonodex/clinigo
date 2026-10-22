# CliniGo - Documentação Técnica Oficial de Rotas da API (V5.1)

> **Base URL:** `https://clinigo.app/api`  
> **Total de Endpoints Mapeados:** 500+ rotas distribuídas em módulos especializados  
> **Padrão Arquitetural:** RESTful sob Next.js App Router com validação de payload via Zod  
> **Autenticação:** Bearer Token / Supabase Session JWT com verificação local via `jose` e cookies de sessão  
> **Isolamento de Segurança:** Multi-tenant estrito por `clinic_id` e RBAC na camada de API (`enforceTissAdministrativeGuard`, `requireRole`, `requireAdmin`)  
> **Padrão de Conformidade:** SaaS Médico Corporativo Internacional (Zero Emojis, Sigilo LGPD)

---

## 1. Autenticação, Identidade e Sessões (`/api/auth`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| POST | `/api/auth/register` | Cadastro inicial de clínica e administrador | Público | Ativo |
| POST | `/api/auth/login` | Login com e-mail e senha, emissão de sessão e JWT | Público | Ativo |
| POST | `/api/auth/logout` | Encerramento de sessão e invalidação de cookies | Autenticado | Ativo |
| GET | `/api/auth/me` | Retorno do usuário logado e perfil clínico | Autenticado | Ativo |
| POST | `/api/auth/forgot-password` | Solicitação de recuperação de senha via e-mail | Público | Ativo |
| POST | `/api/auth/reset-password` | Redefinição de senha com token criptográfico | Público | Ativo |
| GET | `/api/auth/reset-password` | Validação de token de recuperação | Público | Ativo |
| POST | `/api/auth/activate-account` | Ativação de conta para profissionais convidados | Público | Ativo |
| GET | `/api/auth/activate-account` | Validação de convite institucional | Público | Ativo |
| GET | `/api/auth/sessions` | Listagem de sessões ativas do usuário | Autenticado | Ativo |
| DELETE | `/api/auth/sessions/[id]` | Revogação de sessão remota | Autenticado | Ativo |
| POST | `/api/auth/mfa` | Configuração de duplo fator de autenticação (TOTP) | Autenticado | Ativo |
| POST | `/api/auth/mfa/verify` | Validação de código TOTP de 6 dígitos | Autenticado | Ativo |

---

## 2. Licenciamento por Assentos, Faturamento e Billing (`/api/billing`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/billing/seats/status` | Estado em tempo real de licenças (ativas, incluídas, excedentes, modo enforce) | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| POST | `/api/billing/seats/quote` | Emissão de cotação formal com assinatura HMAC-SHA256 para licenças adicionais | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| POST | `/api/billing/seats/commit` | Gravação probatória imutável em `seat_billing_events` com compensação e idempotência | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| GET | `/api/billing/seats/events` | Histórico de auditoria de expansão de assentos da clínica | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| POST | `/api/billing/create-subscription` | Criação de assinatura de plano via Asaas/Mercado Pago | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| POST | `/api/billing/create-preference` | Geração de preferência de pagamento (Cartão, PIX, Boleto) | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| GET | `/api/billing/invoices` | Listagem de faturas e comprovantes fiscais da clínica | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/billing/cancel-subscription` | Solicitação formal de encerramento de assinatura | CLINIC_ADMIN, SUPER_ADMIN | Ativo |

---

## 3. Gestão Corporativa de Projetos e Tarefas (`/api/tasks`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/tasks` | Listagem de tarefas com filtros por status, prioridade e SLA | Autenticado (Isolamento por papel) | Ativo |
| POST | `/api/tasks` | Criação de tarefa com checklist e vinculação a projeto/paciente | CLINIC_ADMIN, DOCTOR, RECEPTIONIST, FINANCIAL | Ativo |
| GET | `/api/tasks/[id]` | Detalhamento da tarefa e subtarefas de verificação | Autenticado (Visibilidade da clínica) | Ativo |
| PATCH | `/api/tasks/[id]` | Atualização de status (Kanban), datas de entrega e responsáveis | Atribuído, Criador ou Admin | Ativo |
| DELETE | `/api/tasks/[id]` | Exclusão de tarefa da clínica | Criador, CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| GET | `/api/tasks/team` | Painel consolidado de produtividade da equipe da clínica | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| GET | `/api/tasks/projects` | Listagem de projetos/pastas de trabalho ativas | Autenticado da clínica | Ativo |
| POST | `/api/tasks/projects` | Criação de novo projeto ou pasta de trabalho | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| PATCH | `/api/tasks/projects/[id]` | Atualização ou arquivamento de projeto | CLINIC_ADMIN, SUPER_ADMIN | Ativo |

---

## 4. Faturamento TISS, Convênios, Glosas e Repasse (`/api/tiss` e `/api/insurance`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/tiss/guides` | Listagem de guias TISS com filtros avançados | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| POST | `/api/tiss/guides` | Criação de guia TISS com numeração atômica sob lock `FOR UPDATE` | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| GET | `/api/tiss/guides/[id]` | Detalhes da guia, procedimentos TUSS e valores | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| PATCH | `/api/tiss/guides/[id]` | Atualização de guia em rascunho com concorrência otimista | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| DELETE | `/api/tiss/guides/[id]` | Cancelamento ou devolução de saldo de autorização | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| POST | `/api/tiss/guides/from-appointment` | Conversão atômica de agendamento em guia TISS com deduplicação | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| GET | `/api/tiss/guides/available-for-glosa` | Busca de guias elegíveis e saldo disponível para lançamento de glosa | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/tiss/batches` | Listagem de lotes de faturamento por competência e operadora | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/batches` | Agrupamento de guias e fechamento de lote | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/batches/[id]/generate-xml` | Geração e versionamento de XML TISS com cálculo de hash | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/batches/[id]/submit` | Registro de protocolo de envio manual ou transmissão de lote | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/batches/[id]/reopen` | Reabertura justificada de lote fechado com registro de auditoria | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/tiss/glosas` | Painel gerencial de glosas ativas, contestadas e acatadas | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/glosas/manual` | Lançamento manual de glosa com rateio e conciliação contábil | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/tiss/glosas/reasons` | Catálogo oficial ANS (Tabela 38) de códigos de motivo de glosa | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |
| POST | `/api/tiss/appeals` | Criação de recurso formal de glosa por lote ou guia | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/tiss/appeals/templates` | Modelos institucionais padronizados de recursos de glosa | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/returns/import` | Upload e conciliação de arquivos de retorno (XML/CSV) das operadoras | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/returns/[id]/undo` | Estorno atômico e transacional de retorno via RPC `tiss_undo_return_import` | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/validate-xsd` | Validação de conformidade estrutural e de esquema ANS do lote | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/tiss/settings/premium` | Consulta de status do faturamento premium para a clínica | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST, SUPER_ADMIN | Ativo |
| POST | `/api/tiss/settings/premium` | Ativação do módulo faturamento premium com persistência JSONB | SUPER_ADMIN (Exclusivo) | Ativo |
| POST | `/api/insurance/check-eligibility` | Checagem de elegibilidade e carência de beneficiário | CLINIC_ADMIN, FINANCIAL, RECEPTIONIST | Ativo |

---

## 5. Agendamentos, Grade e Calendário Clínico (`/api/appointments` e `/api/schedules`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/appointments` | Listagem de agendamentos com filtros por médico, paciente, data e status | CLINIC_ADMIN, RECEPTIONIST, DOCTOR (próprios) | Ativo |
| POST | `/api/appointments` | Criação de agendamento presencial ou teleconsulta com trava anti-conflito | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| GET | `/api/appointments/[id]` | Detalhamento do agendamento, histórico e vínculos | Autenticado da clínica | Ativo |
| PUT/PATCH | `/api/appointments/[id]` | Atualização de status, sala, convênio e profissional | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| DELETE | `/api/appointments/[id]` | Exclusão ou desvinculação da grade institucional | CLINIC_ADMIN, RECEPTIONIST, SUPER_ADMIN | Ativo |
| POST | `/api/appointments/[id]/cancel` | Cancelamento formal com justificativa e liberação imediata do slot | CLINIC_ADMIN, RECEPTIONIST, DOCTOR | Ativo |
| POST | `/api/appointments/[id]/doctor-checkin` | Confirmação de presença em consultório (evento central de repasse) | DOCTOR, CLINIC_ADMIN | Ativo |
| GET | `/api/appointments/available-slots` | Consulta de horários livres calculados da grade do profissional | Autenticado / Público (Portal) | Ativo |
| POST | `/api/appointments/recurring` | Geração de série recorrente de atendimentos terapêuticos | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| POST | `/api/appointments/walk-in` | Registro de encaixe imediato para atendimento em recepção | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| POST | `/api/appointments/suggest-slots` | Sugestão algorítmica de horários para conciliação de agendas | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| GET | `/api/doctors/[id]/schedules` | Grade de horários e intervalos de atendimento do profissional | CLINIC_ADMIN, DOCTOR | Ativo |
| POST | `/api/doctors/[id]/schedules` | Configuração semanal de slots, duração e dias de atendimento | CLINIC_ADMIN, DOCTOR | Ativo |

---

## 6. Prontuário Clínico Eletrônico (PEP) e Armazenamento R2 (`/api/medical-records`, `/api/documents`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/medical-records` | Listagem de prontuários com controle de sigilo por terapeuta | CLINIC_ADMIN, DOCTOR (vinculados) | Ativo |
| POST | `/api/medical-records` | Criação de registro de atendimento, anamnese, diagnóstico CID-10 | CLINIC_ADMIN, DOCTOR | Ativo |
| GET | `/api/medical-records/[id]` | Consulta integral de evolução clínica do paciente | CLINIC_ADMIN, DOCTOR (autorizados) | Ativo |
| PUT | `/api/medical-records/[id]` | Atualização de rascunho com controle de salvamento automático | DOCTOR autor | Ativo |
| POST | `/api/session-evolutions` | Registro de evolução estruturada de sessão terapêutica | CLINIC_ADMIN, DOCTOR | Ativo |
| PATCH | `/api/session-evolutions/[id]` | Finalização de evolução com bloqueio definitivo de edição | DOCTOR autor | Ativo |
| POST | `/api/session-evolutions/[id]/sign-icp` | Assinatura digital criptográfica ICP-Brasil (Padrão A1) | DOCTOR com certificado | Ativo |
| GET | `/api/documents/[id]/download` | Download seguro com geração de Presigned URL Cloudflare R2 | Autenticado autorizado | Ativo |
| POST | `/api/documents/upload` | Upload direto e atômico para bucket privado no Cloudflare R2 | CLINIC_ADMIN, RECEPTIONIST, Coordenador | Ativo |
| DELETE | `/api/documents/[id]` | Exclusão de laudo ou documento com registro em trilha de auditoria | CLINIC_ADMIN, RECEPTIONIST, SUPER_ADMIN | Ativo |

---

## 7. Pacientes, Admissão e Portal (`/api/patients`, `/api/patient`, `/api/intake`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/patients` | Listagem de pacientes ativos da clínica com busca textual | Autenticado da clínica | Ativo |
| POST | `/api/patients` | Cadastro completo de paciente (dados civis, plano e responsáveis) | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| GET | `/api/patients/[id]` | Ficha completa do paciente, carteirinhas e contatos | Autenticado da clínica | Ativo |
| PUT/PATCH | `/api/patients/[id]` | Atualização de dados cadastrais e convênio | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| DELETE | `/api/patients/[id]` | Inativação lógica do cadastro do paciente | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| POST | `/api/intake/links` | Emissão de link seguro para pré-cadastro digital online | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| GET | `/api/intake/[token]` | Leitura de formulário público de admissão de paciente | Público com token | Ativo |
| POST | `/api/intake/[token]/submit` | Envio de formulário pelo paciente com fotos de documentos | Público com token | Ativo |
| POST | `/api/patient/auth/login` | Login do paciente no portal exclusivo via CPF e senha | Paciente | Ativo |
| GET | `/api/patient/appointments` | Consulta de agendamentos futuros e passados do próprio paciente | Paciente autenticado | Ativo |
| GET | `/api/patient/medical-records` | Acesso a prescrições e laudos liberados ao paciente | Paciente autenticado | Ativo |

---

## 8. Telemedicina, Salas WebRTC e Presença (`/api/video`, `/api/telemedicine`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| POST | `/api/video/rooms` | Abertura de sala virtual criptografada de teleconsulta | CLINIC_ADMIN, DOCTOR | Ativo |
| GET | `/api/video/token` | Emissão de credenciais de acesso seguro JWT (Daily/LiveKit) | Profissional ou Paciente autorizado | Ativo |
| POST | `/api/video/end-call` | Encerramento formal da sessão de vídeo com registro de duração | DOCTOR, CLINIC_ADMIN | Ativo |
| GET | `/api/teleconsulta/rooms/[id]/status` | Consulta de presença de médico e paciente na sala | Profissional ou Paciente autorizado | Ativo |

---

## 9. Mensageria WhatsApp e Agendador pg_cron (`/api/whatsapp`, `/api/cron`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| POST | `/api/whatsapp/connect` | Inicialização de sessão Baileys e geração de QR Code | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| GET | `/api/whatsapp/status` | Estado da conexão com a instância da clínica | CLINIC_ADMIN, SUPER_ADMIN | Ativo |
| POST | `/api/whatsapp/send` | Disparo manual de mensagem de atendimento ou aviso | CLINIC_ADMIN, RECEPTIONIST | Ativo |
| POST | `/api/whatsapp/repasse-extract` | Envio automático de extrato confidencial de repasse para o profissional | CLINIC_ADMIN, FINANCIAL | Ativo |
| GET | `/api/cron/send-scheduled-whatsapp` | Worker disparado exclusivamente pelo gate `trigger_scheduled_whatsapp_worker()` | Sistema / pg_net com segredo | Ativo |
| POST | `/api/cron/send-reminders` | Envio automatizado de lembretes de consulta 24 horas antes | Sistema / Cron | Ativo |
| POST | `/api/cron/cancel-unpaid` | Cancelamento automático de agendamentos particulares vencidos | Sistema / Cron | Ativo |

---

## 10. Gestão Financeira, DRE e Repasse (`/api/financial`, `/api/payroll`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/financial/entries` | Listagem de entradas e saídas de caixa com filtros | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/financial/entries` | Lançamento manual de receita ou despesa operacional | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/financial/summary` | Indicadores consolidados de receita, despesa e saldo | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/financial/dre` | Demonstrativo de Resultado do Exercício por regime contábil | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/financial/closing` | Fechamento mensal de competência financeira | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/payroll` | Folha de repasse aos profissionais com detalhamento por procedimento | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| GET | `/api/doctor-patient-rates` | Gestão de valores diferenciados de repasse acordados por paciente | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |
| POST | `/api/doctor-patient-rates/bulk` | Importação em lote de tabela de repasse personalizado | CLINIC_ADMIN, FINANCIAL, SUPER_ADMIN | Ativo |

---

## 11. Governança da Plataforma e Super Admin (`/api/super-admin`, `/api/platform`)

| Método | Rota | Descrição | Permissão (RBAC) | Status |
|--------|------|-----------|------------------|--------|
| GET | `/api/super-admin/dashboard` | Visão macro de faturamento, clínicas ativas e volumetria | SUPER_ADMIN (Exclusivo) | Ativo |
| GET | `/api/super-admin/clinics` | Listagem completa de todos os tenants cadastrados | SUPER_ADMIN (Exclusivo) | Ativo |
| PATCH | `/api/super-admin/clinics/[id]` | Edição de limites, ativação/desativação e toggles premium | SUPER_ADMIN (Exclusivo) | Ativo |
| DELETE | `/api/super-admin/clinics/[id]` | Exclusão segura em cascata sequencial de clínicas | SUPER_ADMIN (Exclusivo) | Ativo |
| POST | `/api/super-admin/impersonate` | Geração de sessão assistida para suporte técnico institucional | SUPER_ADMIN (Exclusivo) | Ativo |
| GET | `/api/platform/settings` | Consulta de feature flags e modo de manutenção global | Autenticado / SUPER_ADMIN | Ativo |
| POST | `/api/platform/settings` | Atualização atômica de chaves globais da plataforma | SUPER_ADMIN (Exclusivo) | Ativo |
| GET | `/api/health` | Health check operacional de infraestrutura e conectividade com banco | Público / Monitoramento | Ativo |
