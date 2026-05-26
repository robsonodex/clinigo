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

### Módulo: Financeiro → Fechamento Mensal (NOVO)
* **Submódulo:** Fechamento Financeiro Consolidado
* **Arquivos criados:**
  - `app/api/financial/closing/route.ts` (NOVO — API de agregação)
  - `app/dashboard/(clinic)/financeiro/fechamento/page.tsx` (NOVO — Página)
* **Arquivo modificado:**
  - `components/layout/sidebar.tsx` (novo item "Fechamento" no menu Financeiro)
* **Data:** 08 de Maio de 2026
* **Solicitante:** Jeferson — Espaço Incluir
* **O que foi feito:**
  - Criação de módulo completo de **Fechamento Financeiro Mensal** permanente.
  - Seletor de mês/ano com navegação por setas (← →), permitindo consultar qualquer mês passado.
  - **6 cards de resumo:** Receitas, Despesas, Resultado Líquido, Sessões Realizadas, Ticket Médio e Pendências.
  - **Comparativo automático** com mês anterior (variação % em todos os indicadores).
  - **4 tabelas de breakdown:**
    1. Receita por Profissional (nome, sessões, receita, % do total)
    2. Receita por Forma de Pagamento (barras de progresso visuais)
    3. Receitas por Categoria (barras de progresso verdes)
    4. Despesas por Categoria (barras de progresso vermelhas)
  - **Tabela de pendências/vencidos** com status visual (badges Pendente/Vencido).
  - Empty state elegante quando o mês não tem dados.
  - API `/api/financial/closing?month=4&year=2026` consulta `financial_entries` e `appointments`.
* **Caminho de acesso:** Dashboard → Menu Financeiro → Fechamento

### Módulo: Prontuário → Evoluções + Documentos (Isolamento por Terapeuta — SIGILO)
* **Submódulo:** Controle de Acesso e Sigilo Clínico
* **Arquivos modificados:**
  - `components/layout/sidebar.tsx` (menu Documentos restrito)
  - `lib/hooks/use-auth.ts` (exposição de `is_coordinator` no hook `useRole`)
  - `app/api/session-evolutions/route.ts` (filtro por doctor_id)
  - `app/api/documents/route.ts` (filtro por pacientes do terapeuta + bloqueio de upload)
  - **Supabase RLS:** `session_evolutions` (4 policies novas) + `patient_documents` (drop de policy duplicada)
* **Data:** 09 de Maio de 2026
* **Solicitante:** Jeferson — Espaço Incluir
* **O que foi feito:**
  1. **Sidebar:** Botão "Documentos" agora visível apenas para `CLINIC_ADMIN`, `RECEPTIONIST` e DOCTORs coordenadores (`is_coordinator = true`). Terapeutas comuns não veem o menu.
  2. **Evoluções — API:** GET `/api/session-evolutions` agora filtra por `doctor_id` do terapeuta logado quando role é `DOCTOR` e `is_coordinator = false`. Cada terapeuta vê apenas evoluções dos seus próprios pacientes.
  3. **Documentos — API GET:** GET `/api/documents` agora filtra documentos por pacientes vinculados ao terapeuta via tabela `appointments`, quando role é `DOCTOR` e `is_coordinator = false`.
  4. **Documentos — API POST:** Upload bloqueado para DOCTORs não-coordenadores. Apenas ADM, Recepção e coordenadores podem subir documentos.
  5. **RLS Supabase — session_evolutions:** Policy antiga `"Users can access their clinic evolutions"` (acesso total por clínica) foi substituída por 4 policies granulares (`select`, `insert`, `update`, `delete`). DOCTORs não-coordenadores só acessam evoluções onde são o `doctor_id`.
  6. **RLS Supabase — patient_documents:** Policy duplicada `"patient_documents_select_policy"` que dava acesso total a DOCTORs foi removida. As policies `documents_select_by_role`, `documents_insert_by_role`, etc. já faziam o filtro correto.
  7. **Hook useRole:** Adicionado `isCoordinator` ao retorno do hook para uso no sidebar.
* **Impacto:**
  - Terapeutas (DOCTOR, `is_coordinator = false`): veem apenas evoluções e documentos dos **seus** pacientes.
  - Coordenadoras (DOCTOR, `is_coordinator = true`, ex: Nathalia): veem tudo da clínica, incluindo o botão Documentos.
  - CLINIC_ADMIN e RECEPTIONIST: sem alteração — acesso total à clínica.
  - Clínicas novas: `is_coordinator` default é `false`, então o mesmo comportamento se aplica. Para dar acesso a um terapeuta, basta marcar `is_coordinator = true`.
* **Caminho de acesso:** Dashboard → Evoluções (terapeuta vê só as suas) | Dashboard → Documentos (oculto para terapeutas comuns)

### Módulo: Faturamento & Cadastro (Trial / Onboarding)
* **Submódulo:** Cadastro de Clientes Trial (7 dias) / Controle de Bloqueio por Pagamento
* **Arquivos modificados:**
  - `middleware.ts` (Bypass do bloqueio de faturamento para contas em trial e ativadas manualmente)
  - `app/(auth)/pagamento-pendente/page.tsx` (Adicionado botão de Logout para clínicas bloqueadas)
* **Data:** 26 de Maio de 2026
* **O que foi feito:**
  1. **Bypass de Trial no Middleware:** Ajustado o `PAYMENT REQUIRED CHECK` no middleware para pular o redirecionamento de pagamento pendente se a clínica estiver no status `'trial'` (com trial dentro da data de validade) ou no status `'active'` (ativada manualmente pelo administrador Robson/contato@clinigo.app/robsonfenriz@gmail.com).
  2. **Banner de 7 Dias:** Garantida a exibição do `TrialBanner` em tempo real para as contas novas no dashboard do sistema, exibindo de forma elegante os dias restantes até a expiração.
  3. **Botão de Logout em Pagamento Pendente:** Adicionado botão de Logout ("Sair da Conta") na página `/pagamento-pendente` para evitar que usuários ou administradores fiquem presos na tela de bloqueio de faturamento ao tentar alternar de conta.
* **Caminho de acesso:** https://clinigo.app/trial (Cadastro de conta) → Login → Acesso direto ao Dashboard com Banner ativo → Bloqueio automático após 7 dias se não houver pagamento ou liberação do administrador.
