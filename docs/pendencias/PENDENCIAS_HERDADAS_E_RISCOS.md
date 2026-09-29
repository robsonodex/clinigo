# Relatório de Pendências Herdadas e Análise de Riscos Técnicos

> Documento de rastreabilidade de dívida técnica herdada e riscos de arquitetura.
> Data: 29/09/2026

---

## 1. `npm run lint` (`next lint`) no Next.js 16

### Diagnóstico do Problema
Ao executar `npm run lint` (`next lint`), o comando falha com erro de execução porque o Next.js 16 descontinuou o wrapper `next lint` nativo em favor do ESLint 9 com Flat Config (`eslint.config.mjs`).

### Regra de Não-Interferência
O script `lint` no `package.json` foi preservado para evitar quebras em pipelines legadas de CI/CD que possam depender da sintaxe original.

### Solução Técnica Homologada
Para validação de código e análise estática no projeto:
- **Para o módulo TISS e Convênios:** utilize `npm run lint:tiss` (que executa o `eslint` com a Flat Config diretamente nas pastas afetadas).
- **Para todo o repositório:** execute diretamente `npx eslint . --max-warnings 0`.

---

## 2. Aviso de Depreciação de Middleware no Next.js 16 ("middleware deprecated, use proxy")

### Diagnóstico do Problema
O Next.js 16 emite avisos de evolução de convenção sobre o uso do arquivo `middleware.ts` em favor de padrões baseados em edge proxy / route handlers.

### Avaliação de Risco Futuro
- **Risco:** Quando o framework avançar para versões futuras sem suporte ao `middleware.ts`, as regras de bloqueio de rotas precisarão ser migradas.
- **Medida de Mitigação Implementada:** O sistema foi integralmente protegido com **Defesa em Profundidade** (`enforceTissAdministrativeGuard` em 100% dos 57 handlers de API sob `/api/tiss/**` e `/api/insurance/**`).
- **Recomendação:** Ao realizar qualquer migração futura de infraestrutura de roteamento no Next.js, manter a suíte de testes arquiteturais e funcionais de RBAC (`__tests__/security/tiss-architecture-guard.test.ts` e `__tests__/security/tiss-doctor-block.test.ts`) como critério obrigatório de aprovação (gatekeeper).

---

## 3. Estado do Arquivo `types/supabase.generated.ts`

### Diagnóstico do Problema
O arquivo `types/supabase.generated.ts` encontra-se atualmente em branco no repositório.

### Dependência Externa (Ação do Dono do Sistema)
O assistente de desenvolvimento opera em ambiente local isolado (sem credenciais de conexão ao banco remoto de produção). A geração das tipagens oficiais depende da aplicação das migrations no ambiente de Staging.

### Comando para o Dono Executar:
Após aplicar as migrações no projeto de Staging do Supabase:
```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID_STAGING > types/supabase.generated.ts
```
Substitua o arquivo com o conteúdo gerado para que os componentes e serviços utilizem o auto-complete estrito das tabelas novas (`tuss_procedures`, `health_insurance_price_tables`, `tiss_glosa_reasons_ans`, `tiss_return_imports`).
