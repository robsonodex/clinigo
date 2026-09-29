# GUIA COMPLETO DE CONVÊNIOS, PADRÃO TISS, GLOSAS E REPASSE MÉDICO
## Manual Didático de Capacitação e Apresentação Comercial do CliniGO

Documento elaborado especialmente para a diretoria e equipe comercial do CliniGO.

---

## 1. A IDEIA CENTRAL E OS 4 PERSONAGENS

Atender por convênio médico é muito parecido com uma venda a prazo ("vender fiado") para uma grande empresa.

Quando um paciente particular se consulta, ele paga no mesmo instante (no balcão da clínica, via Pix, cartão ou dinheiro). O dinheiro entra imediatamente no caixa da clínica.

No convênio de saúde, o paciente não paga nada diretamente à clínica (ou paga apenas uma taxa de coparticipação). Quem promete pagar a conta é a operadora do plano de saúde. Porém, essa operadora só vai depositar o dinheiro de 30 a 90 dias depois, e somente se a clínica provar detalhadamente tudo o que fez, sem nenhum erro de cadastro, digitação ou prazo. Se houver qualquer discordância, a operadora recusa o pagamento (isso se chama "glosa").

Existem quatro personagens essenciais nesse processo:

1. **O Paciente (Beneficiário):**
   É a pessoa que contratou o plano de saúde ou que recebe o benefício da empresa onde trabalha. Ele quer ser atendido sem burocracia apresentando sua carteirinha.
2. **A Clínica (Prestador de Serviços):**
   É o estabelecimento de saúde credenciado pela operadora. Ela contrata médicos, psicólogos, terapeutas, arca com a estrutura física e realiza o atendimento ao paciente.
3. **A Operadora de Saúde (Convênio):**
   É a empresa que vende o plano de saúde (exemplos: Unimed, Bradesco Saúde, Amil, SulAmérica). Ela recebe as mensalidades dos clientes e paga as clínicas pelos atendimentos prestados, após conferir e auditar minuciosamente cada cobrança.
4. **A ANS (Agência Nacional de Saúde Suplementar):**
   É o órgão do governo federal que regula e fiscaliza todo o setor de planos de saúde no Brasil. É a ANS quem dita as regras do jogo, define quais tratamentos são obrigatórios e estabelece o padrão de comunicação entre as clínicas e as operadoras (o padrão TISS).

> ### Resumo da Seção em 3 Linhas:
> 1. Convênio é receber a prazo de uma empresa que audita cada detalhe antes de pagar.
> 2. Quatro partes interagem: Paciente (usuário), Clínica (prestador), Operadora (pagador) e ANS (regulador).
> 3. Se a clínica errar qualquer dado na cobrança, a operadora não paga (ocorre a glosa).

---

## 2. GLOSSÁRIO COMPLETO E DESCOMPLICADO

Para conversar com faturistas, médicos e donos de clínicas com autoridade, você precisa dominar estes termos:

- **TISS (Troca de Informação em Saúde Suplementar):**
  É a "língua universal" que a ANS criou para todas as clínicas e convênios conversarem. Antes do TISS, cada operadora exigia formulários em papéis diferentes. O TISS padronizou os dados em arquivos eletrônicos XML.
- **TUSS (Terminologia Unificada da Saúde Suplementar):**
  É o "código de barras" dos procedimentos médicos. Cada consulta, exame ou sessão de terapia tem um código numérico fixado pela ANS. Exemplo: 10101012 é Consulta em consultório.
- **Guia TISS:**
  É o documento digital que registra um atendimento. Existem tipos específicos:
  - *Guia de Consulta:* para consultas médicas isoladas.
  - *Guia SP/SADT (Serviços Profissionais / Serviço Auxiliar de Diagnóstico e Terapia):* para exames, terapias multidisciplinares (fonoaudiologia, psicologia, terapia ocupacional, fisioterapia) e pequenos procedimentos.
- **Lote TISS:**
  É o agrupamento mensal de várias guias de uma mesma operadora empacotadas em um único arquivo eletrônico (XML) para envio de faturamento.
- **XML (Extensible Markup Language):**
  O formato oficial de arquivo de texto estruturado que as operadoras recebem para processar o lote de faturamento.
- **Glosa:**
  É a recusa de pagamento de um procedimento ou guia pela operadora de saúde. A glosa pode ser total (recusa a conta inteira) ou parcial (paga a consulta, mas recusa um exame específico).
- **Recurso de Glosa:**
  É a contestação formal que a clínica envia à operadora provando que a glosa foi indevida e solicitando o pagamento do valor que foi retido.
- **Elegibilidade:**
  É a checagem que confirma se a carteirinha do paciente está ativa, se o plano cobre aquele tipo de consulta e se o contrato não está cancelado ou inadimplente.
- **Autorização Prévia / Senha (Token):**
  O código alfanumérico que a operadora emite autorizando formalmente a realização de um exame, cirurgia ou pacote de sessões de terapia. Sem senha cadastrada em procedimentos que a exigem, a guia é glosada imediatamente.
- **Coparticipação:**
  Valor em dinheiro ou percentual que o paciente paga à clínica no momento do atendimento por determinação do seu contrato de plano de saúde.
- **CBO (Classificação Brasileira de Ocupações):**
  O código oficial de ocupação do profissional (ex: 2251-25 para Clínico Geral, 2515-10 para Psicólogo Clínico). É obrigatório em todas as guias TISS.
- **CNES (Cadastro Nacional de Estabelecimentos de Saúde):**
  O "RG" do estabelecimento de saúde emitido pelo Ministério da Saúde. O CliniGO valida o CNES da clínica no lote.
- **Registro ANS da Operadora:**
  Código numérico de 6 dígitos que identifica a operadora de plano de saúde perante a agência reguladora.
- **Protocolo de Recebimento:**
  Número de comprovante que o portal da operadora gera quando a clínica faz o upload com sucesso do arquivo XML de lote. É a prova jurídica de entrega da conta.
- **Demonstrativo de Análise da Conta (Retorno):**
  Relatório eletrônico emitido pela operadora após auditar as contas, discriminando o que foi aprovado para pagamento, o que foi glosado e o motivo de cada corte.
- **Competência:**
  O mês/ano de referência dos atendimentos realizados (exemplo: Competência 09/2026).
- **Carência:**
  Tempo previsto em contrato que o paciente precisa esperar após assinar o plano antes de ter direito a usar determinadas consultas, terapias ou cirurgias.
- **Reembolso:**
  Quando o paciente é atendido na modalidade particular e recebe da clínica nota fiscal e recibo detalhados para pedir o dinheiro de volta diretamente à operadora dele.

> ### Resumo da Seção em 3 Linhas:
> 1. TISS é a estrutura de dados (XML); TUSS é o catálogo de códigos dos procedimentos médicos.
> 2. Glosa é a recusa de pagamento; Recurso de glosa é a contestação da clínica para reaver o valor.
> 3. Elegibilidade, autorização, CBO e CNES corretos são os escudos anti-glosa fundamentais.

---

## 3. O FLUXO COMPLETO: DO CREDENCIAMENTO AO REPASSE MÉDICO

O ciclo de vida do faturamento em saúde suplementar compreende 8 etapas sequenciais:

```
[1. Credenciamento] ──> [2. Cadastro no CliniGO] ──> [3. Agendamento e Elegibilidade]
        │
        ▼
[4. Atendimento e Comprovação] ──> [5. Emissão da Guia TISS] ──> [6. Fechamento do Lote XML]
        │
        ▼
[7. Envio e Retorno com Conciliação] ──> [8. Recurso de Glosa e Repasse Médico]
```

A seguir, cada etapa é detalhada com seus atores, canais de contato e o **caminho exato de cliques no CliniGO**:

### Etapa 1: Credenciamento da Clínica na Operadora
- **O que é:** A clínica negocia com a operadora de saúde um contrato para atender seus clientes, estabelecendo o código do prestador, a tabela de preços e os prazos de pagamento.
- **Quem faz:** Diretoria da clínica e setor de credenciamento da operadora.
- **Com quem falar na operadora:** Setor de Credenciamento e Relacionamento com Prestadores.
- **No CliniGO:** Etapa comercial prévia à parametrização do software.

### Etapa 2: Parametrização Cadastral
- **O que é:** Cadastrar a operadora, os planos, as regras de autorização, os dados profissionais (CBO, Conselho) e a tabela de preços negociada.
- **Quem faz:** Administrador da clínica ou faturista.
- **Caminho exato no CliniGO:**
  1. Menu lateral `Convênios` -> Aba `Operadoras` -> Botão `Nova Operadora`.
  2. Menu lateral `Convênios` -> Aba `Planos` -> Botão `Novo Plano`.
  3. Menu lateral `Convênios` -> Aba `Tabela de Preços e TUSS` -> Botão `Novo Preço / Procedimento` (ou `Importar TUSS`).
  4. Menu lateral `Configurações` -> `Profissionais` -> Editar Médico -> Preencher `CRM/Conselho`, `UF` e `CBO`.

### Etapa 3: Agendamento e Checagem de Elegibilidade
- **O que é:** Marcar a consulta do paciente pelo convênio, conferindo número da carteirinha, validade e titularidade.
- **Quem faz:** Recepcionista.
- **Caminho exato no CliniGO:**
  1. Menu lateral `Recepção` -> `Agenda` -> Botão `Novo Agendamento`.
  2. Selecionar Paciente -> Tipo de Pagamento `Convênio` -> Selecionar Operadora e Plano.
  3. Preencher carteirinha e data de validade.
  4. (Opcional) Menu lateral `Convênios` -> Aba `Elegibilidade` -> Informar dados e clicar em `Verificar Elegibilidade`. O sistema confere as regras internas e registra log de conferência manual no portal.

### Etapa 4: Atendimento e Comprovação Presencial/Digital
- **O que é:** O profissional realiza a consulta ou terapia e registra a evolução clínica no prontuário. A comprovação de presença é colhida via assinatura ou biometria.
- **Quem faz:** Médico, psicólogo ou terapeuta.
- **Caminho exato no CliniGO:**
  1. Menu lateral `Consultas` (ou `Atendimentos`) -> Clicar em `Ver` / `Iniciar Atendimento`.
  2. Preencher a evolução clínica e salvar o prontuário.
  3. O atendimento muda automaticamente para o status `Concluído` (`COMPLETED`).

### Etapa 5: Emissão da Guia TISS (Unitária ou em Lote)
- **O que é:** A geração da guia oficial TISS pré-preenchida com dados do paciente, operadora, médico, código TUSS e autorização, protegida contra duplicidade.
- **Quem faz:** Recepcionista ou faturista.
- **Caminho exato no CliniGO:**
  - *Opção A (Individual no atendimento):* Menu lateral `Consultas` -> Aba `Concluídas` -> No card do atendimento, clicar no botão verde `Gerar Guia TISS`.
  - *Opção B (Em massa para o mês inteiro):* Menu lateral `Consultas` -> Botão superior `Gerar Guias TISS do Período` -> Informar Data Inicial, Data Final, Operadora -> Clicar em `Gerar Guias`.

### Etapa 6: Fechamento do Lote TISS e Download do XML
- **O que é:** Agrupamento de todas as guias emitidas para aquela operadora na competência, validação do checklist anti-glosa e geração do arquivo XML com cálculo de Hash MD5 da ANS.
- **Quem faz:** Faturista.
- **Caminho exato no CliniGO:**
  1. Menu lateral `Faturamento TISS` (ou `TISS`) -> Aba `Lotes`.
  2. Botão `Novo Lote` -> Selecionar Operadora e Período -> Clicar em `Criar Lote`.
  3. Na listagem de lotes, clicar sobre o lote criado -> Clicar em `Validar Lote` (audita erros cadastrais).
  4. Clicar em `Gerar XML`. O CliniGO compila o XML no padrão TISS 04.01.00 ou 03.05.00 e gera o botão `Download XML`.

### Etapa 7: Envio no Portal da Operadora e Registro de Protocolo
- **O que é:** O faturista acessa o portal web da operadora (ex: Portal Unimed, Orizon, Bradesco Saúde), anexa o XML baixado, envia e obtém o número de protocolo gerado pela operadora.
- **Quem faz:** Faturista.
- **Caminho exato no CliniGO:**
  1. Acessar o portal externo da operadora e fazer o upload do arquivo XML.
  2. Copiar o número de protocolo de recebimento emitido pelo portal.
  3. No CliniGO, na tela do lote (`TISS` -> `Lotes` -> `Detalhes do Lote`), clicar em `Marcar como Enviado`.
  4. Informar o número do protocolo da operadora. O status do lote avança para `SUBMITTED`.

### Etapa 8: Importação do Demonstrativo de Retorno, Glosas e Conciliação
- **O que é:** Após a análise das contas pela operadora, ela disponibiliza o demonstrativo de retorno. O CliniGO importa o arquivo (XML ou CSV), faz o casamento com as guias, liquida as guias aprovadas no financeiro e registra as glosas com os motivos ANS.
- **Quem faz:** Faturista ou Gestor Financeiro.
- **Caminho exato no CliniGO:**
  1. Menu lateral `TISS` -> `Lotes` -> Clicar sobre o lote enviado.
  2. Clicar no botão `Importar Retorno` -> Arraste o arquivo XML ou CSV recebido da operadora.
  3. O CliniGO processa o retorno, altera o status das guias para `PAID` ou `GLOSADA`, grava as entradas financeiras conciliadas e gera os alertas de glosa.

> ### Resumo da Seção em 3 Linhas:
> 1. O fluxo conecta cadastro -> agenda -> atendimento -> emissão de guia -> lote XML.
> 2. O faturista baixa o XML validado do CliniGO e sobe no portal da operadora, guardando o protocolo.
> 3. O retorno da operadora é importado no CliniGO, que concilia valores pagos e identifica glosas automaticamente.

---

## 4. GLOSAS A FUNDO: O QUE SÃO, COMO EVITAR E COMO RECORRER

### O que é uma Glosa e por que ela acontece?
A glosa é a retenção do dinheiro da clínica. Existem duas naturezas de glosa:

1. **Glosas Administrativas (80% dos casos):**
   Erros simples de dados provocados por falta de conferência cadastral.
   - *Carteirinha inválida, vencida ou digitada com dígito trocado.*
   - *Procedimento realizado sem senha de autorização prévia.*
   - *Código de ocupação (CBO) ou conselho profissional incompatível com o procedimento.*
   - *Guia duplicada (enviada duas vezes no mesmo lote ou em lotes anteriores).*
   - *Faturamento enviado fora da data de corte estipulada pela operadora.*
2. **Glosas Técnicas (20% dos casos):**
   Questionamento realizado pela auditoria médica/terapêutica da operadora sobre a necessidade do tratamento.
   - *Quantidade de sessões de terapia superior às diretrizes de utilização da ANS.*
   - *Falta de laudo justificativo ou relatório de evolução detalhado.*
   - *Especialidade não coberta pelo plano contratado.*

### Catálogo de Motivos Oficiais da ANS no CliniGO
A ANS padronizou códigos para cada motivo de glosa. O CliniGO armazena o catálogo oficial ANS (tabela `tiss_glosa_reasons_ans`). Exemplos reais:
- Código `1001`: Número da carteira do beneficiário inválido.
- Código `1302`: Procedimento não coberto pelo plano.
- Código `1701`: Procedimento exige autorização prévia da operadora.
- Código `1805`: Prazo de envio da guia expirado.
- Código `2503`: Cobrança em duplicidade.

### Como Evitar Glosas (As Travas Anti-Glosa do CliniGO)
O CliniGO atua de forma preventiva antes que a conta saia da clínica:
- **Verificação de validade da carteirinha:** alerta no agendamento se a data de validade estiver expirada.
- **Travamento anti-duplicidade:** índice exclusivo que impede emitir duas guias para a mesma consulta e mesmo procedimento.
- **Validação de autorização:** alerta imediato se o código TUSS exigir autorização e o campo de senha estiver vazio.
- **Validação cadastral de médicos:** checa presença de CRM, UF e CBO antes de permitir incluir a guia no lote XML.

### Como Recorrer de uma Glosa no CliniGO
Toda operadora é obrigada por lei a permitir recurso de glosa.
1. No menu `TISS` -> `Glosas`, localize as guias com valor glosado.
2. Clique em `Contestar Glosa`.
3. Selecione o motivo oficial da ANS e a justificativa técnica.
4. Anexe os comprovantes (laudo médico, cópia da autorização, protocolo de agendamento).
5. O CliniGO marca a guia como `IN_APPEAL` (Em Recurso) e calcula o prazo limite de recurso com base no contrato da operadora.
6. Quando a operadora responder, marque o recurso como `Acatado` (valor recuperado e enviado ao caixa) ou `Mantido` (perda definitiva).

> ### Resumo da Seção em 3 Linhas:
> 1. A maioria das glosas decorre de erros administrativos de digitação, carteirinha ou falta de senha.
> 2. O CliniGO possui travas anti-glosa que barram erros cadastrais antes da geração do XML.
> 3. O módulo de Recursos de Glosa organiza prazos, anexos e motivos da ANS para reaver pagamentos retidos.

---

## 5. REPASSE MÉDICO A FUNDO: REGRAS E EXEMPLO NUMÉRICO COMPLETO

O repasse é a divisão do dinheiro dos atendimentos entre a clínica e os profissionais de saúde (médicos, psicólogos, fonoaudiólogos, terapeutas).

### Os Dois Regimes de Repasse

1. **Regime por PRODUÇÃO (Padrão de mercado em clínicas privadas):**
   O profissional recebe pelo simples fato de ter realizado o atendimento na competência, independentemente de a operadora de plano de saúde já ter pago a conta à clínica.
2. **Regime por RECEBIMENTO (Fluxo de caixa protegido):**
   O profissional só tem seu repasse liberado na folha após a operadora do convênio efetivamente liquidar o lote e o dinheiro cair na conta bancária da clínica. Se a guia estiver pendente de pagamento na operadora, o repasse daquela linha fica retido temporariamente.

### As Três Políticas de Glosa Configuráveis

Quando uma guia de convênio sofre glosa definitiva mantida pela operadora:
- **CLINICA_ABSORVE (Padrão CliniGO):** A clínica assume o prejuízo da glosa. O profissional não tem desconto em sua remuneração.
- **DESCONTA_PROFISSIONAL:** A clínica desconta do repasse do profissional o valor proporcional à taxa médica dele sobre a parte glosada.
- **DESCONTA_SE_MANTIDA:** Enquanto a clínica estiver recorrendo da glosa perante a operadora, o repasse não é descontado. Se o recurso for negado em definitivo, o estorno é aplicado na folha subsequente.

### Regra de Precedência de Valores do CliniGO
Ao calcular o valor base de cada atendimento, o CliniGO aplica a seguinte ordem de prioridade:
1. **Precedência 1 (Override por Paciente):** Valor fixo ou percentual acordado entre médico e paciente específico (`doctor_patient_rates`).
2. **Precedência 2 (Contrato Médico-Clínica):** Percentual contratual geral do profissional para a modalidade convênio (`doctor_contracts`).
3. **Precedência 3 (Fallback Padrão do Sistema):** Percentual cadastrado no perfil do profissional, ou fallback padrão (70% para particular e 60% para convênio quando não configurado).

### Exemplo Numérico Passo a Passo (Para Explicar ao Cliente)

Suponha a seguinte situação real:
- **Dra. Mariana (Psicóloga):** Contrato de 60% de repasse sobre atendimentos de convênio.
- **Clínica:** Configurada no regime `RECEBIMENTO`, com política de glosa `DESCONTA_PROFISSIONAL`.
- **Atendimento 1 (Particular):** Consulta de R$ 200,00.
- **Atendimento 2 (Convênio Unimed):** Sessão de psicologia de R$ 100,00 (TUSS 50000560).
  - Status na operadora: Guia aprovada e paga 100% no demonstrativo.
- **Atendimento 3 (Convênio Bradesco):** Sessão de psicologia de R$ 100,00 (TUSS 50000560).
  - Status na operadora: Guia pendente de pagamento (lote ainda em análise).
- **Atendimento 4 (Convênio SulAmérica):** Sessão de psicologia de R$ 100,00.
  - Status na operadora: Paga parcialmente em R$ 60,00, com glosa de R$ 40,00.

**Demonstrativo de Fechamento do Repasse da Dra. Mariana:**
- *Atendimento 1 (Particular):* 60% de R$ 200,00 = **R$ 120,00 liberados** imediatamente.
- *Atendimento 2 (Convênio Unimed):* Guia 100% liquidada = 60% de R$ 100,00 = **R$ 60,00 liberados**.
- *Atendimento 3 (Convênio Bradesco):* Como o regime é `RECEBIMENTO` e a operadora ainda não pagou, o repasse é **R$ 0,00 nesta competência** (o valor fica acumulado para a competência em que o lote for pago).
- *Atendimento 4 (Convênio SulAmérica):* Operadora pagou R$ 60,00 e glosou R$ 40,00. A política desconta proporcional da médica:
  - Repasse calculado sobre o valor pago: 60% de R$ 60,00 = **R$ 36,00 liberados**.
- **Total Líquido a Repassar à Dra. Mariana:** R$ 120,00 + R$ 60,00 + R$ 0,00 + R$ 36,00 = **R$ 216,00**.

### Sigilo Médico e LGPD Invioláveis
Por determinação de sigilo médico e proteção comercial, quando a Dra. Mariana faz login no CliniGO e abre sua tela de produção (`/dashboard/meu-financeiro/producao`), ela:
- **VÊ:** A data do atendimento, o nome do paciente, a quantidade de sessões e o valor do seu repasse em Reais (R$).
- **NÃO VÊ (Bloqueio estrito no servidor):** O nome da operadora de saúde, o plano do paciente, o número da carteirinha nem os dados ou valores de outros profissionais da clínica.

> ### Resumo da Seção em 3 Linhas:
> 1. O CliniGO opera em dois regimes: Produção (recebe pelo atendimento) ou Recebimento (só recebe após a operadora pagar).
> 2. Políticas de glosa flexíveis decidem se a clínica absorve o corte ou se desconta proporcional do médico.
> 3. O painel do médico é estritamente sigiloso: exibe o valor do repasse, mas nunca dados de planos ou carteirinhas.

---

## 6. TABELA: O QUE A CLÍNICA ENVIA E O QUE A CLÍNICA RECEBE

| Etapa | O que a Clínica Envia à Operadora | O que a Clínica Recebe da Operadora | Onde fica no CliniGO |
|---|---|---|---|
| **Elegibilidade** | Número da carteira do paciente, data de nascimento e identificação do prestador | Confirmação de beneficiário ativo ou recusa (cancelado/carência) | `Convênios` -> Aba `Elegibilidade` |
| **Autorização** | Pedido de sessão/procedimento com justificativa médica e código TUSS | Senha de autorização, validade e quantidade de sessões aprovadas | `TISS` -> `Autorizações` |
| **Faturamento Mensal** | Arquivo eletrônico de lote XML padronizado TISS (assinado com Hash MD5) | Protocolo digital de recebimento de lote | `TISS` -> `Lotes` -> `Download XML` |
| **Processamento** | Resposta a eventuais pedidos de esclarecimento da auditoria médica | Demonstrativo de Análise da Conta (XML ou relatório de conciliação) | `TISS` -> `Lotes` -> `Importar Retorno` |
| **Recurso de Glosa** | Guia de recurso de glosa fundamentada com documentos anexos | Demonstrativo de Análise de Recurso (Acatado com depósito ou Mantido) | `TISS` -> `Glosas` -> `Contestar Glosa` |

---

## 7. COM QUEM FALAR NA OPERADORA POR ASSUNTO

Quando o dono da clínica perguntar "quem resolve isso?", use esta tabela para orientá-lo com firmeza:

| Assunto / Problema | Departamento na Operadora | Quando Acionar | Canal Típico |
|---|---|---|---|
| **Contrato e Preços** | Setor de Credenciamento / Relacionamento | Ao abrir a clínica, renovar contrato anual ou reajustar valores da tabela TUSS | E-mail corporativo e reuniões formais |
| **Senha / Token Travado** | Central de Autorizações Prévia | Quando o paciente chega na clínica e a autorização de sessão não libera no portal | Portal web da operadora ou 0800 do prestador |
| **Arquivo XML Rejeitado** | Suporte TISS / TI de Integração | Quando o portal acusa erro de schema XML ou versão de TISS inválida | E-mail do suporte TISS da operadora |
| **Glosas Indevidas** | Auditoria Médica / Contas Médicas | Quando o demonstrativo de retorno corta procedimentos realizados corretamente | Módulo de Recursos de Glosa no portal web |
| **Pagamento Atrasado** | Financeiro / Tesouraria | Quando o lote foi protocolado e a data de pagamento prevista no contrato expirou | Central telefônica do prestador |
| **Abusos e Descumprimentos** | Ouvidoria da Operadora / ANS | Se a operadora reter pagamentos sem justificativa ou violar prazos legais | Canal eletrônico da ANS (Disque ANS 0800 701 9656) |

---

## 8. ROTEIRO DE DEMONSTRAÇÃO COMERCIAL DE 30 MINUTOS

Utilize este roteiro minuto a minuto para encantar diretores de clínicas em demonstrações comerciais:

- **Minuto 0 a 5 — Conexão e Contexto de Negócio:**
  "Doutor, todo gestor de clínica enfrenta três grandes dores com convênios: o tempo perdido digitando guias no fim do mês, o prejuízo das glosas que ninguém sabe por que aconteceram e a dor de cabeça de fechar o repasse dos médicos. O CliniGO resolve exatamente essa cadeia."
- **Minuto 5 a 10 — Cadastro de Operadoras e Tabela TUSS:**
  1. Abra o CliniGO na tela `Convênios`.
  2. Mostre as abas `Operadoras`, `Planos` e clique em `Tabela de Preços e TUSS`.
  3. Demonstre o autocomplete: digite "Consulta" ou "50000012" e mostre como o código TUSS oficial e o valor negociado ficam vinculados à operadora.
  4. Mostre o botão `Importar TUSS` para grandes tabelas.
- **Minuto 10 a 15 — Agendamento Inteligente e Emissão Automática de Guia:**
  1. Vá para `Consultas` (ou `Recepção` -> `Agenda`).
  2. Mostre um atendimento com status `Concluído`.
  3. Clique no botão verde `Gerar Guia TISS`.
  4. Mostre que o CliniGO puxou automaticamente: paciente, carteirinha, médico credenciado com CBO, código TUSS e valor contratado.
  5. Destaque: "Se o recepcionista esquecer a senha ou a carteirinha estiver vencida, o sistema avisa na hora (anti-glosa)."
  6. Mostre o botão `Gerar Guias TISS do Período`: "Com um único clique no fim do mês, o CliniGO gera todas as 300 guias pendentes de uma só vez."
- **Minuto 15 a 20 — Fechamento do Lote e Geração do XML TISS:**
  1. Vá para `Faturamento TISS` -> `Lotes`.
  2. Mostre o lote fechado para a operadora (ex: Unimed).
  3. Clique em `Validar Lote` e depois em `Download XML`.
  4. Explique: "Aqui está o arquivo eletrônico oficial nos padrões da ANS (com hash de integridade MD5), pronto para o faturista enviar no portal da operadora."
- **Minuto 20 a 25 — Gestão de Glosas e Conciliação Financeira:**
  1. Abra o lote e mostre o botão `Importar Retorno`.
  2. Demonstre como o demonstrativo de retorno atualiza as guias e alimenta o financeiro.
  3. Vá em `TISS` -> `Glosas`: mostre a lista de valores retidos com os códigos oficiais da ANS e clique em `Contestar Glosa` para mostrar o formulário de recurso.
- **Minuto 25 a 30 — O Repasse Médico Perfeito:**
  1. Vá em `Financeiro` -> `Produção` (ou `Meu Financeiro` com perfil médico).
  2. Mostre a flexibilidade: regime por produção ou por recebimento, com cálculo de glosa automático.
  3. Enfatize a segurança jurídica: "O médico nunca vê quanto o convênio pagou à clínica; ele vê apenas o valor justo do repasse dele."
  4. Abra espaço para perguntas do cliente e fechamento comercial.

---

## 9. PERGUNTAS FREQUENTES COMERCIAIS (20 RESPOSTAS HONESTAS)

Baseie suas respostas comerciais com rigor absoluto no código real do CliniGO:

1. **O CliniGO gera o arquivo XML no padrão TISS oficial da ANS?**
   *Resposta:* Sim. O sistema gera os arquivos XML estruturados em total conformidade com os esquemas XSD oficiais da ANS (versões 04.01.00 e 03.05.00), incluindo o cálculo do Hash MD5 de integridade.
2. **O CliniGO envia o arquivo XML diretamente para o portal da Unimed/Bradesco sem eu precisar entrar no portal deles?**
   *Resposta Comercial Honesta:* Não, e nenhum software de mercado faz isso sem credenciamento prévio da sua clínica. A operadora exige que o prestador acesse o portal com login, senha e certificado digital. O CliniGO gera o XML 100% pronto e validado; seu faturista apenas faz o upload no portal e anota o protocolo no CliniGO. A arquitetura para integração por webservice já está pronta no sistema para quando sua clínica obtiver as credenciais de homologação com a operadora.
3. **O sistema verifica se a carteirinha do paciente é válida?**
   *Resposta:* Sim. O CliniGO realiza a validação cadastral interna imediata (formato, data de validade e status do plano) e possui tela para registro e histórico da conferência de elegibilidade.
4. **O sistema tem catálogo de procedimentos TUSS?**
   *Resposta:* Sim. O CliniGO possui busca inteligente de procedimentos TUSS e módulo de importação por planilha para tabelas negociadas específicas da sua clínica.
5. **O que acontece se uma guia for glosada pela operadora?**
   *Resposta:* As glosas são registradas no módulo de Glosas com o código do motivo da ANS, valor glosado e data limite para recurso. Pelo sistema, você anexa os documentos comprobatórios e formaliza a contestação.
6. **O CliniGO consegue gerar guias automaticamente a partir das consultas já realizadas?**
   *Resposta:* Sim. Você pode gerar a guia individual no card da consulta finalizada ou usar a ferramenta de lote para gerar todas as guias pendentes do mês de forma automática.
7. **Existe proteção contra emitir a mesma consulta duas vezes?**
   *Resposta:* Sim. Há trava e restrição de unicidade no banco de dados. O sistema rejeita qualquer tentativa de gerar guia duplicada para o mesmo atendimento e mesmo procedimento.
8. **O médico que atende pelo convênio pode ver o valor que a operadora paga à clínica?**
   *Resposta:* Não. O perfil do médico é protegido por sigilo estrito de dados (RBAC). O profissional visualiza apenas o valor do repasse dele, sem acesso ao nome da operadora, plano, carteirinha ou valores de faturamento da clínica.
9. **O CliniGO suporta repasse quando a clínica só quer pagar o médico depois que o convênio pagar?**
   *Resposta:* Sim. O CliniGO possui os dois regimes: "Por Produção" (paga no mês do atendimento) e "Por Recebimento" (só libera o repasse da guia após a operadora liquidar o lote).
10. **E se a operadora cortar (glosar) o pagamento do médico, a clínica é obrigada a pagar?**
    *Resposta:* É configurável pela clínica. Você pode escolher a política: a clínica absorve o prejuízo, desconta proporcional do médico, ou só desconta se a glosa for mantida após o recurso.
11. **O CliniGO atende terapias multidisciplinares (Psicologia, Fono, TO, Fisio)?**
    *Resposta:* Sim. O sistema suporta emissão de Guia SP/SADT com indicação de sessões, quantidade executada e código CBO específico de cada especialidade terapêutica.
12. **O sistema aceita paciente particular que pede recibo para reembolso no convênio?**
    *Resposta:* Sim. O CliniGO possui a modalidade de atendimento particular com emissão de recibo e demonstrativo contendo todos os dados técnicos exigidos pelas operadoras para ressarcimento do paciente.
13. **O CliniGO importa o arquivo de retorno da operadora?**
    *Resposta:* Sim. Você pode fazer o upload do arquivo de retorno (XML ou planilha CSV). O sistema cruza os números de guias, atualiza o status de pagamento e aponta as divergências e glosas.
14. **Se eu subir o mesmo arquivo de retorno duas vezes, duplica o faturamento?**
    *Resposta:* Não. O sistema calcula a assinatura digital (hash) do arquivo e barra importações repetidas de forma idempotente.
15. **Como o CliniGO ajuda a evitar glosas?**
    *Resposta:* Ele possui um checklist anti-glosa que confere data de validade da carteirinha, exigência de senha de autorização, integridade do CBO do médico e unicidade da guia antes de permitir fechar o lote.
16. **O sistema funciona em celular e tablet?**
    *Resposta:* Sim. Todas as telas seguem o padrão responsivo PWA, permitindo acompanhar o faturamento e as consultas em qualquer dispositivo móvel.
17. **O CliniGO possui emissão de Guia de Consulta e Guia de SP/SADT?**
    *Resposta:* Sim. Ambas estão suportadas conforme as normas vigentes da ANS.
18. **O que é o Hash do lote TISS?**
    *Resposta:* É uma chave criptográfica MD5 que a ANS exige ao final de cada arquivo XML. O CliniGO calcula esse hash automaticamente garantindo que o arquivo não foi corrompido.
19. **O faturamento de uma clínica pode vazar para outra clínica no sistema?**
    *Resposta:* Não. O CliniGO opera com isolamento multi-tenant rígido no nível do banco de dados (Row Level Security por `clinic_id`). Cada clínica acessa exclusivamente seus próprios lotes, guias e configurações.
20. **Preciso de um computador potente para rodar o CliniGO?**
    *Resposta:* Não. O CliniGO é 100% em nuvem. Qualquer computador, notebook ou tablet com navegador moderno e acesso à internet funciona com velocidade máxima.

---

## 10. MATRIZ COMERCIAL HONESTA (ESTADO REAL DE IMPLEMENTAÇÃO)

> NOTA TÉCNICA E AUDITORIA: NENHUM teste de interface em navegador (browser) foi executado. Todas as validações foram realizadas exclusivamente via código, compilador e suíte automatizada de testes Jest/Node.

| Recurso / Funcionalidade | Status Real | Como Apresentar ao Cliente | O que NÃO Pode Afirmar |
|---|---|---|---|
| **4.1.1 Geração de Guias TISS** | Implementado com prova (`__tests__/tiss/guide-types-and-therapies.test.ts`) | "Gera guias de Consulta e SP/SADT a partir das consultas, checando CBO, CRM e saldo de sessões." | Não diga que emite guias de internação hospitalar cirúrgica complexa ou quimioterapia/radioterapia. |
| **4.1.2 Catálogo TUSS e Tabela de Preços** | Parcial (precificação pronta; catálogo ANS oficial pendente de importação) | "Estrutura de precificação por operadora e importação CSV prontas; o catálogo inicial requer carga da planilha oficial da ANS." | Não afirmar que a tabela TUSS completa já vem embutida e certificada sem que o cliente importe a planilha oficial. |
| **4.1.3 Retorno/Conciliação e 4.2.G** | Implementado, testado só com dados sintéticos e em memória (`__tests__/tiss/return-parse-and-conciliation.test.ts`, `__tests__/tiss/tiss-undo-financial.test.ts`) | "Processa demonstrativos em XML TISS e planilhas CSV com baixa contábil e botão de desfazimento atômico (UNDO)." | Validar com arquivo real e em banco real antes de uso massivo em produção. |
| **4.1.4 Envio de Lotes** | Manual com Protocolo | "O sistema gera o arquivo XML pronto para o faturista enviar no portal da operadora e registrar o comprovante/protocolo e canal." | NUNCA diga que o sistema envia sozinho por webservice sem login no portal da operadora. |
| **4.1.5 Elegibilidade de Pacientes** | Parcial (conferência cadastral interna; sem consulta online) | "Conferência cadastral interna de validade da carteirinha e dados no ato do agendamento." | Não possui consulta online em tempo real via webservice com operadoras. |
| **4.1.6 Repasse por Recebimento e Glosas** | Implementado e testado numericamente (`__tests__/financial/repasse-regression.test.ts`, `__tests__/financial/repasse-convenio-glosas.test.ts`); falta teste com banco real | "Repasse por produção ou por recebimento, com políticas de absorção ou desconto de glosa e retrocompatibilidade estrita." | Não prometa cálculo retroativo para meses anteriores à alteração da regra. |
| **4.2.A Saldo de Sessões** | Implementado com prova (`__tests__/tiss/session-balance.test.ts`) | "Controle de saldo com incremento na emissão, devolução no cancelamento e alerta de esgotamento." | Não faz autorização online automática junto à operadora. |
| **4.2.B Checklist Anti-Glosa** | Implementado com prova (`__tests__/tiss/tiss-validator.test.ts`) | "Verificação prévia de CBO, CRM, validade de carteirinha, código de autorização e saldo." | Não garante deferimento do lote pela auditoria médica da operadora. |
| **4.2.C Prazo de Corte Automático** | Não implementado | "Campos cadastrais de dia de corte disponíveis na operadora, mas o controle de envio é manual pelo faturista." | Não possui robô de fechamento automático de lote na data de corte. |
| **4.2.D Ciclo de Vida de Guias e Lotes** | Implementado com prova (`__tests__/tiss/tiss-undo-financial.test.ts`) | "Máquina de estados completa para guias e lotes (Rascunho, Gerado, Enviado, Pago, Glosado, Cancelado)." | Não cobre fluxos de internação hospitalar. |
| **4.2.E Catálogo e Recursos de Glosa** | Implementado com prova (`__tests__/tiss/tiss-glosa-appeal.test.ts`) | "Painel para registrar motivos da ANS, anexar documentos e gerenciar prazos de contestação." | Não garante que o recurso será acatado pela operadora. |
| **4.2.F Coparticipação no Caixa** | Não implementado | "Coluna de coparticipação no schema de banco de dados, sem integração com frente de caixa nesta versão." | Não afirme que baixa automaticamente coparticipação no caixa da recepção. |
| **4.2.H Indicadores Avançados / Aging** | Não implementado | "Métricas básicas operacionais no painel TISS; relatórios avançados de aging de glosas não disponíveis nesta versão." | Não prometa gráficos preditivos de aging financeiro de convênios. |
| **4.2.I Comprovação por Biometria na Guia** | Não implementado | "Biometria e termos funcionam no prontuário, mas não bloqueiam nem são anexados automaticamente ao XML TISS." | Não prometa integração biométrica direta com o portal da operadora. |
| **4.2.J Trilha de Auditoria** | Implementado com prova (`__tests__/security/doctor-handler-privacy.test.ts`, `__tests__/tiss/session-balance.test.ts`) | "Logs de auditoria em `audit_logs` para criação de guias, desfazimento de retorno e alteração de regras de repasse." | Não cobre logs de visualização passiva (apenas mutações). |
| **4.2.K Sigilo Médico e RBAC** | Implementado com prova (`__tests__/security/tiss-doctor-block.test.ts`) | "Médico não visualiza dados de faturamento, dados de operadoras nem valores de outros profissionais." | NENHUM teste de navegador foi realizado; validação comprovada via testes automatizados de handlers e rotas. |
| **4.2.L Modalidade Ambos com Faturamento** | Não implementado | "Cadastro de pacientes suporta Ambos (Particular/Convênio), mas o split financeiro automático na guia TISS não está implementado." | Não prometa emissão de guia e recibo simultâneos com 1 clique. |
| **4.2.M Padrão TISS/Hash/XSD** | Parcial (hash em modo legado por padrão; modo ANS não validado; validação XSD estrutural) | "Exporta XML com validação estrutural simplificada e hash padrão legado SHA-256 JSON (com modo ANS MD5 canônico sob configuração de clínica)." | NÃO afirmar que o XML foi validado contra XSD oficial da ANS nem que o hash é homologado sem arquivos oficiais da operadora. |
| **4.2.N Terapias Multidisciplinares em SP/SADT** | Implementado com prova (`__tests__/tiss/guide-types-and-therapies.test.ts`) | "Direcionamento automático de terapias para guia SP/SADT com validação de CBO e conselho profissional." | Não emite guias com múltiplos profissionais executantes no mesmo procedimento. |

---

## 11. CHECKLIST DE PRÉ-DEMONSTRAÇÃO

Antes de iniciar qualquer reunião com um cliente potencial, verifique esta lista de preparação (5 minutos):

- [ ] Certifique-se de que há pelo menos uma operadora cadastrada (ex: "Unimed") e um plano ativo.
- [ ] Cadastre ao menos 2 procedimentos na `Tabela de Preços e TUSS` (ex: 10101012 para Consulta em consultório por R$ 120,00).
- [ ] Garanta que existe 1 paciente cadastrado com carteirinha e data de validade futura.
- [ ] Verifique se o médico de teste possui CRM, UF e CBO preenchidos no cadastro.
- [ ] Tenha 1 atendimento com status `Concluído` pronto na tela de Consultas para clicar no botão `Gerar Guia TISS`.
- [ ] Deixe aberta a aba de `Lotes` para mostrar o download do arquivo XML.
- [ ] Evite abrir ferramentas de desenvolvedor, telas de configuração técnica ou logs de servidor.
- [ ] Lembre-se: Jamais prometa integrações automáticas sem homologação com a operadora.

---

## 12. PLANO DE ESTUDO EM 5 DIAS E TESTE DE CONHECIMENTO

### O que Estudar por Dia

- **Dia 1 (Conceitos Básicos):** Leia as Seções 1 e 2 deste guia. Memorize os 4 personagens e o significado de TISS, TUSS, Guia, Lote e Glosa.
- **Dia 2 (O Fluxo Real):** Estude a Seção 3. Abra o CliniGO e clique em cada uma das telas listadas no caminho exato de cliques.
- **Dia 3 (Glosas e Recursos):** Estude a Seção 4 e a Seção 6. Compreenda por que as glosas acontecem e como a clínica se defende.
- **Dia 4 (Repasse e Sigilo):** Estude a Seção 5. Refaça o exemplo numérico da Dra. Mariana com papel e caneta até ter certeza do cálculo.
- **Dia 5 (Vendas e Simulação):** Estude as Seções 8, 9 e 10. Treine a apresentação de 30 minutos em voz alta simulando uma reunião.

---

### Mini-Teste de Conhecimento (15 Perguntas com Gabarito)

1. *Qual a diferença entre TISS e TUSS?*
2. *O que é uma glosa administrativa? Dê dois exemplos.*
3. *Por que o CliniGO não faz envio automático por webservice para todas as operadoras de forma direta sem intervenção humana?*
4. *Qual a diferença entre o regime de repasse por PRODUÇÃO e por RECEBIMENTO?*
5. *Em qual regime de repasse o fluxo de caixa da clínica fica mais protegido?*
6. *O médico cadastrado na clínica pode ver os dados da operadora e da carteirinha do paciente no extrato dele? Por quê?*
7. *Para que serve o Hash MD5 em um lote TISS?*
8. *O que é o CBO e por que ele é obrigatório na emissão da guia?*
9. *O que o CliniGO faz se o usuário tentar gerar duas guias para o mesmo atendimento e mesmo procedimento?*
10. *Qual é a primeira regra de precedência de valores no repasse do CliniGO?*
11. *O que significa a política de glosa `CLINICA_ABSORVE`?*
12. *Como a recepcionista pode gerar guias de vários atendimentos realizados no mês sem precisar abrir consulta por consulta?*
13. *O que a clínica recebe da operadora após enviar o XML de faturamento?*
14. *Em caso de divergência de valores no pagamento do convênio, qual recurso a clínica deve utilizar?*
15. *Qual órgão regulamenta o padrão TISS no Brasil?*

---

### Gabarito do Teste

1. **TISS** é o modelo de comunicação e estrutura de dados (padrão XML); **TUSS** é a tabela oficial de códigos numéricos de 8 dígitos de procedimentos médicos da ANS.
2. É a recusa de pagamento decorrente de erros burocráticos ou de digitação. Exemplos: carteirinha vencida e falta de senha de autorização prévia.
3. Porque a integração direta por webservice exige contrato formal prévio, credenciais privadas e homologação técnica de cada operadora com cada clínica específica.
4. Na **Produção**, o profissional recebe pelo atendimento realizado; no **Recebimento**, ele só recebe após a operadora pagar a conta à clínica.
5. No regime por **Recebimento**, pois a clínica não desembolsa recursos antes de o dinheiro entrar em seu caixa.
6. Não. Ele é bloqueado por sigilo médico, proteção concorrencial e LGPD.
7. É a assinatura de integridade digital que garante que o arquivo XML não foi adulterado após ser gerado.
8. É a Classificação Brasileira de Ocupações. É obrigatório porque comprova que o profissional possui a formação exigida para faturar aquele procedimento TUSS.
9. O sistema bloqueia a criação por uma restrição única no banco de dados, emitindo aviso de duplicidade.
10. A taxa customizada entre o médico e o paciente específico (`doctor_patient_rates`).
11. Significa que a clínica arca com a perda financeira da glosa e paga o profissional integralmente.
12. Clicando no botão `Gerar Guias TISS do Período` no topo da tela de Consultas.
13. O número de protocolo eletrônico de recebimento de lote.
14. O Recurso de Glosa formal fundamentado com documentos anexos.
15. A **ANS (Agência Nacional de Saúde Suplementar)**.

---
*Fim do Guia Didático de Convênios, TISS, Glosas e Repasse CliniGO.*
