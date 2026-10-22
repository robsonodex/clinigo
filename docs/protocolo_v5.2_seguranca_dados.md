## 🔐 REGRA DE SEGURANÇA DE DADOS E LGPD — v5.2 (ABSOLUTA E INVIOLÁVEL)

> ⛔ **Esta regra se aplica a 100% das tarefas que tocam dado de paciente, terapeuta, clínica ou qualquer informação pessoal.**
> Nasceu de achados reais identificados em auditoria do `DOCUMENTACAO_TECNICA_V3.md` — não é regra teórica, é prevenção de recorrência.

---

### 🚫 5.2.1 — Proibição de PII Hardcoded em Lógica de Acesso

> ⛔ **Nunca escreva nome, CPF, telefone, e-mail ou qualquer identificador pessoal real dentro de uma condicional de código (`if`, `.includes()`, `case`, etc.) para controlar acesso, sigilo ou herança de dados.**

| Nunca faça | Faça no lugar | Motivo |
|---|---|---|
| `if (nomeUsuario === 'Fulana de Tal')` para liberar exceção de acesso | Criar registro numa tabela `access_exceptions` (`user_id`, `grants_access_to_id`, `motivo`, `criado_por`) | PII em código versionado no Git é violação de LGPD; exceção fica invisível fora do commit |
| Lógica de "herda dados de profissional anterior" cravada por nome no código | Campo `inherited_from_user_id` na tabela do profissional, resolvido via RLS/join | Quando o profissional sai ou entra substituto, é update de dado — não deploy de código |
| Deixar nome real de paciente/profissional em comentário, log ou script de debug | Usar `id` (UUID) em qualquer log, comentário ou script | Nome em log/console.log é PII exposta em qualquer ferramenta de observabilidade |

**Caso real detectado:** changelog de 14/07/2026 (módulo Prontuário Clínico → `session-evolutions`) — lógica de herança de agenda checando nome completo de profissional em cláusula condicional na API. Corrigir para tabela de exceções na próxima revisão desse módulo.

---

### 🔓 5.2.2 — Regra de Bypass de RLS / Service Role

> ⛔ **Todo uso de `createServiceRoleClient()` ou de `SUPABASE_SERVICE_ROLE_KEY` é considerado um evento de risco máximo e exige tratamento especial — nunca é "só mais uma correção".**

Sempre que uma tarefa exigir bypass de RLS (rotas públicas/anônimas, ex: marketplace de auto-agendamento):

1. **Declarar explicitamente** no Relatório Final: `⚠️ BYPASS DE RLS APLICADO`.
2. Preencher a tabela abaixo no relatório:

| Tabela afetada | Motivo do bypass | Filtro manual aplicado | Teste de isolamento escrito? |
|---|---|---|---|
| ex: `doctors`, `users` | Visitante anônimo precisa listar médicos do marketplace | `clinic_id = X` aplicado manualmente na query | Sim/Não |

3. **Obrigatório:** escrever e rodar um teste (via código, nunca navegador) que simula acesso anônimo tentando ler dado de uma clínica diferente da solicitada, e afirma **0 resultados**. Sem esse teste passando, a tarefa não pode ser marcada como concluída.
4. Nunca usar Service Role como atalho para "resolver rápido" um erro de permissão sem antes tentar resolver via policy de RLS.

**Caso real detectado:** rota de auto-agendamento público (`clinic_slug`/`clinic_id` anônimo) usa Service Role para contornar RLS de `doctors` e `users`. É hoje o maior ponto de exposição a vazamento cross-clínica do sistema — não há teste de isolamento documentado.

---

### 🧹 5.2.3 — Regra de Saneamento em Massa (Produção)

> ⛔ **Nenhum script de limpeza, correção ou deduplicação pode rodar DELETE/UPDATE em massa direto em produção sem passo de simulação prévia.**

Fluxo obrigatório para qualquer `fix-*`, `clean-*` ou saneamento de dados:

1. **Modo dry-run primeiro:** contar e logar quantos registros seriam afetados, sem alterar nada.
2. **Exibir a contagem ao usuário** e aguardar confirmação explícita antes de rodar de verdade.
3. **Backup/export do subconjunto afetado** antes de qualquer DELETE em massa (mesmo que um CSV simples).
4. **Nomenclatura rastreável:** scripts vivem em `scripts/saneamento/AAAA-MM-DD_descricao.js` — nunca soltos na raiz do projeto como `scratch-*.js`.

**Caso real detectado:** `scratch-clean-duplicates.js` e `fix-waiting-list-duplicates.mjs` removeram centenas de registros em produção (Espaço Incluir) sem menção documentada de dry-run ou backup prévio.

---

### 🗃️ 5.2.4 — Regra de Migrations Versionadas

> ⛔ **Proibido entregar `.sql` avulso com instrução "rode isso manualmente no SQL Editor do Supabase" como solução final.**

- Toda alteração de schema ou policy de RLS vira arquivo de migration versionado (ex: `supabase/migrations/`), aplicado via MCP Supabase — nunca copiar/colar manual por clínica.
- Isso evita **drift de schema**: cada clínica acabar com uma versão diferente da política de RLS porque o admin rodou (ou não) o script na hora certa.

**Caso real detectado:** `fix_session_evolutions_rls_policy.sql` documentado como script para "o administrador da clínica executar no Supabase SQL Editor" — sem versionamento, sem garantia de que todas as clínicas aplicaram.

---

### ✅ Acréscimo ao Checklist do Relatório Final

> Adicionar como item **11** no Relatório Final (`✅ Relatório de Conclusão`):

```
11. SEGURANÇA DE DADOS AUDITADA:
    - [ ] Nenhum nome/CPF/telefone/e-mail real usado como condicional em código
    - [ ] Se usou Service Role: teste de isolamento cross-clínica escrito e PASSOU
    - [ ] Se rodou limpeza em massa: dry-run exibido e confirmado antes do DELETE real
    - [ ] Nenhum .sql avulso deixado para execução manual — migration versionada aplicada
```

---

*Clinigo · Protocolo de IA v5.2 (Adendo de Segurança de Dados) · Sempre responder em pt-br*
