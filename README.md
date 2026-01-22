# CliniGo

Sistema SaaS multi-tenant para gestão de clínicas médicas.

## Quick Start

```bash
# Clone e instale
git clone https://github.com/seu-usuario/clinigo.git
cd clinigo/app
npm install

# Configure
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# Execute
npm run dev
```

Acesse: http://localhost:3000

## Features

- **Agendamento Online** - Página pública por clínica com anti-overbooking
- **Prontuário Eletrônico** - Editor TipTap com autosave
- **Teleconsulta** - Vídeo HD WebRTC com gravação
- **Check-in QR Code** - Geração e envio automático
- **Financeiro** - Lançamentos, pagamentos, contratos médicos
- **TISS** - Geração de guias e XML para ANS
- **Portal do Paciente** - Histórico e teleconsultas

## Tech Stack

| Frontend | Backend | Infra |
|----------|---------|-------|
| Next.js 16 | Next.js API Routes | Vercel |
| React 19 | Supabase | PostgreSQL |
| TypeScript | Nodemailer | TURN Server |
| TailwindCSS | Mercado Pago | OpenAI |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | ✅ |
| `NEXT_PUBLIC_APP_URL` | App URL | ✅ |
| `SMTP_HOST` | SMTP server | ✅ |
| `SMTP_USER` | SMTP user | ✅ |
| `SMTP_PASSWORD` | SMTP password | ✅ |
| `MERCADOPAGO_ACCESS_TOKEN` | MP token | Plano pago |
| `OPENAI_API_KEY` | OpenAI key | Transcrição |

## Documentation

- [Documentação Completa](./docs/DOCUMENTACAO_OFICIAL_CLINIGO_COMPLETA.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Guia de Implementação](./docs/GUIA_IMPLEMENTACAO_COMPLETO.md)
- [Manual de Usabilidade](./docs/MANUAL_USABILIDADE.md)

## Project Structure

```
app/
├── app/           # Next.js App Router
│   ├── api/       # API endpoints
│   ├── dashboard/ # Admin panel
│   └── (public)/  # Public pages
├── components/    # React components
├── lib/           # Services, hooks, utils
└── types/         # TypeScript types
```

## License

Proprietary - CliniGo © 2026
