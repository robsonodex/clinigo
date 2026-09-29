# Guia Prático de Validação de Hash TISS e Esquemas XSD da ANS

> Documento destinado ao proprietário e administradores técnicos do CliniGO.
> Data: 29/09/2026

---

## 1. Por que este documento existe?

O sistema CliniGO possui dois modos de geração de hash para lotes TISS:
1. **LEGACY_SHA256_JSON (Padrão de Segurança Ativo):** Gera um hash SHA-256 de 64 caracteres. Este modo é mantido por padrão para todas as clínicas existentes para não quebrar rotinas operacionais ou histórico já faturado.
2. **ANS_MD5_CANONICAL (Modo Experimental):** Gera um hash MD5 de 32 caracteres a partir do texto XML higienizado, aproximando-se da regra teórica da ANS.

**Fato Crucial:**
Nenhum algoritmo MD5 canônico implementado em código pode ser considerado "homologado pela ANS" sem que:
- Tenha sido testado com um vetor de teste oficial fornecido pela ANS, OU
- Um arquivo XML de lote real tenha sido enviado ao portal de uma operadora de saúde (ex: Unimed, Bradesco, Amil, SulAmérica) e aceito pelo validador TISS dela sem rejeição do hash.

Além disso, o validador interno de XML do sistema hoje realiza **validações estruturais por código** (conferência de campos obrigatórios, datas e formatos), e **não validação formal contra os esquemas XSD oficiais da ANS**, pois os arquivos `.xsd` oficiais ainda não foram disponibilizados na pasta do sistema.

---

## 2. Passo a Passo: Como o Dono Valida o Hash com uma Operadora Real

Para ter certeza absoluta de que o modo `ANS_MD5_CANONICAL` é aceito pela operadora da sua clínica:

1. **Acessar a Configuração de Convênios:**
   - No CliniGO, acesse: `Menu Lateral` → `Faturamento TISS / Convênios` → Aba `Configurações`.
   - Selecione a clínica de testes ou clínica piloto.
   - No campo **Algoritmo de Hash do Lote TISS**, alterne de `Padrão Histórico (SHA-256)` para `Padrão ANS (MD5 Canônico)`.
   - Salve a alteração com o aviso de ciência.

2. **Gerar um Lote de Teste Pequeno:**
   - Crie um lote contendo de 1 a 3 guias com atendimentos reais ou de homologação.
   - Clique em **Gerar XML**.
   - Baixe o arquivo `.xml` gerado para o seu computador.

3. **Submeter ao Portal de Testes / Validador da Operadora:**
   - A maioria das operadoras (ex: Portal Unimed, Portal Orizon, Conexão Saúde) possui uma funcionalidade de "Validador de Lote TISS" ou "Ambiente de Testes / Homologação".
   - Faça o upload do arquivo XML gerado.
   - Observe o relatório de processamento:
     - Se o validador informar **"Hash do documento inválido"** ou **"Erro de integridade do arquivo"**, o validador da operadora espera uma regra de canonicalização XML estrita (como C14N ou inclusão/exclusão de nós específicos). Nesse caso, reverta imediatamente o seletor da clínica para `LEGACY_SHA256_JSON` e envie o relatório de erro para a equipe técnica.
     - Se o validador aprovar o lote e validar o hash com sucesso, o algoritmo está homologado para aquela operadora! Envie uma cópia do XML e do comprovante para arquivamento no repositório.

---

## 3. Passo a Passo: Como Obter os Arquivos XSD Oficiais da ANS

Para ativar a validação formal por XSD no CliniGO:

1. Acesse o portal oficial da ANS:
   - Endereço oficial: `https://www.ans.gov.br/padroes-tiss`
   - Navegue até a seção da versão TISS utilizada pela sua clínica (ex: **Versão 4.01.00** ou **Versão 4.02.00**).
   - Baixe o pacote compactado `.zip` contendo os **Esquemas XML (XSD)**.

2. Arquivos principais contidos no pacote oficial:
   - `tissV4_01_00.xsd` (ou versão equivalente)
   - `tissComplexTypesV4_01_00.xsd`
   - `tissSimpleTypesV4_01_00.xsd`
   - `tissGuiasV4_01_00.xsd`
   - `tissGlosasV4_01_00.xsd`
   - `xmldsig-core-schema.xsd` (se houver assinatura digital)

3. **Onde colocar os arquivos no repositório:**
   - Extraia os arquivos `.xsd` dentro da pasta:
     `lib/services/tiss/schemas/`
   - O sistema detectará automaticamente a presença desses arquivos e ativará o validador XSD formal via WASM/JS, complementando a checagem estrutural atual.
