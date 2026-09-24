# CliniGo - Plataforma Integrada de Gestão Médica e Terapêutica Multidisciplinar

Sistema corporativo de gestão para clínicas médicas, consultórios e centros de terapia multidisciplinar. Desenvolvido com arquitetura moderna, suporte ao padrão ANS TISS, faturamento de convênios, prontuário eletrônico com níveis granulares de acesso, teleconsulta integrada, automação via WhatsApp, gestão de salas e conformidade rigorosa com a LGPD.

---

## 1. Visão Geral da Plataforma

O CliniGo atende desde clínicas individuais até operações de escala Enterprise (50+ profissionais). A plataforma centraliza a jornada do paciente, a governança clínica dos terapeutas e médicos, o faturamento TISS e a saúde financeira da instituição em uma única interface responsiva (Mobile PWA e Desktop).

### Pilares Fundamentais:
* **Segurança e Sigilo Clínico:** Isolamento multi-tenant garantido por Row Level Security (RLS) no PostgreSQL/Supabase.
* **Governança TISS / ANS:** Gestão completa de guias, fechamento de lotes, validação de schemas XSD e monitoramento de glosas.
* **Terapia Multidisciplinar e Medicina:** Prontuário especializado com suporte a escalas de desenvolvimento infantil, sensorial e prontuários médicos tradicionais.
* **Eficiência Operacional:** Redução de no-show via inteligência conversacional no WhatsApp e painel de salas para recepção.

---

## 2. Módulos e Recursos Contemplados

### 2.1 Recepção, Agendamento e Gestão de Salas
* **Agenda Multiprofissional:** Visualização simultânea em grade diária, semanal e mensal, com filtros por profissional, especialidade e status.
* **Gestão de Salas e Consultórios:** Cadastro de salas físicas, vinculação de profissionais e sincronização em tempo real com o Painel TV da sala de espera.
* **Fila de Espera Dinâmica:** Triagem de pacientes por especialidade, controle de tempo de espera e encaminhamento rápido para encaixes.
* **Check-in Inteligente:** Confirmação de chegada via QR Code e suporte a Biometria Facial para auditoria de comparecimento.
* **Agendamentos Recorrentes:** Criação e governança de horários fixos semanais para terapias continuadas (ABA, Fonoaudiologia, Terapia Ocupacional, Fisioterapia e Psicologia).

### 2.2 Prontuário Eletrônico e Atendimento Clínico
* **Histórico Unificado do Paciente:** Acesso centralizado a dados cadastrais, responsáveis legais, dados de contato e linha do tempo de atendimentos.
* **Evoluções de Sessão Especializadas:** Formulários de evolução clínica geral e módulos específicos para terapias sensoriais e multidisciplinares.
* **Níveis Granulares de Acesso (RLS):** Médicos e terapeutas visualizam estritamente os prontuários dos seus pacientes vinculados. Dados administrativos de convênios e valores podem ser ocultados para terapeutas conforme parametrização da clínica.
* **Documentos Clínicos:** Emissão de anamneses, prescrições com catálogo de medicamentos, atestados, laudos e upload de exames anexos.

### 2.3 Convênios e Faturamento TISS (Padrão ANS)
* **Gestão de Operadoras e Planos:** Cadastro completo de convênios, número de registro ANS, tabelas de procedimentos (TUSS/AMB) e parametrizações contratuais.
* **Lotes TISS e Exportação XML:** Agrupamento de guias (SP/SADT, Consulta, Honorários), fechamento de lotes por operadora, validação de regras de validação estrutural contra esquemas XSD e download de arquivos XML oficiais.
* **Controle e Gestão de Glosas:** Painel analítico de glosas recebidas, cálculo automático de taxa de perda, análise de risco prévio e fluxo formal de contestações/recursos com anexação de comprovantes.
* **Autorizações Prévias:** Acompanhamento do ciclo de vida de guias de autorização solicitadas junto às operadoras.
* **Transição de Versões TISS:** Monitoramento de adoção e compatibilidade entre schemas TISS vigentes da ANS.

### 2.4 Gestão Financeira e Repasse aos Profissionais
* **Contas a Pagar e Contas a Receber:** Controle abrangente de receitas (particulares e convênios) e despesas fixas/operacionais com categorização por plano de contas.
* **Motor Avançado de Repasse Médico:** Cálculo automático de comissões e repasses via `repasse-calculator`, suportando percentuais contratuais, valores fixos por procedimento ou taxas customizadas por par médico-paciente (`doctor_patient_rates`).
* **Fechamento de Folha e Demonstrativos:** Emissão de extratos de repasse detalhados com totalizadores contábeis.
* **Central de Notas Fiscais dos Profissionais:** Fluxo autônomo onde o prestador protocola sua NFS-e e documentos fiscais mesmo antes da liberação do demonstrativo pela administração.
* **DRE e Indicadores Executivos:** Demonstrativo de Resultados do Exercício, fluxo de caixa realizado vs. previsto, análise de inadimplência e conciliação de recebíveis.

### 2.5 Comunicação e Automação WhatsApp
* **Integração Nativa In-Process:** Conexão direta via protocolo WebSocket (Baileys) com leitura de QR Code direto no dashboard da clínica, mantendo sessões isoladas por tenant.
* **Lembretes e Confirmações Automáticas:** Disparo programado de mensagens antes das consultas.
* **Interpretação Bidirecional:** O paciente responde diretamente no WhatsApp ("Sim", "Confirmo", "Não poderei comparecer") e o motor de NLP identifica a intenção, atualizando o status da consulta na grade da agenda em tempo real.
* **Envio de Extratos de Repasse:** Notificação autenticada enviada aos profissionais com link seguro para visualização de seus demonstrativos.

### 2.6 Teleconsulta WebRTC Integrada
* **Salas Virtuais Seguras:** Criação dinâmica de salas criptografadas com tokens únicos e isolados para médico e paciente.
* **Compartilhamento Multicanal:** Distribuição imediata do link de atendimento por WhatsApp, e-mail e SMS.
* **Sem Necessidade de Instalação:** Funciona diretamente no navegador do paciente e do profissional, no celular ou desktop.

### 2.7 Módulo de Importação em Massa e Migração de Dados
* **Assistente de Importação (Wizard):** Ferramenta nativa para carga em lote de dados legados via planilhas (Excel e CSV).
* **Entidades Suportadas:**
  * Pacientes (dados cadastrais, CPF, convênios, responsáveis).
  * Corpo Clínico (profissionais, conselho de classe, especialidades, contratos).
  * Operadoras de Convênios.
  * Histórico Financeiro.
* **Validação de Estrutura:** Mecanismo de pré-validação com relatório de inconsistências antes da inserção no banco de dados.

### 2.8 Estoque e Suprimentos
* **Controle de Itens:** Cadastro de insumos hospitalares, medicamentos e materiais de escritório.
* **Movimentações:** Registro rastreável de entradas, baixas por atendimento e devoluções.
* **Alertas de Nível Mínimo:** Notificações automáticas quando o estoque atinge o ponto de reposição.

### 2.9 Relatórios e Business Intelligence
* **Produção Médica:** Volume de procedimentos e consultas realizadas por profissional e especialidade.
* **Faturamento Institucional:** Receita bruta, ticket médio e distribuição por convênio vs. particular.
* **Frequência e Faltas (No-Show):** Taxa de assiduidade de pacientes e absenteísmo por período.
* **Exportação Corporativa:** Geração direta em Excel formatado (`.xlsx`), CSV padrão brasileiro (delimitador `;` e BOM UTF-8) e relatórios executivos em PDF.

### 2.10 Gestão de Planos e Painel Super Admin
* **Níveis de Assinatura:** Básico, Avançado, Professional e Enterprise, com travas automáticas por número de profissionais, consultórios e recursos contratados.
* **Painel Super Administrativo:** Visão consolidada de clínicas ativas, faturamento de assinaturas, saúde da infraestrutura e logs de auditoria.

---

## 3. Arquitetura e Stack Tecnológica

| Camada | Tecnologia | Detalhamento |
|---|---|---|
| **Frontend Framework** | Next.js 14 (App Router) | React Server Components, Server Actions e Client Components |
| **Linguagem** | TypeScript 5 | Tipagem estrita de contratos de dados, interfaces e DTOs |
| **Estilização e Design System** | Tailwind CSS + Radix UI | Componentes acessíveis, responsividade Mobile PWA e Dark Mode nativo |
| **Iconografia** | Lucide Icons | Padrão sóbrio e estritamente vetorial (proibição de emojis na interface) |
| **Banco de Dados** | Supabase (PostgreSQL 15) | Relacional, com Row Level Security (RLS) compulsório em todas as tabelas |
| **Armazenamento de Arquivos** | Supabase Storage | Buckets protegidos para documentos clínicos, biometria e laudos |
| **Comunicação em Tempo Real** | Supabase Realtime | Atualização em tempo real de painéis de TV, agenda e chat |
| **WhatsApp Engine** | @whiskeysockets/baileys | Sessões WebSocket nativas em memória com persistência segura de credenciais |
| **Teleconsulta** | WebRTC | Comunicação peer-to-peer criptografada de áudio e vídeo |
| **Validação de Dados** | Zod | Schemas estritos para validação de requisições de API e formulários |
| **Manipulação de Planilhas** | ExcelJS | Geração de arquivos `.xlsx` nativos e parsing de planilhas de importação |

---

## 4. Estrutura de Diretórios

```
clinigo/
├── app/                                # Next.js App Router
│   ├── api/                            # Rotas de API Backend
│   │   ├── appointments/               # CRUD e lógica de agendamentos
│   │   ├── doctors/                    # Gestão de médicos e terapeutas
│   │   ├── financial/                  # Módulos financeiros, DRE e repasses
│   │   ├── import/                     # Jobs de validação e importação em massa
│   │   ├── patients/                   # Cadastro e busca unificada de pacientes
│   │   ├── reports/                    # Consolidação de KPIs e relatórios
│   │   ├── tiss/                       # Rotas de lotes, XML, autorizações e glosas
│   │   └── video/                      # Salas virtuais de teleconsulta
│   ├── dashboard/                      # Aplicação Autenticada
│   │   ├── (clinic)/                   # Visão Administrativa e Operacional da Clínica
│   │   │   ├── agenda/                 # Grade multiprofissional
│   │   │   ├── configuracoes/          # Gestão de salas, profissionais e clínica
│   │   │   ├── estoque/                # Controle de suprimentos
│   │   │   ├── financial/              # Notas fiscais e demonstrativos
│   │   │   ├── financeiro/             # Contas a pagar/receber, DRE e fluxo
│   │   │   ├── help/                   # Guia de Ajuda Integrado oficial
│   │   │   ├── medicos/                # Corpo clínico
│   │   │   ├── pacientes/              # Prontuários e base de pacientes
│   │   │   ├── recepcao/               # Painel operacional de recepção
│   │   │   ├── relatorios/             # BI e relatórios executivos
│   │   │   ├── terapia/                # Fila de espera e terapias multidisciplinares
│   │   │   └── tiss/                   # Lotes, autorizações e glosas TISS
│   │   ├── automacao/                  # Configuração de WhatsApp e automações
│   │   ├── importacao/                 # Wizard de migração de dados
│   │   └── super/                      # Painel exclusivo Super Administrador
│   ├── painel-tv/                      # Interface otimizada para televisores na recepção
│   └── portal-paciente/                # Área do paciente e autoagendamento
├── components/                         # Componentes reutilizáveis
│   ├── appointments/                   # Diálogos e botões da agenda
│   ├── financial/                      # Componentes de notas fiscais e conciliação
│   ├── import/                         # Wizard e steps de importação
│   ├── layout/                         # Sidebar, Header e Breadcrumb responsivos
│   ├── medical-records/                # Formulários de evolução clínica e sensorial
│   └── ui/                             # Primitivas visuais do Design System
├── lib/                                # Camada de Serviços e Lógica de Negócio
│   ├── services/                       # Motores de repasse, importação e notificações
│   ├── supabase/                       # Clientes Supabase (Browser, Server, Service Role)
│   ├── types/                          # Definições de tipos TypeScript
│   ├── utils/                          # Utilitários de exportação Excel/CSV, formatação e datas
│   ├── validations/                    # Schemas Zod de validação
│   └── whatsapp/                       # Serviço de sessão e conexão Baileys
└── supabase/                           # Infraestrutura de Banco de Dados
    └── migrations/                     # Scripts SQL versionados e políticas RLS
```

---

## 5. Governança, Segurança e LGPD

1. **Isolamento Absoluto de Dados (Multi-Tenancy):**
   * Toda consulta é filtrada compulsoriamente por `clinic_id`.
   * Profissionais de atendimento clínico não acessam dados de pacientes fora de sua custódia ou regras de sigilo.
2. **Proibição de PII Hardcoded:**
   * Nenhum identificador pessoal (CPF, nome, e-mail) é utilizado em cláusulas de código condicional para regras de negócio ou herança de prontuários.
3. **Padrão Visual SaaS Corporativo:**
   * Proibição compulsória de emojis na interface do sistema.
   * Iconografia 100% vetorial através de Lucide Icons.
4. **Política de Bypass de RLS:**
   * O uso de chaves `service_role` é restrito a rotas anônimas públicas estritamente necessárias (ex: autoagendamento público), contendo filtros manuais de contenção e testes de isolamento automatizados.

---

## 6. Procedimento de Build e Deploy em Produção

O deploy da plataforma segue o fluxo corporativo obrigatório:

```bash
# 1. Validação local e salvamento no controle de versão
git add .
git commit -m "feat: atualizacao da plataforma v5.3"
git push origin master

# 2. Publicação na Vercel (escopo do time corporativo fixado na v59.14.0)
npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
```

---

## 7. Suporte e Propriedade Intelectual

O CliniGo é um software proprietário protegido por direitos autorais.
Para alinhamentos operacionais, migrações e suporte:

* **Site Oficial:** https://www.clinigo.app
* **Guia de Ajuda Integrado:** `/dashboard/help` (acessível diretamente no painel autenticado)
