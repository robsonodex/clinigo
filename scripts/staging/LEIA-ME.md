# Instruções de Execução: Validação e Homologação TISS em Staging

Este documento orienta o proprietário e a equipe técnica sobre como executar e interpretar as validações de banco de dados no ambiente de Homologação/Staging (Supabase SQL Editor).

---

## 1. Princípios de Segurança Absoluta

1. **TRANSAÇÃO COM ROLLBACK OBRIGATÓRIO:** O script `verify-tiss-premium.sql` roda inteiramente dentro de um bloco transacional (`BEGIN; ... ROLLBACK;`). Nenhuma linha de teste ou fixture permanece gravada no banco após a execução.
2. **ZERO IMPACTO EM PRODUÇÃO:** Este script deve ser executado exclusivamente no projeto de **homologação/staging** da Vercel / Supabase.
3. **RESILIÊNCIA COM SUB-BLOCOS:** Cada teste possui tratamento de exceção (`BEGIN ... EXCEPTION WHEN OTHERS ... END;`), garantindo que a falha de um teste não aborte a exibição dos demais.

---

## 2. Como o Dono Executa o Script no Supabase Staging

1. Acesse o painel do Supabase do projeto de **staging**.
2. No menu lateral esquerdo, clique em **SQL Editor**.
3. Clique em **+ New query**.
4. Abra o arquivo local:
   `d:\clinigo\clinigo\scripts\staging\verify-tiss-premium.sql`
5. Copie **todo o conteúdo** do arquivo e cole no editor do Supabase.
6. Clique no botão **Run** (ou pressione `Ctrl + Enter`).
7. O resultado será exibido em uma tabela com 4 colunas:
   - `id`: Número do teste
   - `teste`: Nome do requisito avaliado
   - `status`: `PASS` ou `FAIL`
   - `detalhe`: Diagnóstico técnico do teste

---

## 3. Como Interpretar os Resultados dos Testes

| Teste | Objetivo | Critério de PASS |
|---|---|---|
| **1. Tabelas da Fundação** | Verifica a criação das tabelas `tiss_guide_counters`, `tiss_batch_xml_versions` e `tiss_appeal_justification_templates` | As 3 tabelas existem no schema `public` |
| **2. Colunas de Versionamento e Exclusão** | Verifica as colunas `deleted_at`, `version`, `closed_at`, `checksum` | Todas as 7 colunas estão presentes |
| **3. Configuração de Segurança da RPC** | Verifica se `generate_tiss_guide_number` é `SECURITY DEFINER` com `search_path = public, pg_temp` | Função não vulnerável a injeção por search_path dinâmico |
| **4. Privilégios de Execução (GRANT)** | Confere `GRANT EXECUTE` para `authenticated` e `service_role` | Chamadas de usuário real não tomam `42501 permission denied` |
| **5. Políticas RLS Registradas** | Confere se há políticas ativas em `pg_policies` | As tabelas possuem regras reais de isolamento cadastradas |
| **6. Prevenção de Colisão (C1)** | Insere guia fictícia com número `2026000050` e chama a RPC | O próximo número gerado é `2026000051`, respeitando o teto pré-existente |
| **7. Blindagem Spoofing de Clínica (C2)** | Simula usuário da Clínica B tentando gerar número para Clínica A | A função rejeita imediatamente com código `42501` |
| **8. Isolamento RLS Multi-tenant (C5.3)** | Simula usuário da Clínica B tentando ler dados da Clínica A | A RLS filtra e retorna exatamente 0 registros |

---

## 4. O que Fazer em Caso de FAIL por Chave Estrangeira (FK)

Se o teste indicar falha no passo de preparação de fixtures (`0. Fixtures de Homologação`), por exemplo:
- `insert or update on table "..." violates foreign key constraint`

**Diagnóstico:** O banco de staging possui restrições adicionais em tabelas correlatas (como CNPJ único, usuário master obrigatório ou plano de saúde específico).

**Ação:**
1. Não altere o script manualmente.
2. Copie a mensagem exata do erro no campo `detalhe`.
3. Envie a mensagem ao time de engenharia. O script utiliza geração dinâmica de dependências na transação para satisfazer as chaves estrangeiras.

---

## 5. O que o Dono Deve Devolver

Após a execução no SQL Editor, copie e devolva a tabela de resultados no seguinte formato:

```markdown
| id | teste                                     | status | detalhe                                                                     |
|----|-------------------------------------------|--------|-----------------------------------------------------------------------------|
| 1  | 1. Tabelas da Fundação                    | PASS   | As 3 novas tabelas existem no schema public                                 |
| 2  | 2. Colunas de Versionamento e Exclusão    | PASS   | Todas as 7 colunas de versionamento e soft delete estão presentes          |
| 3  | 3. Configuração de Segurança da RPC       | PASS   | Função é SECURITY DEFINER com search_path = public, pg_temp estrito         |
| 4  | 4. Privilégios de Execução (GRANT)        | PASS   | Permissão EXECUTE concedida a authenticated e service_role                  |
| 5  | 5. Políticas RLS Registradas              | PASS   | Todas as 3 tabelas possuem políticas RLS ativas em pg_policies              |
| 6  | 6. Prevenção de Colisão (C1)              | PASS   | Número gerado (2026000051) respeitou o teto pré-existente (2026000050)      |
| 7  | 7. Blindagem Spoofing de Clínica (C2)     | PASS   | Bloqueio imediato (42501) quando usuário autenticado tenta gerar de outra   |
| 8  | 8. Isolamento RLS Multi-tenant (C5.3)     | PASS   | RLS barrou leitura cross-clinic com 0 registros visíveis para outra clínica |
```
