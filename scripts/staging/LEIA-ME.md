# Manual de Verificação em Ambiente de Staging (Supabase)

Este documento orienta o proprietário do sistema no processo de validação das migrações do módulo de Faturamento, TISS, Glosas e Repasse em um projeto Supabase de Staging (homologação).

IMPORTANTE: Este procedimento NÃO foi executado pelo assistente de desenvolvimento, pois o ambiente local não possui container Docker ou Supabase CLI configurados. A execução deve ser realizada diretamente pelo proprietário no painel web do Supabase.

---

## 1. Pré-requisitos

1. Um projeto de Staging ou cópia de homologação criado no painel do Supabase.
2. Acesso com permissão de administrador ao SQL Editor do Supabase.
3. Node.js e Supabase CLI instalados em sua máquina local para a geração de tipos TypeScript.

---

## 2. Passo a Passo de Execução

### Passo 1: Aplicar as Migrations na Ordem Cronológica

No SQL Editor do projeto de Staging, abra e execute os arquivos de migração localizados na pasta `supabase/migrations/` rigorosamente na seguinte ordem:

1. `supabase/migrations/20260929120000_tiss_convenios_glosas_repasse.sql`
   - Cria as tabelas `tuss_procedures`, `health_insurance_price_tables`, `tiss_glosa_reasons_ans`, `tiss_return_imports`.
   - Adiciona colunas em `clinics`, `health_insurances`, `tiss_authorization_requests`, `tiss_guides`, `tiss_batches`.
   - Configura as políticas de RLS e os índices parciais.
   - Aplica carga inicial de motivos de glosa e procedimentos TUSS base.

2. `supabase/migrations/20260929130000_tiss_undo_rpc_and_reimport.sql`
   - Adiciona a coluna `status` em `tiss_return_imports` e cria o índice parcial de reimportação `uq_tiss_return_file_hash_active`.
   - Cria a função RPC atômica `tiss_undo_return_import`.
   - Adiciona a coluna `tiss_hash_algorithm` na tabela `clinics`.

### Passo 2: Executar o Script de Verificação

1. No SQL Editor do Supabase Staging, abra o arquivo `scripts/staging/verify-tiss-migrations.sql`.
2. Copie todo o conteúdo e cole no SQL Editor.
3. Clique em "Run" (Executar).
4. O script opera em bloco transacional que finaliza automaticamente em `ROLLBACK;`. Isso garante que nenhum dado fictício de teste permanecerá gravado no banco de dados.

### Passo 3: Interpretar a Tabela de Resultados

O script retornará uma grade com 9 linhas de diagnóstico:

| Teste | Status Esperado | O que Significa |
|---|---|---|
| 1. Tabelas Novas | PASS | Confirma a existência de todas as 4 tabelas novas. |
| 2. Colunas Novas | PASS | Confirma a existência de todas as 11 colunas adicionadas. |
| 3. RLS Habilitada | PASS | Confirma que `relrowsecurity` está ativo em 100% das tabelas novas. |
| 4. Políticas RLS | PASS | Confirma as políticas de isolamento multi-tenant e leitura global. |
| 5. Índices Únicos e Parciais | PASS | Confirma o índice parcial de reimportação e anti-duplicidade de guias. |
| 6. Função RPC tiss_undo_return_import | PASS | Confirma que a função de estorno atômico está compilada no banco. |
| 7. Duplicatas em tiss_guides | PASS | Confirma se há 0 registros duplicados no banco que impediriam o índice. |
| 8. Multi-tenant RLS (Cross-Clinic) | PASS | Prova que a Clínica A não consegue ler nem alterar dados da Clínica B. |
| 9. Exercício RPC tiss_undo_return_import | PASS | Exercita o desfazimento atômico completo com reversão de status. |

Se alguma linha apresentar o status `FAIL`, copie a mensagem da coluna `detalhe`.

### Passo 4: Geração dos Tipos TypeScript Atualizados

Com as migrações aplicadas no projeto de Staging, execute o comando abaixo em seu terminal local (apontando para o ID do projeto de staging) para atualizar as tipagens automáticas do sistema:

```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID_STAGING > types/supabase.generated.ts
```

Verifique se o arquivo `types/supabase.generated.ts` foi populado com as novas tabelas e colunas.

---

## 3. O que Você Deve Enviar de Volta

Após executar os passos acima, envie de volta:

1. O print ou o texto copiado da tabela final de resultados do script `verify-tiss-migrations.sql`.
2. Confirmação se houve algum erro na aplicação das duas migrações.
3. O arquivo `types/supabase.generated.ts` gerado, para que possamos substituir o arquivo vazio atual e validar a compilação de tipos.
