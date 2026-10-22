# CliniGo - Matriz de Status e Entrega de Funcionalidades

> **Última Atualização:** 18 de Outubro de 2026  
> **Ambiente Oficial:** Produção (`https://clinigo.app`)  
> **Status Geral do Sistema:** Estável e Homologado (Build e Testes Aprovados)  
> **Padrão de Qualidade:** SaaS Médico Corporativo Internacional (Zero Emojis)

---

## 1. Módulos Estratégicos e Status Operacional

| Módulo | Componentes Principais | Status |
|--------|------------------------|--------|
| **Faturamento TISS Industrial** | Emissão de guias SP/SADT e Consulta com numeração atômica anti-colisão sob lock transacional, catálogo TUSS, validação estrutural e XSD, lotes XML versionados, gestão de glosas, recursos formais e estorno transacional de retornos. | Concluído e Homologado em Produção |
| **Licenciamento por Assentos** | Modelo corporativo transparente (R$ 49,90/assento extra), cotações assinadas com HMAC-SHA256, tabela probatória imutável `seat_billing_events`, idempotência, modo `SEAT_BILLING_MODE=enforce` e modal transparente no limite + 1. | Concluído e Ativo em Produção |
| **Gestão de Projetos e Tarefas** | Kanban corporativo (TODO, IN_PROGRESS, DONE), checklists, farol temporal de SLA (No prazo, Vence hoje, Atrasado), filtros avançados e isolamento estrito de visibilidade (terapeuta vê suas tarefas; admin vê toda a clínica). | Concluído e Ativo em Produção |
| **Perfil READONLY (Apenas Leitura)** | Perfil para auditoria, conformidade LGPD e conselhos fiscais com leitura ampla e bloqueio total de operações de mutação (POST, PUT, PATCH, DELETE retornam 403 Forbidden). | Concluído e Ativo em Produção |
| **Armazenamento Seguro (Cloudflare R2)** | Migração integral do Supabase Storage para Cloudflare R2 com protocolo canônico `r2://`, zero custo de egress e geração de Presigned URLs de 600 segundos para visualização segura de exames e laudos. | Concluído e Ativo em Produção |
| **Otimização de Borda e Cache JWT** | Validação offline de tokens via biblioteca `jose`, eliminação de loops e memory leaks decorrentes de `getUser` síncrono, cache de 60s no middleware e gate condicional no `pg_cron` com índice parcial para mensageria WhatsApp. | Concluído e Ativo em Produção |
| **Telemedicina WebRTC** | Salas criptografadas via LiveKit/Daily.co com resiliência de canal Realtime, eliminando loops de reconexão e tela piscando. | Concluído e Ativo em Produção |
| **Agendamento e Grade Multissuperfície** | Liberação imediata de slots para agendamentos cancelados, série recorrente, bloqueios sem restrições arbitrárias, encaixes e visualização por dia, semana e mês. | Concluído e Ativo em Produção |
| **Prontuário Eletrônico (PEP)** | Anamnese, prescrição digital, histórico temporal, exames e evoluções de sessão com assinatura digital padrão ICP-Brasil (Certificado A1). | Concluído e Ativo em Produção |
| **Gestão Financeira e Repasse** | Livro caixa, DRE, conciliação, apuração de repasse médico por produção ou recebimento, descontos de glosa configuráveis e tabela de repasse customizada por paciente (`doctor_patient_rates`). | Concluído e Ativo em Produção |
| **Recepção e Check-in** | Painel operacional de recepção, totem de autoatendimento, chamada no painel de TV e check-in presencial via QR Code e biometria facial. | Concluído e Ativo em Produção |
| **Super Admin (Master Hub)** | Gestão de tenants, ativação de features premium por clínica, impersonação segura para suporte técnico e tabela `platform_settings` para modo de manutenção global. | Concluído e Ativo em Produção |

---

## 2. Indicadores de Qualidade e Governança

- **Suíte de Testes Automatizados:** Mais de 600 testes unitários e de integração aprovados cobrindo isolamento RBAC, cálculo matemático de repasse médico, concorrência de numeração TISS e licenciamento por assento.
- **Análise Estática e Linter:** Zero erros de tipagem estrita no TypeScript e conformidade com as regras de ESLint Flat Config no Next.js 16.
- **Segurança de Dados e LGPD:** 100% das tabelas operacionais protegidas por Row Level Security (RLS) no PostgreSQL, garantindo isolamento absoluto entre clínicas parceiras.
