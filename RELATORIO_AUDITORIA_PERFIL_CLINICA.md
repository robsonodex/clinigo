# RELATÓRIO DE AUDITORIA: SEGMENTAÇÃO POR PERFIL DE CLÍNICA (FASE 0)
**Data:** 18/09/2026  
**Status da Fase:** FASE 0 CONCLUÍDA — AGUARDANDO APROVAÇÃO HUMANA  
**Branch de Trabalho:** `feature/perfil-clinica-audit`  
**Modo:** Somente Leitura (Nenhum arquivo de código-fonte alterado ou excluído)  

---

## 1. RESUMO EXECUTIVO DA AUDITORIA

1. **Estado Atual dos Cadastros:**
   - Existem hoje **3 clínicas cadastradas em produção**:
     - **Espaço Incluir** (`5163c916-8b82-4d80-8a71-01726836ee46`) — Uso intensivo de **Terapia** (13.426 agendamentos, 941 evoluções, 151 pacientes na fila de espera, 933 lançamentos financeiros, 29 repasses, 60 itens de estoque, 438 documentos de pacientes).
     - **WorldSensory Terapias Multidisciplinares** (`4c13e586-5390-4393-a180-2c9dd7ed81c7`) — Uso intensivo de **Terapia Multidisciplinar** e **Camada A Proprietária** (23.285 agendamentos, 72 prontuários, 24 planos de sessão proprietários, 12 convênios, módulos ativos em `clinica_modulos`).
     - **Clinica Demo Teste** (`0c9ccb05-8530-4f8d-8d64-dd3eb6614e30`) — Tenant interno de testes do Super Admin.
   - Todas as 3 clínicas em produção estão no plano **`PROFESSIONAL`** e configuradas com `professional_label = 'Terapeuta'`.
   - **Nenhuma clínica cadastrada hoje perderá acesso a qualquer recurso** se mantidas com o perfil `CLINICA_TERAPIA` (ou com perfil completo).

2. **Onde a Escolha de Perfil é Capturada Hoje:**
   - No site público de marketing (`components/sections/AudienceSelector.tsx`), existem os cards "Clínica ou Consultório" e "Terapeuta ou Clínica de Terapia". Ambos apontam os botões para `/registro`.
   - **A escolha é 100% descartada no marketing:** não passa parâmetro de URL (`?perfil=...`) e os fluxos reais de criação (`app/api/auth/register/route.ts` e `app/api/auth/pre-register/route.ts` + `registration_pending`) **não possuem nenhuma coluna ou parâmetro** para perfil de clínica. A tabela `clinics` possui apenas `professional_label` e `council_label`, sem nenhuma coluna de segmento ou perfil.

3. **Arquitetura de Gating Existente:**
   - **Gating por Plano:** `middleware.ts` consome `ROUTE_MIN_PLAN` (`lib/constants/route-features.ts`).
   - **Gating por Permissão Customizada:** `lib/constants/features.ts` (28+ feature keys), `lib/services/permissions-service.ts`, `app/api/permissions/current/route.ts`, hook `usePlan()` e tabela `clinic_custom_permissions` (atualmente com 0 registros no banco).
   - **Sidebar:** `components/layout/sidebar.tsx` filtra itens via `filteredSections` usando `minPlan`, `featureKey`, `roles` e travas manuais de allowlist (Camada A).
   - **Camada A (World Sensory):** Totalmente preservada e isolada em `contracts-allowlist.ts` e `session-plans-beta-clinics.ts`.

---

## 2. TABELA DE INVENTÁRIO COMPLETO DO SISTEMA

Abaixo está o mapeamento exaustivo de todos os módulos, páginas, rotas de API, tabelas associadas, gatings existentes e a classificação proposta.

> **Legenda de Classificação Proposta:**
> - **`UNIVERSAL`**: Pertinente a ambos os perfis (Clínica Geral e Clínica de Terapia).
> - **`SÓ_CLINICA_GERAL`**: Específico para consultórios e clínicas médicas convencionais.
> - **`SÓ_CLINICA_TERAPIA`**: Específico para clínicas de desenvolvimento humano, terapia multidisciplinar, psicologia, ABA, etc.
> - **`AMBÍGUO`**: Módulo cuja fronteira depende de modelo de negócio e requer validação humana explícita.

| Categoria | Módulo / Funcionalidade | Rota(s) Frontend | Arquivo(s) Principais | Rota(s) de API | Tabela(s) de Banco | Gating Atual | Classificação Proposta | Confiança | Justificativa Curta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Principal** | Dashboard Principal | `/dashboard` | `app/dashboard/page.tsx` | `/api/dashboard/*` | `appointments`, `patients`, `financial_entries` | `FEATURE_KEYS.DASHBOARD` (Protegido, imutável) | `UNIVERSAL` | Alta | Tela inicial e métricas vitais para qualquer estabelecimento de saúde. |
| **Principal** | Checklist Inicial (Onboarding) | `/dashboard/onboarding` | `app/dashboard/(clinic)/onboarding/page.tsx` | N/A (Client state / config) | `clinics` | Role: `CLINIC_ADMIN` (auto-oculta após 30 dias) | `UNIVERSAL` | Alta | Guia de primeiros passos essencial para novos clientes de qualquer perfil. |
| **Agendamento** | Agenda Geral | `/dashboard/agenda`, `/dashboard/agenda/balcao` | `app/dashboard/(clinic)/agenda/page.tsx` | `/api/appointments/*` | `appointments`, `schedules` | `FEATURE_KEYS.AGENDA` (Básico+) | `UNIVERSAL` | Alta | Marcação de consultas/sessões é o coração de clínicas médicas e de terapia. |
| **Agendamento** | Minha Agenda | `/dashboard/minha-agenda` | `app/dashboard/(doctor)/minha-agenda/page.tsx` | `/api/appointments/*` | `appointments`, `doctors` | Role: `DOCTOR` (Básico+) | `UNIVERSAL` | Alta | Visão individualizada para o médico ou terapeuta logado. |
| **Agendamento** | Consultas & Teleconsulta | `/dashboard/consultas`, `/dashboard/consultas/[id]` | `app/dashboard/(clinic)/consultas/page.tsx` | `/api/consultations/*`, `/api/video/*` | `consultations`, `video_rooms` | `FEATURE_KEYS.CONSULTAS` (Básico+) | `UNIVERSAL` | Alta | Atendimentos síncronos e teleconsultas são utilizados em medicina e telepsicologia. |
| **Agendamento** | Recepção & Painel TV | `/dashboard/recepcao`, `/dashboard/recepcao/face-checkin`, `/painel-tv/[clinicId]` | `app/dashboard/(clinic)/recepcao/page.tsx` | `/api/reception/*`, `/api/checkin/*` | `appointment_checkins`, `appointment_queue` | `FEATURE_KEYS.RECEPCAO` (Básico+) | `UNIVERSAL` | Alta | Controle de fluxo na recepção e sala de espera aplica-se a ambos os perfis. |
| **Agendamento** | Horários & Turnos | `/dashboard/horarios` | `app/dashboard/(clinic)/horarios/page.tsx` | `/api/doctors/[id]/schedules` | `schedules`, `schedule_price_ranges` | `FEATURE_KEYS.HORARIOS` (Básico+) | `UNIVERSAL` | Alta | Definição de grade de disponibilidade de profissionais. |
| **Equipe** | Médicos / Terapeutas | `/dashboard/medicos`, `/dashboard/medicos/[id]` | `app/dashboard/(clinic)/medicos/page.tsx` | `/api/doctors/*` | `doctors`, `users` | `FEATURE_KEYS.MEDICOS` (Básico+) | `UNIVERSAL` | Alta | Cadastro de corpo clínico. O título adapta-se via `professional_label`. |
| **Equipe** | Pacientes | `/dashboard/pacientes`, `/dashboard/pacientes/[id]` | `app/dashboard/(clinic)/pacientes/page.tsx` | `/api/patients/*` | `patients`, `patient_face_biometrics` | `FEATURE_KEYS.PACIENTES` (Básico+) | `UNIVERSAL` | Alta | Cadastro unificado de prontuário, filiação, convênios e contatos. |
| **Prontuário** | Prontuários (PEP) | `/dashboard/prontuarios`, `/dashboard/prontuarios/[id]` | `app/dashboard/(clinic)/prontuarios/page.tsx` | `/api/medical-records/*` | `medical_records`, `medical_record_signatures` | `FEATURE_KEYS.PRONTUARIOS` (Básico+) | `UNIVERSAL` | Alta | Prontuário eletrônico legal obrigatório pelo CFM, CFP e conselhos de classe. |
| **Prontuário** | Prescrições Digitais | `/dashboard/prescricoes` | `app/dashboard/(doctor)/prescricoes/page.tsx` | `/api/prescriptions/*` | `prescriptions`, `prescription_items` | `FEATURE_KEYS.PRESCRICOES` (`minPlan: PROFESSIONAL`) | `AMBÍGUO` | Média | **Ver Dúvida 1:** Prescrição medicamentosa é essencial para médicos; psicólogos/terapeutas não prescrevem remédios (mas podem usar para pedidos de exames/recomendações). |
| **Prontuário** | Documentos & Atestados | `/dashboard/documentos` | `app/dashboard/(clinic)/documentos/page.tsx` | `/api/documents/*`, `/api/patient-signatures/*` | `patient_documents`, `digital_signatures` | `FEATURE_KEYS.DOCUMENTOS` (Básico+) | `UNIVERSAL` | Alta | Emissão de laudos, relatórios, atestados e declarações de comparecimento. |
| **Prontuário** | Modelos de Termos & Contratos | `/dashboard/configuracoes/modelos-documentos` | `app/dashboard/(clinic)/configuracoes/modelos-documentos/page.tsx` | `/api/document-templates/*` | `clinic_document_templates` | `FEATURE_KEYS.MODELOS_DOCUMENTOS` (Básico+) | `UNIVERSAL` | Alta | Templates padronizados para declarações, consentimentos e termos. |
| **Prontuário** | Templates de Prontuário | `/dashboard/configuracoes/templates-prontuario` | `app/dashboard/(clinic)/configuracoes/templates-prontuario/page.tsx` | `/api/medical-record-templates/*` | `medical_record_templates` | `FEATURE_KEYS.TEMPLATES_PRONTUARIO` (Básico+) | `UNIVERSAL` | Alta | Modelos SOAP, Anamnese Médica, Avaliação Psicológica, Fisioterapêutica, etc. |
| **Prontuário** | Planos Terapêuticos | `/dashboard/planos-terapeuticos` | `app/dashboard/(clinic)/planos-terapeuticos/page.tsx` | `/api/therapeutic-plans/*` | `therapeutic_plans`, `therapeutic_plan_goals` | `FEATURE_KEYS.PLANOS_TERAPEUTICOS` (Básico+) | `SÓ_CLINICA_TERAPIA` | Alta | Planejamento de metas de médio/longo prazo típico de terapias (ABA, TO, Fono). |
| **Prontuário** | Evoluções Terapêuticas | `/dashboard/evolucoes`, `/dashboard/manual-evolucao` | `app/dashboard/(clinic)/evolucoes/page.tsx` | `/api/session-evolutions/*` | `session_evolutions` | `FEATURE_KEYS.EVOLUCOES` (Básico+) | `SÓ_CLINICA_TERAPIA` | Alta | Registro recorrente de sessão terapêutica por metas. Consultas médicas usam o PEP. |
| **Prontuário** | Controle de Faltas | `/dashboard/controle-faltas` | `app/dashboard/(clinic)/controle-faltas/page.tsx` | `/api/absence-rules/*` | `absence_rules` | `FEATURE_KEYS.CONTROLE_FALTAS` (Básico+) | `AMBÍGUO` | Média | **Ver Dúvida 2:** Crítico para terapia (descontinuidade de tratamento), mas também útil para gestão de no-show em clínicas gerais. |
| **Prontuário (Camada A)** | Contratos & Assinaturas | `/dashboard/contratos/**` | `app/dashboard/(clinic)/contratos/page.tsx` | `/api/contracts/*`, `/api/public/signature/*` | `contract_documents`, `contract_templates` | Allowlist Estrita (`contracts-allowlist.ts`) | `SÓ_CLINICA_TERAPIA` (Camada A) | Alta | Exclusivo World Sensory. Manter regra isolada de Allowlist sem modificação. |
| **Prontuário (Camada A)** | Psicomotricidade & Planos de Sessão | `/dashboard/pacientes/[id]/psicomotricidade/**` | `app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/page.tsx` | `/api/planos-sessao/*` | `planos_sessao`, `ficha_capa_psicomotricidade` | Allowlist Estrita (`session-plans-beta-clinics.ts`) | `SÓ_CLINICA_TERAPIA` (Camada A) | Alta | Exclusivo World Sensory. Manter regra isolada de Allowlist sem modificação. |
| **Terapia** | Fila de Espera | `/dashboard/terapia/fila-espera` | `app/dashboard/(clinic)/terapia/fila-espera/page.tsx` | `/api/waiting-list/*` | `waiting_list` | `FEATURE_KEYS.FILA_ESPERA` (Básico+) | `AMBÍGUO` | Média | **Ver Dúvida 3:** Muito usado em terapia (Espaço Incluir tem 151), mas consultórios com alta procura médica também usam fila/encaixe. |
| **Terapia** | Encaminhamentos | `/dashboard/terapia/encaminhamentos` | `app/dashboard/(clinic)/terapia/encaminhamentos/page.tsx` | `/api/referrals/*` | `referrals`, `clinic_referrals` | `FEATURE_KEYS.ENCAMINHAMENTOS` (`minPlan: AVANCADO`) | `SÓ_CLINICA_TERAPIA` | Alta | Encaminhamento multiprofissional interno (ex: Psiquiatra → TO → Fonoaudiólogo). |
| **Terapia** | Supervisão Clínica | `/dashboard/terapia/supervisao` | `app/dashboard/(clinic)/terapia/supervisao/page.tsx` | `/api/supervision/*` | `supervision_records` | `FEATURE_KEYS.SUPERVISAO` (`minPlan: AVANCADO`) | `SÓ_CLINICA_TERAPIA` | Alta | Supervisão de horas de estágio/especialistas em psicologia e terapias. |
| **Terapia** | Retenção & Evasão (BI) | `/dashboard/terapia/retencao`, `/dashboard/terapia/risco-evasao` | `app/dashboard/(clinic)/terapia/retencao/page.tsx` | `/api/reports/retention`, `/api/patients/evasion-risk` | `appointments`, `patients` | `FEATURE_KEYS.BI_TERAPIA` (`minPlan: AVANCADO`) | `SÓ_CLINICA_TERAPIA` | Alta | Métricas voltadas à adesão e abandono de tratamento continuado. |
| **Terapia** | Aderência & Conformidade | `/dashboard/terapia/aderencia`, `/dashboard/terapia/conformidade-evolucao` | `app/dashboard/(clinic)/terapia/aderencia/page.tsx` | `/api/reports/adherence` | `session_evolutions`, `appointments` | `FEATURE_KEYS.BI_TERAPIA` (`minPlan: AVANCADO`) | `SÓ_CLINICA_TERAPIA` | Alta | Auditoria de se as sessões de terapia estão sendo devidamente evoluídas. |
| **Terapia** | Desfechos & Carga de Trabalho | `/dashboard/terapia/desfechos`, `/dashboard/terapia/carga-trabalho` | `app/dashboard/(clinic)/terapia/desfechos/page.tsx` | `/api/reports/discharge`, `/api/reports/therapist-workload` | `therapeutic_plans`, `appointments` | `FEATURE_KEYS.BI_TERAPIA` (`minPlan: AVANCADO`) | `SÓ_CLINICA_TERAPIA` | Alta | Medição de alta terapêutica e saturação de carga de terapeutas. |
| **Terapia** | Demográfico, Modalidade e Sazonalidade | `/dashboard/terapia/demografico`, `/receita-modalidade`, `/sazonalidade` | `app/dashboard/(clinic)/terapia/demografico/page.tsx` | `/api/reports/demographics`, `modality-revenue`, `seasonality` | `patients`, `appointments`, `financial_entries` | `FEATURE_KEYS.BI_TERAPIA` (`minPlan: AVANCADO`) | `SÓ_CLINICA_TERAPIA` | Alta | BI focado em modalidades de tratamento e distribuição por idade infantil. |
| **Terapia** | NPS / Satisfação | `/dashboard/terapia/nps` | `app/dashboard/(clinic)/terapia/nps/page.tsx` | `/api/nps/*` | `nps_surveys`, `satisfaction_surveys` | `FEATURE_KEYS.BI_TERAPIA` (`minPlan: PROFESSIONAL`) | `UNIVERSAL` | Alta | Avaliação de satisfação do paciente/família deve existir para qualquer clínica. |
| **Financeiro** | Lançamentos & Conciliação | `/dashboard/financeiro`, `/dashboard/financeiro/conciliacao` | `app/dashboard/(clinic)/financeiro/page.tsx` | `/api/financial/*` | `financial_entries`, `financial_categories` | `FEATURE_KEYS.FINANCEIRO` (Básico+) | `UNIVERSAL` | Alta | Contas a pagar, a receber e controle de fluxo de caixa para ambos. |
| **Financeiro** | Pagamentos & Cobranças | `/dashboard/pagamentos` | `app/dashboard/(clinic)/pagamentos/page.tsx` | `/api/payments/*` | `payments`, `payment_requests` | `FEATURE_KEYS.PAGAMENTOS` (Básico+) | `UNIVERSAL` | Alta | Emissão de PIX, boletos e cobranças para consultas/sessões. |
| **Financeiro** | Fechamentos de Caixa | `/dashboard/financeiro/fechamento` | `app/dashboard/(clinic)/financeiro/fechamento/page.tsx` | `/api/financial/fechamento/*` | `financial_summary` | `FEATURE_KEYS.FECHAMENTO_CAIXA` (Básico+) | `UNIVERSAL` | Alta | Conferência de caixa físico/diário de recepção. |
| **Financeiro** | Créditos de Pacientes | `/dashboard/financial/credits` | `app/dashboard/(clinic)/financial/credits/page.tsx` | `/api/financial/credits/*` | `patients` (saldo de créditos) | `FEATURE_KEYS.CREDITOS_PACIENTES` (`minPlan: PROFESSIONAL`) | `UNIVERSAL` | Média | Pacotes pré-pagos de sessões ou consultas adiantadas. |
| **Financeiro** | Folha de Repasse & Produção | `/dashboard/financial/payroll`, `/dashboard/financial/producao` | `app/dashboard/(clinic)/financial/payroll/page.tsx` | `/api/payroll/*` | `medical_payroll`, `payroll_items`, `doctor_contracts` | `FEATURE_KEYS.REPASSE_MEDICO` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Motor de cálculo de repasse por % ou valor fixo (usado para Médicos e Terapeutas). |
| **Financeiro** | DRE & Controladoria | `/dashboard/financial/dre`, `/dashboard/financial/dre-costcenter` | `app/dashboard/(clinic)/financial/dre/page.tsx` | `/api/financial/dre/*` | `financial_entries` | `FEATURE_KEYS.DRE` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Demonstrativo de Resultados contábil para gestão empresarial. |
| **Financeiro** | Projeções, Metas & LTV | `/dashboard/financial/ltv`, `/dashboard/financial/goals`, `/dashboard/financeiro/projecao` | `app/dashboard/(clinic)/financial/ltv/page.tsx` | `/api/financial/*` | `financial_goals`, `financial_entries` | `minPlan: PROFESSIONAL` | `UNIVERSAL` | Alta | Inteligência financeira e metas aplicável a qualquer negócio de saúde. |
| **Financeiro** | Inadimplência & Auditoria | `/dashboard/financeiro/inadimplencia`, `/dashboard/financial/audit` | `app/dashboard/(clinic)/financeiro/inadimplencia/page.tsx` | `/api/financial/audit/*` | `financial_entries`, `audit_logs` | `FEATURE_KEYS.AUDITORIA` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Cobrança de devedores e compliance fiscal/financeiro. |
| **Financeiro** | Faturamento TISS & Glosas | `/dashboard/tiss/**` | `app/dashboard/(clinic)/tiss/page.tsx` | `/api/tiss/*` | `tiss_guides`, `tiss_batches`, `tiss_glosas` | `FEATURE_KEYS.FATURAMENTO_TISS` (`minPlan: PROFESSIONAL`) | `AMBÍGUO` | Média | **Ver Dúvida 4:** TISS é padrão da ANS tanto para consultas médicas quanto terapias com convênios. Nem toda clínica atende convênio. |
| **Financeiro** | Meu Financeiro | `/dashboard/meu-financeiro/**` | `app/dashboard/(clinic)/meu-financeiro/page.tsx` | `/api/financial/my-statement/*` | `medical_payroll` | `FEATURE_KEYS.MEU_FINANCEIRO` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Portal do médico/terapeuta para visualização de seus próprios honorários. |
| **Financeiro** | Convênios & Reembolsos | `/dashboard/convenios`, `/dashboard/configuracoes/reembolso*` | `app/dashboard/(clinic)/convenios/page.tsx` | `/api/health-insurances/*`, `/api/reimbursement-configs/*` | `health_insurances`, `patient_reimbursements` | `FEATURE_KEYS.CONVENIOS` (Básico+) | `UNIVERSAL` | Alta | Tabela de preços de operadoras e cálculo de recibo para reembolso do paciente. |
| **Comunicação** | Chat Interno | `/dashboard/chat` | `app/dashboard/(clinic)/chat/page.tsx` | `/api/chat/*` | `chat_conversations`, `chat_messages` | `FEATURE_KEYS.CHAT` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Comunicação segura em tempo real entre recepção e consultórios. |
| **Comunicação** | WhatsApp & Disparos | `/dashboard/whatsapp` | `app/dashboard/(clinic)/whatsapp/page.tsx` | `/api/whatsapp/*` | `whatsapp_messages_log`, `whatsapp_sessions` | `FEATURE_KEYS.WHATSAPP` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Confirmação automática de consultas e lembretes para redução de no-show. |
| **Comunicação** | Notificações por E-mail | `/dashboard/notificacoes` | `app/dashboard/(clinic)/notificacoes/page.tsx` | `/api/notifications/*` | `notifications`, `email_logs` | `FEATURE_KEYS.NOTIFICACOES` (Básico+) | `UNIVERSAL` | Alta | E-mails transacionais e avisos automáticos da clínica. |
| **Comunicação** | FluxoMed (CRM & Pipeline) | `/dashboard/crm`, `/dashboard/crm/pipeline` | `app/dashboard/(clinic)/crm/page.tsx` | `/api/crm/*` | `crm_stages`, `chatbot_leads` | `FEATURE_KEYS.FLUXOMED` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Funil comercial de captação de pacientes para consultas ou terapias particulares. |
| **Gestão** | Estoque | `/dashboard/estoque` | `app/dashboard/(clinic)/estoque/page.tsx` | `/api/inventory/*` | `stock`, `stock_movements`, `products` | `FEATURE_KEYS.ESTOQUE` (Básico+) | `UNIVERSAL` | Alta | Controle de insumos médicos (gaze, luvas) ou materiais terapêuticos/pedagógicos. |
| **Gestão** | Relatórios Operacionais | `/dashboard/relatorios` | `app/dashboard/(clinic)/relatorios/page.tsx` | `/api/reports/*` | Múltiplas tabelas | `FEATURE_KEYS.RELATORIOS` (Básico+) | `UNIVERSAL` | Alta | Relatórios gerais de atendimentos, faltas e faturamento. |
| **Gestão** | Termos Legais & LGPD | `/dashboard/termos` | `app/dashboard/(clinic)/termos/page.tsx` | `/api/legal/*` | `legal_documents`, `lgpd_consents` | `FEATURE_KEYS.TERMOS_LEGAIS` (Básico+) | `UNIVERSAL` | Alta | Conformidade jurídica e registro de aceite da LGPD. |
| **Gestão** | Importação em Massa | `/dashboard/importacao/**` | `app/dashboard/importacao/page.tsx` | `/api/import/*` | `import_jobs`, `import_logs` | `FEATURE_KEYS.IMPORTACAO` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Migração de pacientes e histórico de prontuários vindos de outros sistemas. |
| **Gestão** | Automação | `/dashboard/automacao/**` | `app/dashboard/automacao/page.tsx` | `/api/automation/*` | `automation_rules`, `clinic_automation_configs` | `FEATURE_KEYS.AUTOMACAO` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Gatilhos automáticos de cobrança, lembrete e pós-consulta. |
| **Gestão** | Logs de Auditoria & LGPD | `/dashboard/logs-auditoria` | `app/dashboard/(clinic)/logs-auditoria/page.tsx` | `/api/audit-logs/*` | `audit_logs` | `FEATURE_KEYS.LOGS_AUDITORIA` (Básico+) | `UNIVERSAL` | Alta | Rastreabilidade de acessos a dados sensíveis de pacientes (LGPD obrigatória). |
| **Configurações** | Minha Clínica & Logotipo | `/dashboard/configuracoes` | `app/dashboard/(clinic)/configuracoes/page.tsx` | `/api/clinics/*` | `clinics` | `FEATURE_KEYS.MINHA_CLINICA` (Básico+) | `UNIVERSAL` | Alta | Dados cadastrais, endereço, cores institucionais e logotipo. |
| **Configurações** | Página Pública de Agendamento | `/dashboard/configuracoes/pagina-publica` | `app/dashboard/(clinic)/configuracoes/pagina-publica/page.tsx` | `/api/clinics/*` | `clinics` (JSON `public_page_settings`) | `FEATURE_KEYS.PAGINA_PUBLICA` (Básico+) | `UNIVERSAL` | Alta | Landing page institucional para marcação online de consultas. |
| **Configurações** | Teleconsulta Config | `/dashboard/configuracoes/teleconsulta` | `app/dashboard/(clinic)/configuracoes/teleconsulta/page.tsx` | `/api/teleconsulta/*` | `clinics` | `FEATURE_KEYS.TELECONSULTA` (Básico+) | `UNIVERSAL` | Alta | Configurações de sala de teleconsulta e termos de consentimento. |
| **Configurações** | Usuários & Permissões | `/dashboard/configuracoes/usuarios` | `app/dashboard/(clinic)/configuracoes/usuarios/page.tsx` | `/api/users/*` | `users` | `FEATURE_KEYS.USUARIOS` (Básico+) | `UNIVERSAL` | Alta | Criação de acessos para recepcionistas, financeiro, médicos e coordenadores. |
| **Configurações** | Terapias & Especialidades | `/dashboard/configuracoes/terapias` | `app/dashboard/(clinic)/configuracoes/terapias/page.tsx` | `/api/therapist/*` | `doctors` (especialidades) | `FEATURE_KEYS.TERAPIAS_CONFIG` (Básico+) | `SÓ_CLINICA_TERAPIA` | Alta | Cadastro de abordagens e especialidades terapêuticas multidisciplinares. |
| **Configurações** | Assinatura do CliniGo | `/dashboard/configuracoes/assinatura` | `app/dashboard/(clinic)/configuracoes/assinatura/page.tsx` | `/api/billing/*` | `subscriptions`, `clinics` | `FEATURE_KEYS.ASSINATURA` (Básico+) | `UNIVERSAL` | Alta | Gerenciamento do plano contratado pela clínica junto ao CliniGo. |
| **Configurações** | Segurança & 2FA | `/dashboard/seguranca` | `app/dashboard/(clinic)/seguranca/page.tsx` | `/api/auth/mfa/*` | `user_mfa` | `FEATURE_KEYS.SEGURANCA` (Básico+) | `UNIVERSAL` | Alta | Ativação de autenticação em duas etapas para conformidade e proteção. |
| **Configurações** | Integrações | `/dashboard/integracoes` | `app/dashboard/(clinic)/integracoes/page.tsx` | `/api/integrations/*` | `clinic_integrations` | `FEATURE_KEYS.INTEGRACOES` (`minPlan: AVANCADO`) | `UNIVERSAL` | Alta | Webhooks, gateways de pagamento e integrações externas. |
| **Configurações** | Dispositivos Pareados | `/dashboard/configuracoes/dispositivos` | `app/dashboard/(clinic)/configuracoes/dispositivos/page.tsx` | `/api/clinic-devices/*` | `clinic_devices` | Role: `CLINIC_ADMIN` | `UNIVERSAL` | Média | Pareamento de tablets de recepção ou totens quiosque. |

---

## 3. ITENS "AMBÍGUO — PRECISA DECISÃO HUMANA"

Os itens abaixo possuem argumentos válidos para ambos os lados ou cruzam fronteiras operacionais. **Nenhuma decisão arbitrária foi tomada.** Aguardo sua definição explícita:

### Pergunta 1: Prescrições Digitais (`/dashboard/prescricoes`)
- **Contexto:** Hoje está sob a categoria "Prontuário" com `minPlan: PROFESSIONAL`, visível apenas para `DOCTOR`.
- **Dilema:** Médicos usam prescrições obrigatoriamente (receituários de medicamentos, antimicrobianos, controlados). Em clínicas de terapia, a maioria dos profissionais (psicólogos, terapeutas ocupacionais, fonoaudiólogos) não prescreve medicação, mas médicos psiquiatras ou neuropediatras dentro de uma clínica multidisciplinar prescrevem.
- **Opções:**
  1. `SÓ_CLINICA_GERAL`: Fica oculta por padrão no perfil Terapia (a menos que liberada por override no Master Hub).
  2. `UNIVERSAL`: Continua disponível para ambos os perfis, condicionada ao plano Professional e ao papel `DOCTOR`.

### Pergunta 2: Controle de Faltas (`/dashboard/controle-faltas`)
- **Contexto:** Hoje está em "Prontuário", disponível no plano Básico para `CLINIC_ADMIN`.
- **Dilema:** Criado com foco em terapia (onde 2 ou 3 faltas consecutivas descontinuam o plano terapêutico e liberam a vaga para a fila de espera). Em consultórios médicos gerais, no-show é tratado mais como perda pontual de agenda/financeiro.
- **Opções:**
  1. `SÓ_CLINICA_TERAPIA`: Relevante especificamente para quem tem regras de frequência contínua.
  2. `UNIVERSAL`: Útil para qualquer clínica que queira aplicar regras automáticas de tolerância de faltas.

### Pergunta 3: Fila de Espera (`/dashboard/terapia/fila-espera`)
- **Contexto:** Hoje é o primeiro item da seção "Terapia". O Espaço Incluir possui **151 pacientes** cadastrados na fila de espera.
- **Dilema:** É um recurso central de clínicas de desenvolvimento humano / TEA. Porém, consultórios médicos de especialidades concorridas (ex: dermatologia, endocrinologia, cirurgia plástica) frequentemente solicitam listas de espera/encaixe.
- **Opções:**
  1. `SÓ_CLINICA_TERAPIA`: Permanece como submódulo da categoria Terapia.
  2. `UNIVERSAL (com renomeação)`: Pode ser movido ou compartilhado com o menu de Agendamento sob o nome "Lista de Espera" quando a clínica for Geral.

### Pergunta 4: Faturamento TISS & Glosas (`/dashboard/tiss/**`)
- **Contexto:** Hoje está em "Financeiro" com `minPlan: PROFESSIONAL`.
- **Dilema:** Faturamento TISS (padrão ANS com XML e guias de consulta/SADT) é típico da medicina suplementar brasileira. Clínicas médicas gerais com convênio usam intensamente. Clínicas de terapia que atendem convênios ou reembolso assistido também usam (ou usam apenas tabela particular e recibo de reembolso).
- **Opções:**
  1. `UNIVERSAL`: Fica disponível em ambos os perfis (quem não usa convênio simplesmente não acessa ou desativa).
  2. `SÓ_CLINICA_GERAL`: Considerado do universo médico hospitalar, deixando para Terapia o módulo de "Convênios e Reembolsos". *(Atenção: se a clínica de terapia faturar convênio via TISS, precisaria de override).*

---

## 4. USO REAL POR CLÍNICA EM PRODUÇÃO (LEVANTAMENTO SOMENTE LEITURA VIA SUPABASE)

Levantamento executado diretamente no banco de dados de produção (`dlxakeejmyzhzdxzjgne`):

### Clínica 1: Espaço Incluir
- **UUID:** `5163c916-8b82-4d80-8a71-01726836ee46`
- **Slug:** `espaco-incluir`
- **Email:** `financeiro@espacoincluiscs.com.br`
- **Plano Atual:** `PROFESSIONAL` (Ativo)
- **Labels Atuais:** `professional_label = 'Terapeuta'`, `council_label = 'Conselho de Classe'`
- **Dados e Volume Real em Produção:**
  - Usuários no sistema: **18**
  - Pacientes cadastrados: **48**
  - Agendamentos totais: **13.426**
  - Evoluções terapêuticas (`session_evolutions`): **941** (Altíssimo uso)
  - Fila de espera (`waiting_list`): **151** (Altíssimo uso)
  - Lançamentos financeiros (`financial_entries`): **933**
  - Folhas/itens de repasse (`medical_payroll`): **29**
  - Itens de estoque (`stock`): **60**
  - Documentos de pacientes (`patient_documents`): **438**
  - Campanhas de comunicação (`campaigns`): **1**
  - Modelos de prontuário (`medical_record_templates`): **1**
  - Guias TISS (`tiss_guides`): **0**
- **Perfil Recomendado para Backfill:** `CLINICA_TERAPIA`
- **Impacto no Rollout:** **Risco Zero.** Mantendo todas as funcionalidades de Terapia, Prontuário, Fila de Espera, Estoque, Repasses e Documentos que eles operam diariamente.

### Clínica 2: WorldSensory Terapias Multidisciplinares
- **UUID:** `4c13e586-5390-4393-a180-2c9dd7ed81c7`
- **Slug:** `worldsensory`
- **Email:** `clinicaworldsensory@gmail.com`
- **Plano Atual:** `PROFESSIONAL` (Ativo)
- **Labels Atuais:** `professional_label = 'Terapeuta'`, `council_label = 'CREFITO'`
- **Dados e Volume Real em Produção:**
  - Usuários no sistema: **32**
  - Pacientes cadastrados: **105**
  - Agendamentos totais: **23.285**
  - Prontuários (`medical_records`): **72**
  - Planos de Sessão Proprietários (`planos_sessao`): **24** (Camada A ativa)
  - Convênios cadastrados (`health_insurances`): **12**
  - Lançamentos financeiros (`financial_entries`): **8**
  - Módulos ativos em `clinica_modulos`: `psicomotricidade_sensory`, `evolucao_world_sensory`, `contratos_assinatura`
  - Guias TISS (`tiss_guides`): **0**
- **Perfil Recomendado para Backfill:** `CLINICA_TERAPIA`
- **Impacto no Rollout:** **Risco Zero.** Preserva integralmente os módulos de Terapia e a Allowlist proprietária da Camada A (Psicomotricidade, Fisioterapia, Contratos).

### Clínica 3: Clinica Demo Teste
- **UUID:** `0c9ccb05-8530-4f8d-8d64-dd3eb6614e30`
- **Slug:** `demo-teste`
- **Email:** `robsonsync.contas@gmail.com`
- **Plano Atual:** `PROFESSIONAL` (Ativo)
- **Labels Atuais:** `professional_label = 'Terapeuta'`, `council_label = 'CREFITO'`
- **Dados e Volume Real em Produção:**
  - Usuários: **4**
  - Pacientes: **1**
  - Agendamentos: **7**
  - Lançamentos financeiros: **3**
  - Planos de sessão: **7**
- **Perfil Recomendado para Backfill:** `CLINICA_TERAPIA` (ou configurável para testes de `CLINICA_GERAL` no Master Hub).
- **Impacto no Rollout:** **Risco Zero.** Ambiente de homologação interno.

---

## 5. ONDE A ESCOLHA DE PERFIL É CAPTURADA HOJE NO CADASTRO REAL

1. **No Site Público / Landing Page (`components/sections/AudienceSelector.tsx`):**
   - O componente renderiza os dois cards visuais:
     - Card 1: `title: "Clínica ou Consultório"`, `ctaHref: "/registro"`
     - Card 2: `title: "Terapeuta ou Clínica de Terapia"`, `ctaHref: "/registro"`
   - **Diagnóstico:** O clique em ambos os botões simplesmente navega para `/registro` (ou `/trial`). **Nenhum parâmetro de query (como `?perfil=terapeuta` ou `?perfil=clinica`) é transmitido na URL.**

2. **No Fluxo de Trial Público (`app/trial/page.tsx`):**
   - Coleta: `full_name`, `email`, `phone`, `cnpj`, `clinic_name`, `password`.
   - Dispara: `POST /api/auth/register`.
   - **Diagnóstico:** Não existe campo de seleção de perfil. Se o usuário veio pelo card de Terapia, essa intenção já se perdeu.

3. **Na API de Registro (`app/api/auth/register/route.ts`):**
   - O schema Zod valida apenas dados cadastrais e `plan_type` (default `'STARTER'`).
   - O `INSERT` na tabela `clinics` não possui nenhuma coluna de perfil.

4. **No Fluxo de Cadastro Pago / Boleto (`app/(auth)/cadastro/page.tsx`):**
   - Stepper em 6 etapas (Plano, Clínica, Endereço, Admin, Revisão, Pagamento).
   - Salva em `registration_pending` via `POST /api/auth/pre-register`.
   - **Diagnóstico:** Também não possui nenhuma etapa ou seleção de perfil.

5. **No Master Hub (`app/system-master-hub`):**
   - O Super Admin pode editar nome, plano e permissões customizadas (`clinic_custom_permissions`), mas não há seletor de perfil da clínica.

**Conclusão Estrutural:** A escolha de perfil hoje é **completamente cosmética no marketing** e **inexistente no banco de dados e nas APIs de cadastro**.

---

## 6. DIVERGÊNCIAS ENCONTRADAS (DOCUMENTAÇÃO TÉCNICA VS. CÓDIGO REAL)

Durante a auditoria, identificamos as seguintes divergências entre o código ativo e o material de referência:

1. **Presença do Módulo "Terapia" na Sidebar:**
   - *Doc / Guia:* Sugeria que clínicas gerais poderiam já ter menus diferenciados.
   - *Código Real:* O array `navigationSections` em `components/layout/sidebar.tsx` contém a seção `Terapia` (com `Fila de Espera`, `Encaminhamentos`, `Supervisão` e `BI`) exposta indistintamente para todas as clínicas que possuem o plano requerido (`AVANCADO` ou `PROFESSIONAL`). Não há filtro de perfil na sidebar.

2. **Permissões Customizadas (`clinic_custom_permissions`):**
   - *Doc / Guia:* Descrevia a existência do sistema de permissões customizadas por clínica.
   - *Código Real:* A infraestrutura de tabelas e serviços existe e está perfeitamente implementada (`features.ts`, `permissions-service.ts`, tela de permissions no Master Hub), porém a tabela `clinic_custom_permissions` possui exatamente **0 registros em produção**. As clínicas estão funcionando 100% sobre as regras padrão de plano (`defaultPlans`).

3. **Módulo de Contratos e Camada A:**
   - *Doc:* Mencionava que contratos e fichas proprietárias pertenciam a uma categoria de permissão comum.
   - *Código Real:* O código possui uma barreira hardcoded (`lib/constants/contracts-allowlist.ts` e `lib/constants/session-plans-beta-clinics.ts`) que bloqueia por UUID estrito da World Sensory (`4c13e586-5390-4393-a180-2c9dd7ed81c7`). Isso não é gating por perfil nem por plano, é **Allowlist de Tenant Proprietário**. Deve permanecer intocado.

4. **Planos Legados vs. Planos Reais:**
   - Na tabela `clinics`, o enum histórico aceitava `FREE`, `STARTER`, `BASIC`, `PRO`. O código moderno normaliza para `BASICO`, `AVANCADO`, `PROFESSIONAL`, `ENTERPRISE`. Todas as 3 clínicas em produção estão migradas e gravadas como `PROFESSIONAL`.

---

## 7. PRÓXIMOS PASSOS (CHECKPOINT OBRIGATÓRIO)

A **Fase 0 está concluída**. Nenhuma linha de código-fonte foi alterada.  
Por favor, avalie os pontos deste relatório e responda às **Perguntas 1 a 4 do Item 3 (Itens Ambíguos)** para que eu possa prosseguir com a elaboração do documento formal da **Fase 1 (`PLANO_IMPLEMENTACAO_PERFIL_CLINICA.md`)**.
