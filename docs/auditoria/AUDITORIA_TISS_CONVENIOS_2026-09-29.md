# Relatório de Auditoria Técnica de Código: Módulo de Convênios, TISS, Glosas e Repasse (CliniGO)

**Data:** 29 de setembro de 2026  
**Auditor:** Engenharia Full-Stack & Especialista em Faturamento TISS/ANS  
**Escopo:** Repositório CliniGO (Next.js App Router, Supabase/PostgREST, TypeScript, RBAC)  
**Status da Auditoria:** Concluída com evidências estritas de código (zero suposições)  

---

## 1. Resumo Executivo (Para Leigos e Tomada de Decisão Comercial)

O CliniGO possui uma fundação técnica para operadoras de saúde (cadastro de convênios, modelagem básica de guias e lotes e geração de XML em versões 4.01.00 e 4.02.00). No entanto, **o sistema NÃO possui atualmente um ciclo completo e automatizado de faturamento TISS**. A geração de guias a partir de atendimentos é desconectada do prontuário; inexiste catálogo oficial de procedimentos TUSS e tabela de preços por convênio; e a importação de retornos possui falhas críticas de infraestrutura que impedem o processamento em produção. Além disso, a checagem de elegibilidade online é simulada (mockada), as telas TISS não possuem blindagem de segurança no middleware para impedir que médicos vejam dados de outros profissionais, e o repasse médico é 100% calculado sobre a produção bruta, sem suporte a regime por recebimento da operadora ou desconto de glosas. Comercializar o sistema hoje como "TISS e Glosas 100% automatizado" expõe o negócio a grave risco comercial e jurídico.

---

## 2. Tabela Geral de Auditoria

| Item | Descrição do Recurso | Status Atual | Risco Técnico / Comercial | Esforço |
|---|---|---|---|---|
| **4.1.1** | Guia TISS a partir do Atendimento Realizado | **Parcial** (Desacoplado) | **Alto** | Médio |
| **4.1.2** | Catálogo TUSS e Tabela de Preços por Operadora/Plano | **Ausente** | **Alto** | Médio |
| **4.1.3** | Importação de Retorno / Conciliação de Glosas | **Parcial** (Quebrado em Produção) | **Crítico** | Médio |
| **4.1.4** | Envio de Lote, Protocolo e Webservice | **Parcial** (Apenas Download XML) | **Médio** | Pequeno |
| **4.1.5** | Elegibilidade de Pacientes (Validade e Planos) | **Ausente** (Mock Quebrado) | **Alto** | Pequeno |
| **4.1.6** | Regime de Repasse (Produção x Recebimento e Glosas) | **Parcial** (Apenas Produção) | **Alto** | Médio |
| **4.2.A** | Autorização Prévia com Controle de Saldo de Sessões | **Parcial** (Sem Saldo) | **Médio** | Médio |
| **4.2.B** | Validação Pré-Envio (Checklist Anti-Glosa) | **Parcial** (Apenas Campos Vazios) | **Alto** | Pequeno |
| **4.2.C** | Prazo / Data de Corte de Envio por Operadora | **Ausente** | **Médio** | Pequeno |
| **4.2.D** | Ciclo de Vida de Guias e Lotes com Histórico | **Parcial** (Sem Máquina Completa) | **Médio** | Pequeno |
| **4.2.E** | Catálogo ANS de Glosas e Recurso de Glosa | **Parcial** (Sem Tabela Oficial ANS) | **Alto** | Médio |
| **4.2.F** | Coparticipação com Reflexo no Caixa | **Ausente** | **Médio** | Pequeno |
| **4.2.G** | Conciliação Financeira com Contas a Receber | **Ausente** | **Alto** | Médio |
| **4.2.H** | Indicadores e Painel Gerencial (Aging, Taxa de Glosa) | **Parcial** (Métricas Básicas) | **Médio** | Pequeno |
| **4.2.I** | Comprovação do Atendimento (Biometria/Assinatura) | **Parcial** (Desconectada da Guia) | **Baixo** | Pequeno |
| **4.2.J** | Trilha de Auditoria em Guias e Faturamento | **Parcial** | **Médio** | Pequeno |
| **4.2.K** | Papéis e Permissões (RBAC e Sigilo Médico) | **Crítico** (Vulnerável no Middleware) | **Crítico** | Pequeno |
| **4.2.L** | Modalidade Ambos e Fluxo de Reembolso | **Parcial** | **Baixo** | Pequeno |
| **4.2.M** | Padrão TISS, Hash do Lote e Validação XSD | **Parcial** (Não Conforme ANS) | **Alto** | Médio |
| **4.2.N** | Terapias Multidisciplinares em SP/SADT | **Parcial** (Sem CBO por Item) | **Médio** | Pequeno |

---

## 3. Detalhamento Técnico com Evidências em Código

### 3.1. Perguntas Centrais (Seção 4.1)

#### 1. A guia TISS é gerada a partir do agendamento/atendimento realizado (pré-preenchida) ou digitada separadamente? Existe geração em massa das guias pendentes do mês? Existe proteção contra guia duplicada?
- **Status:** Parcial / Desacoplado
- **Evidências no Código:**
  - `app/api/tiss/appointments-for-batch/route.ts` (linhas 34-75): Existe query buscando consultas com status `COMPLETED` com convênio não nulo e sem guia TISS associada.
  - `app/api/tiss/batches/route.ts` (linhas 250-290): Ao criar lote passando `appointment_ids`, ele cria guias vinculadas, porém injeta dados mockados de procedimento (ex.: linha 279: `procedure_code: '10101012', // Código TUSS para consulta (exemplo)`).
  - `app/dashboard/(clinic)/tiss/new-guide-dialog.tsx`: Toda criação de guia na UI principal exige digitação manual de paciente, procedimento e dados de convênio.
  - `app/dashboard/(clinic)/atendimentos/page.tsx` e prontuário: **Não existe** botão de "Gerar Guia TISS" ao finalizar um atendimento de convênio.
  - **Duplicidade:** O banco não possui restrição UNIQUE para (`appointment_id`, `procedure_code`) ou `(clinic_id, guide_number)`.
- **Lacuna:** Falta o botão cirúrgico "Gerar Guia" dentro do atendimento, geração em lote de guias pendentes por período/operadora e trava de unicidade contra duplicidade.
- **Risco:** Alto (faturistas perdem horas redigitando dados e correm risco de gerar guias duplicadas).
- **Esforço:** Médio.

#### 2. Existe tabela TUSS (catálogo) e tabela de preços por operadora/plano? Como o valor da guia é determinado?
- **Status:** Ausente
- **Evidências no Código:**
  - Diretório `supabase/migrations/`: Inexiste tabela `tuss_procedures` ou `health_insurance_prices`.
  - `app/api/appointments/manual/route.ts` (linhas 473-483): Consulta a tabela `doctor_health_insurances`, que guarda apenas o valor genérico da consulta do médico para o plano (`consultation_price`), sem relacionar a procedimentos ou códigos TUSS.
  - `app/api/tiss/batches/[id]/generate-xml/route.ts` (linhas 115-133): O valor unitário e total da guia é extraído de `Number(guide.unit_value)` ou de `tiss_guide_procedures.unit_value`, que é preenchido manualmente sem validação contra tabela de preços cadastrada.
- **Lacuna:** Falta o catálogo TUSS importável por planilha/CSV oficial e a tabela de precificação contratual por operadora/plano com vigência, exigência de autorização e limite de sessões.
- **Risco:** Alto (guias geradas com valores divergentes da tabela da operadora resultam em glosa automática).
- **Esforço:** Médio.

#### 3. O sistema importa o demonstrativo de retorno da operadora (XML ou planilha) e concilia automaticamente com as guias, ou a baixa e o registro de glosa são 100% manuais?
- **Status:** Parcial / Quebrado em Produção
- **Evidências no Código:**
  - `app/api/tiss/returns/upload/route.ts` (linhas 86-93 e 111-125): O upload armazena o arquivo no bucket `'documents'` e grava `return_file_url` na tabela `tiss_returns`. Não grava coluna `file_path`.
  - `app/api/tiss/returns/[id]/parse/route.ts` (linhas 82-88): O parser tenta fazer o download do bucket inexistente `'tiss-returns'` usando `returnRecord.file_path` (que é `undefined`), gerando imediatamente a exceção `'Arquivo de retorno não encontrado'`.
  - `lib/services/tiss/tiss-xml-parser.ts` (linhas 57-110): O parser foi construído assumindo uma estrutura customizada da Unimed baseada em `<ans:loteGuias><ans:guiasTISS><ans:guia>`, não suportando a mensagem oficial de demonstrativo de retorno da ANS (`ans:demonstrativoRetorno`, `ans:demonstrativoAnaliseConta`, `ans:demonstrativoPagamento`).
  - Não há conciliação com o módulo de Contas a Receber (`financial_entries`).
- **Lacuna:** O parser de retorno XML está tecnicamente quebrado devido a divergência de buckets e esquemas, não lê demonstrativos ANS oficiais nem suporta importação de planilha/CSV de retorno, deixando a baixa 100% inoperante.
- **Risco:** Crítico (funcionalidade essencial anunciada não executa em produção).
- **Esforço:** Médio.

#### 4. Como é o envio ao convênio: apenas download do XML? Existe registro de protocolo de recebimento, data de envio e status do lote? Existe alguma integração por webservice?
- **Status:** Parcial
- **Evidências no Código:**
  - `app/api/tiss/batches/[id]/generate-xml/route.ts`: Gera o XML e disponibiliza URL para download via Supabase Storage.
  - `migrations/20260124_tiss_webservice.sql` e `lib/services/tiss/webservice-client.ts`: Criam a estrutura teórica para SOAP Webservice (`tiss_webservice_configs`), porém os clientes são apenas stubs não homologados contra nenhuma operadora real.
  - `tiss_batches`: Possui as colunas `protocol_number`, `submission_date` e `notes`, mas a interface não fornece um modal de registro de envio com comprovante de protocolo do portal e canal utilizado.
- **Lacuna:** Envio é estritamente manual (download do XML para upload no portal da operadora). Falta o modal de registro formal de envio/protocolo com anexo do comprovante e alerta de data de corte.
- **Risco:** Médio (o cliente espera envio automático via API, mas na saúde suplementar brasileira quase todas as clínicas usam download/upload manual nos portais).
- **Esforço:** Pequeno.

#### 5. A elegibilidade (carteirinha ativa, plano ativo, validade, titular/dependente) é checada em algum ponto?
- **Status:** Ausente / Mock Quebrado
- **Evidências no Código:**
  - `app/dashboard/(clinic)/convenios/page.tsx` (linhas 1445-1453): Aba de Elegibilidade dispara requisição para `POST /api/insurance/check-eligibility`.
  - `app/api/insurance/check-eligibility/route.ts`:
    - **Erro de Execução (Bug de Referência):** A linha 6 define `const eligibilitySchema = ...`, mas a linha 39 executa `const validated = eligibility_schema.parse(body);`, causando `ReferenceError: eligibility_schema is not defined` em runtime.
    - **Simulação Falsa (Mock):** Linhas 59-67 trazem: `// TODO: Implementar integração real com API da operadora / // Por enquanto, simulando resposta / isActive = true`.
  - `app/api/appointments/manual/route.ts`: Não checa se a carteirinha está vencida, se o plano está ativo na clínica ou se o paciente é dependente.
- **Lacuna:** Inexiste verificação cadastral interna prévia (data de validade da carteirinha versus data da consulta) e a rota de checagem online é um mock com bug de compilação.
- **Risco:** Alto (atendimentos realizados com carteirinhas vencidas viram glosas administrativas certas).
- **Esforço:** Pequeno.

#### 6. O repasse é por produção ou por recebimento da operadora? Uma glosa mantida altera o valor repassado? Há estorno/desconto? É configurável por clínica?
- **Status:** Apenas Produção (Sem suporte a recebimento ou glosa)
- **Evidências no Código:**
  - `lib/services/repasse-calculator.ts` (linhas 54-150): A função `computeRepasseFromRules` calcula o repasse exclusivamente com base no valor do agendamento (`appointmentValue`), contratos (`doctor_contracts`) ou taxas customizadas (`doctor_patient_rates`).
  - `app/api/financial/production-summary/route.ts` (linhas 143-153 e 212-265): Busca todos os atendimentos com status `'Presente'` ou `'Reposição'` no mês e totaliza o repasse, sem verificar se a guia foi emitida, enviada, paga ou glosada.
  - Não existem campos de configuração em `clinics` para regime de repasse (`repasse_regime`) nem política de glosa (`glosa_policy`).
- **Lacuna:** O sistema não suporta regime por `RECEBIMENTO` (aguardar pagamento da operadora para liberar repasse) nem estorno de glosas mantidas no demonstrativo do profissional.
- **Risco:** Alto (a clínica pode pagar o profissional por atendimentos de convênio que foram 100% glosados pela operadora).
- **Esforço:** Médio.

---

### 3.2. Verificações Adicionais (Seção 4.2: A a N)

- **A. Autorização Prévia com Controle de Saldo de Sessões:**
  - *Evidência:* `migrations/20260124_tiss_authorization.sql` cria `tiss_authorization_requests`. Contudo, não há campos `sessions_authorized`, `sessions_used` e `sessions_remaining`, nem decremento automático pelas guias faturadas. *Status: Parcial.*
- **B. Validação Pré-Envio (Checklist Anti-Glosa):**
  - *Evidência:* `app/api/tiss/guides/validate/route.ts` e `lib/services/tiss/tiss-validator.ts` verificam preenchimento de campos obrigatórios básicos, mas não validam expiração de carteirinha, saldo de sessões, compatibilidade de CBO com o procedimento e duplicidade de atendimento. *Status: Parcial.*
- **C. Prazo / Data de Corte de Envio por Operadora:**
  - *Evidência:* `health_insurances` não possui campo de dia de corte nem alerta de fechamento de lote prestes a expirar. *Status: Ausente.*
- **D. Ciclo de Vida do Status da Guia e Lote:**
  - *Evidência:* `types/tiss.ts` lista enums de status, mas não há suporte explícito para `EM_RECURSO`, `RECURSO_ACATADO` e `PERDA_DEFINITIVA`, nem histórico auditável de transições de status. *Status: Parcial.*
- **E. Glosas e Recursos:**
  - *Evidência:* `migrations/20260124_tiss_glosas.sql` cria `tiss_glosas` e `tiss_glosa_contests`. Entretanto, os códigos de glosa são preenchidos como texto livre, sem catálogo oficial da Tabela 38/61 da ANS. Inexiste geração do XML de Recurso de Glosa. *Status: Parcial.*
- **F. Coparticipação:**
  - *Evidência:* Não há campos de coparticipação no agendamento nem fluxo para lançar o valor no caixa da recepção e abater do contas a receber da operadora. *Status: Ausente.*
- **G. Conciliação Financeira com Contas a Receber:**
  - *Evidência:* O processamento do retorno do lote em `app/api/tiss/returns` não se conecta com `financial_entries`, impedindo o fechamento automático entre valor apresentado, valor pago e valor glosado. *Status: Ausente.*
- **H. Indicadores e Painel Gerencial:**
  - *Evidência:* `app/api/tiss/dashboard/route.ts` calcula totais de guias e lotes, mas não gera taxa de glosa por operadora/profissional/motivo, tempo médio de pagamento ou aging de contas a receber. *Status: Parcial.*
- **I. Comprovação do Atendimento Vinculada à Guia:**
  - *Evidência:* O CliniGO possui biometria facial (`patient_face_biometrics`) e assinaturas digitais (`patient_term_signatures`), mas não há vinculação das assinaturas/fotos à guia TISS emitida. *Status: Parcial.*
- **J. Trilha de Auditoria:**
  - *Evidência:* Inserções isoladas em `audit_logs` no momento de geração do XML do lote (`app/api/tiss/batches/[id]/generate-xml/route.ts`, linha 237), mas sem rastreamento de criação, alteração manual e baixa por guia individual. *Status: Parcial.*
- **K. Papéis e Permissões (RBAC e Sigilo Médico):**
  - *Evidência:* Em `middleware.ts`, a rota `/dashboard/tiss` **NÃO está listada em `ROLE_PROTECTED_PAGES`**, e a rota `/api/tiss` **NÃO está em `ROLE_PROTECTED_ROUTES`**. Além disso, `app/api/tiss/guides/route.ts` (linhas 9-24) valida apenas se o usuário tem `clinic_id`, permitindo que um usuário com papel `DOCTOR` veja guias, valores e carteirinhas de outros médicos e pacientes da clínica, violando o princípio de sigilo e a Regra 5.2 de LGPD. *Status: Crítico / Vulnerável.*
- **L. Modalidade "Ambos" e Fluxo de Reembolso:**
  - *Evidência:* Suporte existente no cadastro de pacientes (`billing_type = 'BOTH'`) e emissão de recibos para reembolso em `patient_reimbursement_rules`, mas sem integração com o faturamento TISS. *Status: Parcial.*
- **M. Padrão TISS, Hash e Validação XSD:**
  - *Evidência:* `lib/services/tiss/tiss-xml-generator-v2.ts` gera hash via SHA-256 sobre JSON (`this.generateHash(batchData)` na linha 402), contrariando o padrão ANS (que exige algoritmo MD5 calculado sobre o fluxo do documento XML na tag `<ans:epilogo><ans:hash>`). A validação XSD em `lib/services/tiss/tiss-xsd-validator.ts` não valida gramática XSD real, operando via checagem regex em TypeScript. *Status: Não-conforme.*
- **N. Terapias Multidisciplinares em SP/SADT:**
  - *Evidência:* `tiss_guide_procedures` permite múltiplos procedimentos, mas não vincula o CBO, conselho profissional específico e profissional executante por procedimento individual (essencial em clínicas multidisciplinares com fonoaudiologia, psicologia, terapia ocupacional e fisioterapia). *Status: Parcial.*

---

## 4. Matriz Comercial Honesta (Proteção do Dono do CliniGO)

Esta matriz deve ser utilizada estritamente pelo setor comercial e nas demonstrações de vendas, evitando promessas incompatíveis com o código real do produto.

| Pode ser afirmado hoje ao cliente | Pode ser afirmado com ressalva | NÃO pode ser afirmado hoje |
|---|---|---|
| Cadastro de operadoras de convênio e planos de saúde | Geração de XML TISS: **Ressalva:** Gera XML nas versões 4.01.00 e 4.02.00 para envio manual via portal da operadora (o envio direto via webservice exige homologação com cada operadora). | "Envio automático de lotes para operadoras via API/Webservice sem intervenção humana." |
| Cadastro de carteirinhas de convênio no perfil do paciente | Gestão de Glosas: **Ressalva:** Permite registrar e gerenciar o status do recurso de glosa, mas a leitura do demonstrativo de retorno exige baixa manual/estruturada. | "Consulta de elegibilidade da carteirinha em tempo real online com as operadoras." |
| Emissão de recibos detalhados para pacientes na modalidade de Reembolso | Cálculo de Repasse Médico: **Ressalva:** O repasse médico atual é calculado sobre a produção de atendimentos realizados; o regime por recebimento e desconto de glosas entra na versão configurável. | "Importação automática de demonstrativo de pagamento XML de qualquer operadora com baixa instantânea." |
| Visualização e download de arquivos XML de lotes para prestadores | Lotes TISS: **Ressalva:** Agrupa atendimentos concluídos no mês e gera o arquivo consolidado de faturamento ambulatorial e consulta. | "O sistema desconta automaticamente do médico as glosas não pagas pelo convênio." |
| Sigilo médico nos prontuários e agendamentos | Validação de Guias: **Ressalva:** Validação estrutural de campos obrigatórios antes do fechamento do lote. | "Tabela TUSS completa já embutida e atualizada automaticamente pela ANS." |

---

## 5. Plano de Implantação Priorizado (Fase 2)

### Prioridade P0 (Crítico / Segurança e Correção de Bugs)
1. **Blindagem RBAC no Middleware e APIs:** Adicionar `/dashboard/tiss` e `/dashboard/convenios` em `ROLE_PROTECTED_PAGES`, e `/api/tiss` em `ROLE_PROTECTED_ROUTES`. Bloquear acesso do perfil `DOCTOR` a dados de operadora, planos e faturamento de terceiros.
2. **Correção do Módulo de Upload e Parse de Retornos:** Corrigir a divergência de buckets (`documents` vs `tiss-returns`), gravar `file_path` e implementar fallback de importação via CSV estruturado para demonstrativos de pagamento.
3. **Correção do Bug de Sintaxe na Elegibilidade:** Corrigir `eligibility_schema` em `app/api/insurance/check-eligibility/route.ts` e implementar a checagem cadastral interna (validade da carteirinha, operadora ativa).

### Prioridade P1 (Regras de Domínio e Faturamento)
4. **Catálogo TUSS e Tabela de Preços por Operadora:** Criar migrations e interfaces para cadastro de procedimentos TUSS e tabela de valores contratados por operadora/plano com flags de exigência de autorização e vigência.
5. **Geração Cirúrgica de Guia a partir do Atendimento:** Botão "Gerar Guia TISS" no atendimento/prontuário concluído com pré-preenchimento automático, trava de duplicidade e geração em massa de pendências do mês.
6. **Configuração de Regime de Repasse e Política de Glosa:** Suporte a `repasse_regime` (`PRODUCAO` ou `RECEBIMENTO`) e `glosa_policy` (`CLINICA_ABSORVE`, `DESCONTA_PROFISSIONAL`, `DESCONTA_SE_MANTIDA`), com testes numéricos de folha.

### Prioridade P2 (Operação e Conformidade)
7. **Saldo de Sessões na Autorização:** Controle de sessões autorizadas, utilizadas e restantes com alerta de vencimento/saldo baixo.
8. **Catálogo de Motivos de Glosa ANS e Registro de Protocolo:** Importação da tabela oficial de glosas da ANS, formulário de protocolo de envio de lote e canal utilizado.
9. **Conformidade do Hash TISS (MD5):** Correção do cálculo do hash oficial da ANS no gerador XML.

---
*Relatório de auditoria homologado para prosseguimento cirúrgico da Fase 2.*
