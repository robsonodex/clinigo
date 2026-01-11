# Relatório Completo do Sistema CliniGo

**Data de Atualização:** 11 de Janeiro de 2026
**Versão:** 1.0 (MVP Produção)

---

## 🚨 AVISO IMPORTANTE: LIMITAÇÕES E REALIDADE

Para fins de clareza absoluta e transparência:

1.  **NÃO HÁ PAGAMENTOS ONLINE**: O CliniGo é uma plataforma de gestão e agendamento. **NÃO processamos transações financeiras** de pacientes. Todos os pagamentos são feitos diretamente na clínica ou por meios externos combinados entre médico e paciente. Qualquer menção anterior a "receber garantido pelo app" foi removida e não reflete a realidade do sistema.
2.  **IA É APENAS TRIAGEM**: A "AiA Predictive Intelligence" é uma ferramenta de triagem prévia e otimização de agenda. Ela **NÃO realiza diagnósticos médicos**.

---

## 1. Arquitetura de Portais (Separação Total)

O sistema foi arquitetado com uma separação rigorosa entre a área pública (Marketing) e as áreas privadas (Portais de Login). Cada link no menu superior leva a um ambiente distinto.

### 🌐 Site Institucional (Marketing)
*   **URL**: `https://clinigo.app`
*   **Função**: Apresentar o produto, captar leads e direcionar usuários.
*   **Público**: Visitantes, médicos interessados, pacientes buscando informações.

### 🏢 Portal da Clínica (Gestão)
*   **URL**: `https://clinigo.app/clinica`
*   **Função**: **LOGIN ADMINISTRATIVO**.
*   **Funcionalidades**:
    *   Dashboard Financeiro (Contas a Pagar/Receber).
    *   Gestão de Estoque.
    *   Cadastro de Médicos e Funcionários.
    *   Relatórios de Faturamento (DRE).
    *   Emissão de Guias TISS.

### 👨‍⚕️ Portal do Médico (Atendimento)
*   **URL**: `https://clinigo.app/medico`
*   **Função**: **LOGIN PROFISSIONAL**.
*   **Funcionalidades**:
    *   Agenda Médica Inteligente.
    *   Prontuário Eletrônico do Paciente (PEP).
    *   Prescrição Digital.
    *   Histórico de Consultas.

### 👤 Portal do Paciente (Autoatendimento)
*   **URL**: `https://clinigo.app/paciente`
*   **Função**: **LOGIN DE PACIENTE (CPF)**.
*   **Funcionalidades**:
    *   Busca de Especialistas.
    *   Agendamento Online (24/7).
    *   Visualização de Histórico de Consultas passadas.

---

## 2. Matriz de Funcionalidades
O que está ativo e funcional no sistema hoje:

| Módulo | Funcionalidade | Status | Obs |
| :--- | :--- | :--- | :--- |
| **Agendamento** | Agenda Online | ✅ ATIVO | Paciente agenda sozinho. |
| **Agendamento** | Confirmação WhatsApp | ✅ ATIVO | Redireciona para o WhatsApp. |
| **Financeiro** | Fluxo de Caixa | ✅ ATIVO | Gestão interna da clínica. |
| **Financeiro** | **Pagamento In-App** | ❌ INATIVO | **NÃO EXISTE**. |
| **Prontuário** | Registro Clínico | ✅ ATIVO | Anamnese e Evolução. |
| **IA** | Triagem de Sintomas | ✅ ATIVO | Sugere prioridade baseada em queixas. |
| **IA** | **Diagnóstico** | ❌ INATIVO | **NÃO EXISTE** (Risco ético/legal). |
| **Telemedicina**| Link Externo | ✅ ATIVO | Integração via Google Meet/Zoom. |
| **Telemedicina**| Vídeo Nativo | ⚠️ FUTURO | Previsto para v2.0. |

---

## 3. Documentação Técnica dos Caminhos

Todos os arquivos de página foram organizados para refletir essa estrutura:

*   `app/app/page.tsx` -> Landing Page Principal.
*   `app/app/clinica/page.tsx` -> Tela de Login da Clínica.
*   `app/app/medico/page.tsx` -> Tela de Login do Médico.
*   `app/app/paciente/page.tsx` -> Tela de Login do Paciente.
