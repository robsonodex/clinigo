# Ambiente Demo - CliniGo v3.2.0

## 📋 Visão Geral

Este diretório contém todos os scripts e configurações necessários para criar e gerenciar o ambiente demo isolado do CliniGo.

## ⚠️ IMPORTANTE

> **NUNCA execute os scripts de seed em produção!**
> 
> O ambiente demo usa um schema separado (`demo`) para isolamento total dos dados de produção.

---

## 🚀 Comandos

### Criar Dados Demo

```bash
cd demo-system
npx tsx scripts/seed-demo-data.ts
```

### Limpar Dados Demo

```bash
cd demo-system
npx tsx scripts/cleanup-demo.ts
```

### Verificar Dados Demo

```bash
cd demo-system
npx tsx scripts/verify-demo-data.ts
```

---

## 🔐 Credenciais

Todas as credenciais estão documentadas em `DEMO_CREDENTIALS.md`.

**Senha padrão para todos os usuários demo:** `Demo@2026!`

### Acesso Rápido

| Role | Email |
|------|-------|
| Super Admin | superadmin@demo.clinigo.internal |
| Admin Clínica | admin@demo.clinigo.internal |
| Médico | ana.cardoso@demo.clinigo.internal |

---

## 📁 Estrutura

```
demo-system/
├── .env.demo                    # Variáveis de ambiente
├── README_DEMO.md               # Este arquivo
├── DEMO_CREDENTIALS.md          # Lista completa de credenciais
├── migrations/
│   ├── 001_create_demo_schema.sql
│   └── 002_demo_rls_policies.sql
└── scripts/
    ├── seed-demo-data.ts        # Script principal de população
    ├── cleanup-demo.ts          # Script de limpeza
    ├── verify-demo-data.ts      # Verificação dos dados
    ├── data/
    │   ├── demo-users.ts        # Dados dos usuários
    │   ├── demo-patients.ts     # Dados dos pacientes
    │   ├── demo-appointments.ts # Dados dos agendamentos
    │   ├── demo-medical-records.ts
    │   ├── demo-financial.ts
    │   └── demo-tiss.ts
    └── lib/
        └── supabase-demo.ts     # Cliente Supabase para demo
```

---

## 🎬 Roteiro de Gravação

1. **Login** - admin@demo.clinigo.internal
2. **Dashboard** - Visão geral com métricas
3. **Agendamentos** - Calendário com consultas
4. **Check-in** - QR Code de paciente
5. **Painel Recepção** - Real-time
6. **Atendimento** - Prontuário
7. **Teleconsulta** - Chamada de vídeo
8. **TISS** - Autorização de procedimento
9. **Financeiro** - Receitas/despesas
10. **Relatórios** - Exportação
11. **Configurações** - Personalização

---

## 🔄 Lifecycle Automático

O bucket `demo-files` no Supabase Storage está configurado para deletar arquivos automaticamente após 7 dias.

---

## 🛡️ Isolamento

- Schema PostgreSQL separado: `demo`
- Todos os registros têm flag `is_demo_data = true`
- RLS policies garantem que dados demo não aparecem em contas reais
- Emails com sufixo `@demo.clinigo.internal`
