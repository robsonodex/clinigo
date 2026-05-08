# Documentação Técnica V3 - CliniGo

Este documento rastreia as implantações cirúrgicas de UI/UX e Efeito UAU no sistema.

## Histórico de Alterações

### Módulo: Pacientes
* **Submódulo:** Perfil do Paciente / Prontuários
* **Arquivo:** `components/patients/PatientEvolutions.tsx`
* **Função/Componente Alterado:** `PatientEvolutions`
* **Data:** 07 de Maio de 2026
* **O que foi feito:**
  - Substituição da lista de evoluções básica por uma "Linha do Tempo Visual" interativa.
  - Adição de "Dashboard Resumo da Jornada" com 3 cards: Total de Sessões, Início do Tratamento e Última Sessão.
  - Implementação de marcadores visuais (`Timeline Dot`), emblemas de datas relativas (usando `date-fns`) e design em formato de Feed Clínico.
  - Tratamento de Empty States (Jornada em Branco) com ilustrações dedicadas.
  - Melhoria de legibilidade e separação de conteúdo (Queixa vs Evolução Resumida).

### Módulo: Clínica
* **Submódulo:** Controle de Faltas
* **Arquivo:** `app/dashboard/(clinic)/controle-faltas/page.tsx`
* **Função/Componente Alterado:** `ControleFaltasPage`
* **Data:** 07 de Maio de 2026
* **O que foi feito:**
  - Reformulação completa da UI/UX com adoção de Dashboard de métricas (Cards).
  - Implementação de Empty States luxuosos.
  - Adição de Automação de WhatsApp para reposições pendentes.
  - Criação de Templates (Padrão, Flexível, Rigorosa) para regras de falta.

### Módulo: Pacientes → Reembolso
* **Submódulo:** Perfil do Paciente / Aba Reembolso
* **Arquivos:**
  - `components/patients/PatientReimbursement.tsx` (NOVO)
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx` (MODIFICADO - integração da aba)
* **Função/Componente Alterado:** `PatientReimbursement` (novo) + `PatientDetailsPage` (nova aba)
* **Data:** 07 de Maio de 2026
* **O que foi feito:**
  - Criação do componente `PatientReimbursement` para geração de relatório individual por paciente.
  - O gestor acessa Pacientes → clica no paciente → aba "Reembolso".
  - Seleciona o mês, o profissional responsável e o valor por sessão.
  - O sistema busca todas as sessões (COMPLETED/CONFIRMED) daquele paciente, naquele mês, com aquele profissional.
  - Gera PDF profissional contendo: dados da clínica, dados do profissional (CRM/CRP), dados do paciente (CPF), tabela detalhada de sessões com datas e valores, total pago, e linha de assinatura.
  - Formato aceito por convênios e planos de saúde para pedidos de reembolso.
* **Caminho de acesso:** Dashboard → Pacientes → [Selecionar Paciente] → Aba "Reembolso" → Botão "Gerar Relatório"

### Módulo: Pacientes → Reembolso (Controle de Acesso)
* **Submódulo:** Perfil do Paciente / Aba Reembolso
* **Arquivo:** `app/dashboard/(clinic)/pacientes/[id]/page.tsx`
* **Função/Componente Alterado:** `PatientDetailsPage` — TabsTrigger e TabsContent de reembolso
* **Data:** 08 de Maio de 2026
* **Solicitante:** Jeferson — Espaço Incluir
* **O que foi feito:**
  - Aba "Reembolso" agora é **oculta para terapeutas** (role = `DOCTOR`).
  - Apenas `CLINIC_ADMIN` e roles administrativas visualizam a aba e seu conteúdo.
  - A seção "Financeiro" no sidebar já estava restrita a `CLINIC_ADMIN` — nenhuma alteração necessária.
* **Caminho de acesso:** Dashboard → Pacientes → [Paciente] → Aba "Reembolso" (visível apenas para Admin)

### Módulo: Prontuário → Evoluções (Controle de Profissional)
* **Submódulo:** Evoluções por Sessão / Seletor de Profissional
* **Arquivo:** `app/dashboard/(clinic)/evolucoes/page.tsx`
* **Função/Componente Alterado:** `SessionEvolutionsPage` — Select de Profissional + estados `currentUserRole` / `currentDoctorId`
* **Data:** 08 de Maio de 2026
* **Solicitante:** Jeferson — Espaço Incluir
* **O que foi feito:**
  - Quando o usuário logado é terapeuta (role = `DOCTOR`), o campo "Profissional" é **auto-preenchido com o nome dele** e **bloqueado para edição**.
  - O sistema busca o `user_id` do usuário logado via `/api/auth/me`, cruza com a tabela `doctors` e identifica o `doctor_id` correspondente.
  - O dropdown só exibe o próprio nome do terapeuta e fica `disabled`.
  - Para `CLINIC_ADMIN` e `RECEPTIONIST`, o comportamento permanece inalterado (pode selecionar qualquer profissional).
  - Adicionado helper `getResetForm()` que preserva o `doctor_id` do terapeuta ao resetar o formulário.
* **Caminho de acesso:** Dashboard → Evoluções → Nova Evolução → Campo "Profissional" (auto-preenchido e travado para terapeutas)
