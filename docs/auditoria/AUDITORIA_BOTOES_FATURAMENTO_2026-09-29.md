# Auditoria de Botoes, Permissoes e Integridade de Faturamento TISS
**Data da Auditoria:** 2026-09-29  
**Status da Fase B0:** Concluida  
**Modulo:** Faturamento Suplementar TISS / CliniGO  

---

## 1. Resumo Executivo e Correcao de Menor Privilegio (B0.1)

Na revisao da Fase 10 (D3), os handlers de rotas da API TISS haviam sido afrouxados para coincidir com o middleware administrativo, concedendo permissoes de escrita e transmissao a perfis operacionais (`RECEPTIONIST`) e financeiros (`FINANCIAL`) em acoes sensiveis.

### 1.1 Correcao Aplicada
Revertemos integralmente para o principio de **Menor Privilegio (Least Privilege)** estrito, de acordo com a Secao 5 da especificacao arquitetural:
- `RECEPTIONIST`: Acesso restrito a visualizacao de guias, criacao/salvamento/validacao/duplicacao de guias, exclusao de rascunhos proprios, checagem de elegibilidade e consulta de tabelas TUSS/precos. **Bloqueio absoluto (403)** para criacao/fechamento/edicao/exclusao de lotes, geracao de XML, envio de lotes, processamento em massa, upload/parse/undo de retornos, contestacao de glosas e configuracao de precos/operadoras.
- `FINANCIAL`: Opera criacao e gestao de lotes, geracao de XML, importacao e processamento de retornos, lancamento e recurso de glosas, e visualizacao/edicao de regras de precos. **Bloqueio (403)** para exclusao de regras de precos, importacao de catalogos TUSS estruturais, cadastro de operadoras e reversao (undo) de retornos financeiros consolidados.
- `CLINIC_ADMIN` / `SUPER_ADMIN`: Acesso pleno e exclusivo para acoes criticas (desfazer retorno, exclusao de pricing, importacao TUSS, ativacao de modo demonstracao).
- `DOCTOR`: **Bloqueio total (403 estrito)** em 100% dos endpoints deste modulo (R6).
- `READONLY`: Visualizacao e impressao apenas; proibido criar, salvar, validar, excluir ou alterar registros.

### 1.2 Evidencia de Validacao Automatizada
A suite `__tests__/security/tiss-doctor-block.test.ts` foi expandida para validar a matriz de permissoes completa cruzando todos os 5 perfis em todos os metodos HTTP de todas as rotas TISS e de elegibilidade:
```
=== RESUMO DE AUDITORIA RBAC MULTI-PERFIL (MENOR PRIVILEGIO) ===
Perfil: DOCTOR         | Total de Testes: 57   | Aprovados: 57
Perfil: READONLY       | Total de Testes: 57   | Aprovados: 57
Perfil: RECEPTIONIST   | Total de Testes: 57   | Aprovados: 57
Perfil: FINANCIAL      | Total de Testes: 57   | Aprovados: 57
Perfil: CLINIC_ADMIN   | Total de Testes: 57   | Aprovados: 57
==================================================================
Test Suites: 1 passed, 1 total
Tests:       285 passed, 285 total
Time:        1.394 s
```

---

## 2. Auditoria dos Botoes de Faturamento (B0.2)

Abaixo segue a matriz de avaliacao dos 29 botoes previstos para o ciclo de faturamento e recursos:

| Codigo | Nome do Botao | Status Atual | Evidencia (Arquivo/Rota) | Gap / Lacuna Identificada | Esforco | Risco |
|---|---|---|---|---|---|---|
| **G1** | Criar Guia / Nova Guia | Parcial | `app/dashboard/(clinic)/tiss/new-guide-dialog.tsx`, `POST /api/tiss/guides` | Dialog simplificado com campos manuais de ID; falta assistente de 3 passos, busca de elegibilidade, TUSS e saldo de sessoes | Medio | Baixo |
| **G2** | Salvar / Gravar Rascunho | Parcial | `POST /api/tiss/guides` | Falta debounce de salvamento automatico na UI, indicador visual "Salvo as HH:MM" e bloqueio otimista | Baixo | Baixo |
| **G3** | Validar / Checar Erros | Parcial | `POST /api/tiss/guides/validate` | Validacao existe no backend; falta painel categorizado (Bloqueantes, Avisos, Sugestoes) com botao "Corrigir" e selo de risco de glosa | Medio | Baixo |
| **G4** | Excluir / Cancelar Guia | Parcial | `DELETE /api/tiss/guides/[id]` | Nao diferencia exclusao de rascunho (com desfazer) de cancelamento de guia validada (exige motivo); falta trava para guia enviada | Medio | Medio |
| **G5** | Duplicar Guia | Ausente | Inexistente na UI e API | Falta fluxo de duplicacao simples e em lote para multiplas sessoes autorizadas | Medio | Baixo |
| **G6** | Imprimir Guia | Ausente | Inexistente na UI e API | Falta gerador de PDF espelho da guia (Consulta e SP/SADT) com marca d'agua de rascunho e registro de auditoria | Medio | Baixo |
| **L1** | Criar Novo Lote | Parcial | `components/tiss/create-batch-dialog.tsx`, `POST /api/tiss/batches` | Funciona de forma basica; falta selecao refinada do tipo de lote conforme gerador e fechamento seguro | Baixo | Baixo |
| **L2** | Vincular Guias ao Lote | Parcial | `app/api/tiss/batches/[id]` | Permite associacao mas sem modal dedicada com totalizadores ao vivo, filtro em massa de guias validadas e bloqueio de duplicidade | Medio | Baixo |
| **L3** | Fechar Lote | Parcial | `PUT /api/tiss/batches/[id]` | Atualiza status; falta revalidacao exaustiva impeditiva, calculo de checksum de integridade e flag de aprovacao dupla | Medio | Medio |
| **L0** | Reabrir Lote (Extra) | Ausente | Inexistente | Nao ha fluxo de reabertura com justificativa antes do envio para retornar guias a Validada | Baixo | Baixo |
| **L4** | Gerar XML | Parcial | `POST /api/tiss/batches/[id]/generate-xml` | Gera XML e hash; falta historico versionado em tabela dedicada (`tiss_batch_xml_versions`) para evitar sobrescrita | Medio | Baixo |
| **L5** | Exportar / Download XML | Parcial | `batch-list-table.tsx` (URL direta) | Download por URL publica; falta link assinado temporario com auditoria e geracao de pacote ZIP (XML + capa + relatorio) | Medio | Baixo |
| **L6** | Transmitir Lote (Web Service) | Parcial | `batch-list-table.tsx` | Falta tratamento dos estados honestos: botao "Configurar integracao" ou "Transmitir (SIMULACAO)" | Baixo | Baixo |
| **L7** | Registrar Envio Manual (Extra) | Parcial | `batch-list-table.tsx` | Dialog simples de protocolo; falta upload do comprovante de envio e transicao em cascata das guias | Baixo | Baixo |
| **R1** | Importar XML de Retorno | Parcial | `components/tiss/upload-return-dialog-v2.tsx`, `POST /api/tiss/returns/upload` | Parser suporta XML e CSV; falta disponibilizacao de modelo padrao de CSV para download | Baixo | Baixo |
| **R2** | Processar Retorno / Conciliar | Parcial | `POST /api/tiss/returns/[id]/parse` | Grava diretamente; falta etapa de previa obrigatoria (simulacao sem gravar) com conciliacao atomica por RPC | Alto | Alto |
| **R3** | Lancar Glosa Manual | Ausente | Inexistente na UI | Nao ha formulario para registrar glosa manual com classificacao, motivo TISS e validacao de teto | Medio | Baixo |
| **R4** | Desfazer Retorno (Extra) | Existe | `batch-list-table.tsx`, `POST /api/tiss/returns/[id]/undo` | Implementado com transacao segura, estorno de repasse e auditoria formal; restrito a administradores | Baixo | Baixo |
| **C1** | Iniciar Recurso de Glosa | Parcial | `components/tiss/contest-glosa-dialog.tsx`, `POST /api/tiss/glosas/[id]/contest` | Contestacao individual basica; falta lote de recurso com selecao em massa e contagem regressiva de SLA | Alto | Medio |
| **C2** | Vincular Itens Glosados | Ausente | Inexistente | Falta associacao granular de procedimentos/itens da guia com valores recursados limitados ao glosado | Medio | Baixo |
| **C3** | Justificar / Aplicar Justificativa | Parcial | `components/tiss/contest-glosa-dialog.tsx` | Textarea simples; falta contador de caracteres, modelos pre-cadastrados e interpolacao de variaveis | Medio | Baixo |
| **C4** | Reaproveitar Justificativa | Ausente | Inexistente | Falta recurso para aplicar justificativa em lote com resolucao de variaveis por item | Medio | Baixo |
| **C5** | Anexar Documentos / Prontuarios | Ausente | Inexistente | Falta bucket privado `tiss-attachments`, link assinado de 5 min e extracao de laudo/prontuario com log | Alto | Medio |
| **C6** | Gerar Lote de Recurso | Ausente | Inexistente | Falta checklist previo impeditivo e geracao de dossie PDF/ZIP ou CSV honesto | Alto | Baixo |
| **C7** | Enviar Recurso / Liberar | Ausente | Inexistente | Falta fluxo de liberacao com dupla conferencia e registro de envio com protocolo | Medio | Baixo |
| **C8** | Registrar Resultado do Recurso (Extra) | Ausente | Inexistente | Falta registro do resultado (acatado/parcial/negado) com baixa automatica no repasse e financeiro | Alto | Alto |
| **C9** | Modelos de Justificativa (Extra) | Ausente | Inexistente | Falta cadastro e biblioteca de modelos institucionais por operadora e codigo de glosa | Medio | Baixo |
| **F1** | Filtrar por Status | Parcial | `app/dashboard/(clinic)/tiss/glosas/page.tsx` | Filtros basicos por data; falta sincronizacao com URL, chips de contagem e filtros de lote/guia/recurso | Medio | Baixo |
| **F2** | Historico / Auditoria (Log) | Ausente | `audit_logs` gravado via backend | Falta `HistoryDrawer` para exibicao da linha do tempo visual de eventos e pagina global F2 | Medio | Baixo |

---

## 3. Diagnostico da Numeracao de Guias (B0.3)

### 3.1 Mecanismo Atual
Localizado em `app/api/tiss/guides/route.ts` (linhas 154-157) e `app/api/tiss/guides/from-appointment/route.ts`:
```typescript
const { count: guideCount } = await supabase
    .from('tiss_guides')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .gte('created_at', `${year}-01-01`);

const guideNumber = `${year}${String((guideCount || 0) + 1).padStart(6, '0')}`;
```

### 3.2 Avaliacao de Risco de Concorrencia
- **Severidade: ALTA / CRITICA.**
- **Condicao de Corrida (Race Condition):** Se dois recepcionistas emitirem guias no mesmo instante para a mesma clinica, ambas as requisicoes executarao o `select count()` simultaneamente, obtendo o mesmo valor. Como consequencia, ambas tentarao inserir guias com o mesmo numero do prestador (`guide_number`).
- **Colisao por Exclusao:** Se uma guia antiga for excluida ou o rascunho for purgado, a contagem total de registros diminui, gerando colisao imediata com numeros de guias emitidas anteriormente.
- **Solucao Arquitetural Obrigatoria (Fase B1):**
  Criacao da tabela `tiss_guide_counters` com chave primaria composta `(clinic_id, year)` e funcao SQL nativa com bloqueio de linha atomico (`SELECT ... FOR UPDATE`):
  ```sql
  CREATE OR REPLACE FUNCTION generate_tiss_guide_number(p_clinic_id UUID, p_year INT)
  RETURNS TEXT AS $$ ... $$ LANGUAGE plpgsql;
  ```

---

## 4. Diagnostico de Historico de Status e Auditoria (B0.4)

### 4.1 Estado Atual
- As gravacoes de auditoria ocorrem de forma dispersa diretamente na tabela `audit_logs` em alguns endpoints (`validate-xsd`, `returns/[id]/undo`, `guides/from-appointment`, `batches/[id]/generate-xml`).
- Transicoes de status em `tiss_guides`, `tiss_batches` e `tiss_glosas` atraves de metodos `PUT` convencionais frequentemente nao registram entrada em `audit_logs`.
- Nao ha historico unificado de alteracao com campos `previous_status`, `new_status`, `reason`, `ip_address` e `metadata` consistentes.
- Nao existe componente de interface visual para consulta de historico (drawer de linha do tempo ou painel de auditoria do lote/guia).

### 4.2 Solucao Arquitetural Obrigatoria (Fase B1)
- Helper padronizado `writeTissAudit()` em `lib/tiss/audit.ts` acionado em todas as transicoes de estado.
- Componente `HistoryDrawer.tsx` reutilizavel exibindo ator, data/hora formatada, diferenca antes/depois e motivo da alteracao.
- Pagina de Auditoria Global (F2) integrada a central de faturamento.

---
Auditoria B0 concluida com sucesso. Reversao de privilegios validada por 285 testes unitarios automatizados.
