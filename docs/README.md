# CliniGo - Documentação Técnica Completa

> **Versão Oficial:** 5.1.0  
> **Última Atualização:** Outubro de 2026  
> **Ambiente Oficial de Produção:** `https://clinigo.app`  
> **Padrão de Qualidade:** SaaS Médico Corporativo Internacional (Zero Emojis, Conformidade LGPD e ANS)

---

## 1. Visão Geral do Sistema

O **CliniGo** é uma plataforma multitenant de alto desempenho para gestão completa de clínicas médicas, centros de reabilitação e espaços terapêuticos multidisciplinares. Construída sobre uma arquitetura moderna e segura, a plataforma atende desde o profissional solo até grandes redes de atendimento integrado.

### Principais Módulos em Produção:
- **Agendamento Multissuperfície:** Agenda interativa por profissional, encaixes, grade de horários livres, controle anti-conflito e cancelamento atômico.
- **Prontuário Eletrônico (PEP):** Registro clínico, histórico temporal, exames, laudos e evoluções de sessão com certificação digital ICP-Brasil padrão A1.
- **Armazenamento Seguro de Prontuários (Cloudflare R2):** Arquitetura com URLs pré-assinadas de 600 segundos e zero custo de egress, com expurgo do Supabase Storage.
- **Faturamento TISS Industrial:** Padrão ANS completo, catálogo TUSS, emissão com numeração sequencial atômica (`generate_tiss_guide_number`), validação de esquemas XML, conciliação de retornos com estorno transacional e gestão de glosas/recursos.
- **Gestão Corporativa de Projetos e Tarefas:** Colunas Kanban (TODO, IN_PROGRESS, DONE), checklists, farol temporal de SLA e isolamento de visibilidade por perfil.
- **Licenciamento por Assentos (Seat Licensing):** Modelo corporativo transparente com cotação HMAC-SHA256, prova de aceite probatória imutável em `seat_billing_events` e modo enforce ativo em produção.
- **Telemedicina Integrada:** Salas criptografadas WebRTC (Daily.co e LiveKit) com resiliência contra oscilações de conexão Realtime.
- **Comunicação e WhatsApp:** Disparos automatizados de lembretes via Baileys, com otimização no `pg_cron` via gate condicional e índice parcial para zerar logs ociosos.
- **Super Admin (Master Hub):** Painel do proprietário com controle de features por clínica, governança de dados, exclusão segura de tenants e tabela global `platform_settings`.

---

## 2. Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Next.js | 16.1.1 | Framework React com arquitetura App Router e Server Actions |
| React | 19.0.0 | Biblioteca de interface do usuário |
| TypeScript | 5.x | Tipagem estática rigorosa em 100% do código |
| Tailwind CSS | 4.x | Estilização utilitária de alta performance |
| Radix UI / shadcn | Última | Componentes de acessibilidade médica padrão WAI-ARIA |
| Lucide React | Última | Iconografia técnica sóbria e corporativa |

### Backend e Infraestrutura
| Tecnologia | Serviço | Propósito |
|------------|---------|-----------|
| Next.js API Routes | Node.js | Endpoints RESTful com validação via Zod |
| Supabase | PostgreSQL 15+ | Banco de dados relacional com Row Level Security (RLS) |
| Cloudflare R2 | Storage S3-compatível | Armazenamento de prontuários, laudos e documentos clínicos |
| Vercel | Edge Network | Hospedagem, SSR e execução de rotas (Projeto `clinigo-saas`) |
| LiveKit / Daily.co | WebRTC | Infraestrutura de streaming para teleconsultas médicas |
| Asaas / Mercado Pago | Gateway de Pagamentos | Assinaturas corporativas, PIX, Boleto e Cartão |
| jose | JWT Library | Validação local de identidade e tokens sem round-trip HTTP |

---

## 3. Estrutura Arquitetural do Repositório

```
clinigo/
├── app/
│   ├── (auth)/                 # Telas de login, recuperação e ativação
│   ├── (patient)/              # Portal exclusivo de pacientes (autenticação CPF)
│   ├── api/                    # 500+ rotas de API protegidas com RBAC
│   ├── dashboard/              # Painel operacional da clínica (30+ módulos)
│   ├── system-master-hub/      # Painel exclusivo de governança (Super Admin)
│   ├── totem/                  # Interface de autoatendimento para check-in
│   ├── painel-tv/              # Painel de chamada visual de consultórios
│   └── video/                  # Interface de teleconsulta WebRTC
├── components/                 # Componentes de interface modularizados
│   ├── billing/                # Modais de cotação de assentos e banners
│   ├── tasks/                  # Kanban board, cards e farol de prazos
│   ├── tiss/                   # Formulários de guias, lotes e recursos de glosa
│   └── ui/                     # Primitivos shadcn/ui customizados
├── lib/
│   ├── auth/                   # Helpers de autenticação local jose e RBAC
│   ├── services/               # Lógica de negócio (TISS, Seat Licensing, R2, Mail)
│   └── validations/            # Schemas de validação Zod
├── supabase/
│   └── migrations/             # Histórico sequencial e idempotente de migrações SQL
└── docs/                       # Documentação técnica e operacional completa
```

---

## 4. Matriz de Perfis de Acesso (RBAC)

O sistema opera com 8 papéis nativos com isolamento no banco e na camada de API:

1. `SUPER_ADMIN`: Controle total da plataforma, provisionamento de clínicas e feature flags globais.
2. `CLINIC_ADMIN`: Gestor da clínica com acesso a financeiro, equipe, agenda, contratos e configurações.
3. `FINANCIAL`: Gestão financeira, faturamento TISS, fluxo de caixa e conciliação bancária.
4. `DOCTOR`: Profissional de saúde assistencial (médico, psicólogo, terapeuta) com acesso à própria agenda e prontuários vinculados.
5. `RECEPTIONIST`: Operação de recepção, check-in, cadastro de pacientes e triagem.
6. `NURSE`: Suporte assistencial e triagem pré-consulta.
7. `PATIENT`: Beneficiário com acesso ao portal para auto-agendamento e visualização de prescrições.
8. `READONLY`: Perfil exclusivo de visualização (auditoria, conformidade LGPD e conselhos fiscais), com bloqueio impeditivo a qualquer mutação de dados (403 Forbidden).

---

## 5. Instruções de Desenvolvimento Local

1. Instalar dependências com tolerância de pares legados:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Configurar o arquivo `.env.local` baseado no `.env.example`.
3. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Executar verificação de integridade de código:
   ```bash
   npm run build
   ```
