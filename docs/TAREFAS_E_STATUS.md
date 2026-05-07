# CliniGo - Status das Funcionalidades

> **Atualizado:** 07/05/2026
> **Produção:** https://clinigo.app

---

## 🆕 Últimas Alterações — 07/05/2026 (Espaço Incluir)

### 📝 Módulo: Evoluções por Sessão

### Implementado (07/05/2026 - Sprint Evoluções Seguras & ICP-Brasil)
- [x] **Bloqueio de Edição de Evoluções:** Implementada trava via API (`api/session-evolutions/[id]/route.ts`) e no Frontend para impedir edição de evoluções finalizadas.
- [x] **Assinatura Digital ICP-Brasil nas Evoluções:**
  - O sistema já contava com a infraestrutura para Certificados Digitais ICP-Brasil para Prontuários (Atestados, Laudos, Receituários).
  - Criado o novo endpoint `api/session-evolutions/sign/route.ts` para processar assinaturas especificamente para **Evoluções**.
  - O componente `SignDocumentModal.tsx` foi atualizado para ser reaproveitável, permitindo o uso nas Evoluções.
  - A interface `evolucoes/page.tsx` agora exige o certificado ICP-Brasil ao clicar em "Finalizar e Assinar", gerando o PDF com a assinatura e garantindo a **validade legal** da documentação do paciente.
- [ ] **Template Personalizado (Pendente):** Aguardando envio do template (Nathalia) para inserir nas opções de evoluções (junto a SOAP, CIF, etc). → [id]/route.ts → bloqueio 403 se finalized_by ≠ user.id
Evoluções → route.ts → POST grava created_by
Auth → api/auth/me/route.ts → novo endpoint de usuário logado
Banco → session_evolutions → colunas: finalized_by, finalized_at, created_by

---

## ✅ Funcionalidades Completas (Funcionando)

### 🔐 Autenticação
| Funcionalidade | Descrição | Tipo de Usuário |
|----------------|-----------|-----------------|
| Cadastro de Clínica | Formulário completo com plano | Clínica |
| Login por Portal | 3 portais separados (/clinica, /medico, /paciente) | Todos |
| Recuperação de Senha | Token por e-mail (1h validade) | Todos |
| Ativação de Conta | Médicos convidados e pacientes | Médico, Paciente |
| Logout | - | Todos |
| Sessões Ativas | Listar e encerrar sessões | Todos |

### 💳 Pagamentos e Assinaturas
| Funcionalidade | Descrição |
|----------------|-----------|
| Checkout Mercado Pago | Redireciona para MP para pagamento |
| Webhook Automático | Ativa clínica após pagamento |
| Envio de Credenciais | 2 e-mails automáticos |
| Planos (5 tiers) | Starter, Básico, Profissional, Enterprise, Network |
| Desconto Anual | 2 meses grátis no plano anual |

### 📅 Agendamento
| Funcionalidade | Descrição |
|----------------|-----------|
| Agenda do Médico | Visualização diária/semanal |
| Slots Disponíveis | Cálculo automático baseado em horários |
| Agendamento Online | Paciente agenda pelo site público |
| Encaixe | Agendamento walk-in |
| Cancelamento | Com motivo e notificação |
| Confirmação | Manual ou automática |

### 👨‍⚕️ Gestão de Médicos
| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD Médicos | Criar, editar, excluir |
| Convite por E-mail | Token de ativação (7 dias) |
| Horários | Configuração por dia da semana |
| Exceções | Férias, feriados, etc |
| Convênios por Médico | Associar convênios |
| Especialidades | Múltiplas especialidades |

### 🧑‍🤝‍🧑 Gestão de Pacientes
| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD Pacientes | Completo |
| Auto-cadastro | Paciente se cadastra pelo portal |
| Login por CPF | Portal do paciente |
| Histórico | Consultas anteriores |
| Documentos | Upload de exames |

### 📋 Prontuário Eletrônico
| Funcionalidade | Descrição |
|----------------|-----------|
| Consulta | Registro completo |
| Anamnese | Queixa, história, exame físico |
| Diagnóstico | CID-10 |
| Prescrição | Medicamentos com posologia |
| Arquivos | Upload de exames/laudos |
| Histórico | Timeline por paciente |

### 💰 Financeiro
| Funcionalidade | Descrição |
|----------------|-----------|
| Entradas/Saídas | Lançamentos manuais |
| Resumo | Dashboard com totais |
| Por Período | Filtro por datas |
| Métodos | PIX, Cartão, Dinheiro |
| Relatórios | Básicos |

### 📦 Estoque
| Funcionalidade | Descrição |
|----------------|-----------|
| Produtos | CRUD completo |
| Movimentação | Entrada/saída |
| Estoque Mínimo | Alertas |
| Categorias | Organização |

### 🏦 TISS
| Funcionalidade | Descrição |
|----------------|-----------|
| Guias | SP/SADT, Consulta |
| Status | Rascunho, Enviada, Aprovada, Glosada |
| Relatórios | Por convênio |

### 📊 CRM
| Funcionalidade | Descrição |
|----------------|-----------|
| Automações | Lembretes de retorno |
| Campanhas | E-mail marketing |
| Anotações | Por paciente |

### 🎥 Telemedicina
| Funcionalidade | Descrição |
|----------------|-----------|
| Daily.co | Vídeo HD integrado (Profissional+) |
| Google Meet | Link externo (Básico) |
| Gravação | Planos Enterprise+ |

### 👑 Super Admin
| Funcionalidade | Descrição |
|----------------|-----------|
| Dashboard | Estatísticas gerais |
| Clínicas | Listar todas |
| Aprovação | Aprovar/rejeitar clínicas |
| Receita | Relatório financeiro |

---

## ⚠️ Funcionalidades que Requerem Configuração Externa

| Funcionalidade | O que precisa | Status |
|----------------|---------------|--------|
| **E-mails** | Configurar SMTP no `.env` | Pronto (vars não setadas) |
| **Mercado Pago** | ACCESS_TOKEN e WEBHOOK | Pronto (vars não setadas) |
| **WhatsApp** | Conta Business API + Provedor | Código pronto, sem conta |
| **Daily.co** | API Key (telemedicina HD) | Código pronto, sem chave |

### Como configurar:

**SMTP (Gmail):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=senha-de-app-16-digitos
```

**Mercado Pago:**
1. Criar app em mercadopago.com.br/developers
2. Copiar Access Token
3. Configurar webhook URL

---

## ❌ Funcionalidades NÃO Implementadas

| Funcionalidade | Motivo |
|----------------|--------|
| App Mobile Nativo | Fora do escopo (existe PWA) |
| Integração Laboratórios | Não há API padronizada |
| BI Avançado | Placeholder, precisa desenvolvimento |
| Pagamento de Consultas | Clínicas cuidam externamente |
| Marketplace entre Clínicas | Não solicitado |
| Multi-idioma | Apenas PT-BR |

---

## 🔄 Funcionalidades Parciais

| Funcionalidade | Status | Pendência |
|----------------|--------|-----------|
| MFA (2FA) | 🟡 Código existe | Falta UI completa |
| Relatórios Avançados | 🟡 Básicos funcionam | Gráficos limitados |
| Notificações Push | 🟡 Infraestrutura existe | Falta PWA manifest |

---

## 📊 Métricas do Sistema

| Métrica | Valor |
|---------|-------|
| Rotas API | 108 |
| Páginas Frontend | ~60 |
| Tabelas no BD | ~25 |
| Componentes UI | 100+ |
| Linhas de Código | ~50.000 |

---

## 🚀 Roadmap Sugerido

### Curto Prazo (1-2 semanas)
- [ ] Configurar variáveis de ambiente em produção
- [ ] Testar fluxo completo de pagamento
- [ ] Configurar WhatsApp Business

### Médio Prazo (1-2 meses)
- [ ] App mobile React Native
- [ ] Relatórios BI avançados
- [ ] Integração com mais convênios

### Longo Prazo (3-6 meses)
- [ ] Marketplace de especialistas

- [ ] Expansão internacional
