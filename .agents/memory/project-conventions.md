---
type: project
created: 2026-05-25
updated: 2026-07-12
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.
- Copy on the website, docs, FAQ, README, and marketing should describe AG Kit as a toolkit for Gemini CLI / Antigravity-style agent setups.

## Padrão SaaS Médico Corporativo Premium Internacional
- **Zero Emojis**: Proibição total de emojis em UI, textos, notificações e respostas de IA.
- **Iconografia Sóbria**: Exclusivamente Lucide Icons neutros. Proibido ícones infantis, mágicos ou festivos (Sparkles, PartyPopper).
- **Design & Acabamento**: Padrão hospitalar e clínico internacional (paletas sóbrias Slate/Teal/Emerald, sem gradientes arco-íris ou neon).
- **Proporções de Co-Branding**: Logotipos com travas rígidas de contenção (26px de altura, sem distorções de aspect ratio).
- **Tom Formal**: Comunicação técnica, sóbria, formal e elegante.

## Blindagem de Fluid Active CPU na Vercel e Rotas Públicas (Incidente 25/11/2026 — Seção 15-C)
- **Proibido catch-all na raiz (`app/[slug]/page.tsx`)**: nunca recriar Página Pública nem qualquer rota dinâmica de nível 1 que exponha SSR/Supabase a scanners (`.php`, `.env`, `.sql`, `/wp-*`, `/nuclei.svg`).
- **Escudo de borda obrigatório**: manter `isBlockedScannerProbe` no topo do `middleware.ts` retornando HTTP 404 cacheável (24h) antes de qualquer cliente Supabase, preservando `/.well-known/`.
- **`config.matcher` enxuto**: manter páginas 100% públicas/estáticas fora do `middleware.ts` sem jamais excluir `/`, `/dashboard/*`, `/api/*` privados, `/system-master-hub/*` ou `/paciente/*`.
- **Zero default inline `[]`/`{}` em props React** usadas em `useEffect`/`useCallback` (usar constante fora do componente como `EMPTY_SESSIONS`) e zero polling cliente em `/api/*` da Vercel.
- **Produção Vercel Pro**: nunca rodar SaaS multi-clínica no plano Hobby e nunca ativar "Pause production deployments" no Spend Management.
