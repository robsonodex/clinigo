# CliniGo Frontend Documentation

## Visão Geral

O frontend do CliniGo foi desenvolvido utilizando **Next.js 15 App Router** e **React 19**, focado em performance, acessibilidade e experiência do usuário (UX). A aplicação permite que clínicas gerenciem seus médicos e agendamentos, médicos realizem teleconsultas, e pacientes agendem horários de forma rápida e intuitiva.

## Stack Tecnológico

*   **Framework:** Next.js 15.1.0 (App Router)
*   **Linguagem:** TypeScript 5.7+
*   **Estilização:** TailwindCSS 3.4+ com variáveis CSS para temas
*   **Componentes:** shadcn/ui (Radix UI + Tailwind)
*   **Gerenciamento de Estado/Cache:** TanStack Query v5
*   **Formulários:** React Hook Form + Zod
*   **Ícones:** Lucide React
*   **Datas:** date-fns

## Estrutura de Pastas

```
app/
├── app/                  # Rotas da aplicação (Next.js App Router)
│   ├── (auth)/           # Rotas de autenticação (login, rec. senha)
│   ├── (public)/         # Rotas públicas (agendamento paciente)
│   ├── dashboard/        # Área restrita
│   │   ├── (admin)/      # Painel Super Admin (clínicas, planos)
│   │   ├── (clinic)/     # Painel Admin Clínica (médicos, horários)
│   │   └── (doctor)/     # Painel Médico (agenda, consultas)
│   ├── api/              # Rotas de API (Backend - ver README_BACKEND.md)
│   ├── globals.css       # Estilos globais
│   └── layout.tsx        # Layout raiz
├── components/           # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui - Button, Input, etc.)
│   ├── layout/           # Componentes de layout (Sidebar, Header)
│   ├── forms/            # Formulários complexos (DoctorForm, PatientForm)
│   ├── calendar/         # Componentes de calendário e horários
│   └── doctors/          # Componentes específicos de médicos
├── lib/                  # Utilitários e configurações
│   ├── hooks/            # Custom Hooks (useAuth, useAppointments...)
│   ├── supabase/         # Clientes Supabase (client, server, middleware)
│   ├── utils.ts          # Funções auxiliares (cn, formatCurrency...)
│   ├── api-client.ts     # Cliente API tipado para o frontend
│   └── validations.ts    # Schemas de validação Zod
└── types/                # Definições de tipos globais
```

## Funcionalidades Principais

### 1. Área Pública (Paciente)
*   **Landing da Clínica (`/[clinic_slug]`):** Página inicial da clínica.
*   **Triagem AiA Inteligente:** Fluxo de triagem com inteligência artificial para classificação de risco pré-consulta.
*   **Agendamento (`/[clinic_slug]/agendar`):**
    *   Seleção de médico com filtro por especialidade.
    *   Seleção de data e horário (Agenda disponível em tempo real).
    *   Formulário do paciente com validação de CPF.
    *   Integração com Mercado Pago.
    *   Páginas de status (Sucesso, Pendente, Falha).

### 2. Dashboard da Clínica
*   **Gestão de Médicos:** Cadastro, edição e listagem. (Admins visualizam todos os registros por padrão, incluindo pendentes).
*   **Configuração de Horários:** Definição de disponibilidade semanal por médico.
*   **Agenda Global:** Visualização de todos os agendamentos da clínica.
*   **Pagamentos:** Relatório de receita e histórico de transações (Dados persistentes do banco).
*   **Configurações:** Dados da clínica (nome, contato, cores).

### 3. Área do Médico
*   **Minha Agenda:** Visualização focada nos atendimentos do médico.
*   **Sala de Consulta:**
    *   Vídeo chamada integrada (Google Meet).
    *   Prontuário eletrônico (Anotações, Queixa, Histórico).
    *   Ações para iniciar e finalizar atendimento.

## Como Adicionar Novos Componentes

Utilizamos `shadcn/ui`. Para adicionar um novo componente base:

```bash
npx shadcn@latest add [nome-do-componente]
# Exemplo: npx shadcn@latest add accordion
```

## Padronização e Boas Práticas

*   **Server vs Client Components:** Use `'use client'` apenas quando necessário (interatividade, hooks). Prefira Server Components para fetch de dados inicial quando possível (embora usemos TanStack Query no client para maior dinamicidade no dashboard).
*   **Validação:** Todos os formulários devem usar `zod` e `react-hook-form`. Schemas globais/antigos ficam em `lib/validations.ts`, mas novos schemas específicos por domínio estão sendo organizados na pasta `lib/validations/` (ex: `lib/validations/appointment.ts`).
*   **Tipagem:** Use typescript estrito. Evite `any`. Tipos de API request/response estão em `lib/api-client.ts`.
*   **Data Fetching:** Use os hooks customizados em `lib/hooks/`. Ex: `useAppointments()`. Eles gerenciam cache e refetch automático.

## Executando o Projeto

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Configure as variáveis de ambiente em `.env.local`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

## Deploy

O projeto está pronto para deploy na Vercel. Certifique-se de configurar as variáveis de ambiente no painel da Vercel.
