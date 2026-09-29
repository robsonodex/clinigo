# Guia Pratico de Validacao de Hash TISS e Esquemas XSD da ANS

> Documento destinado ao proprietario e administradores tecnicos do CliniGO.
> Data: 29/09/2026

---

## 1. Por que este documento existe?

O sistema CliniGO possui dois modos de geracao de hash para lotes TISS:
1. **LEGACY_SHA256_JSON (Padrao de Seguranca Ativo):** Gera um hash SHA-256 de 64 caracteres. Este modo e mantido por padrao para todas as clinicas existentes para nao quebrar rotinas operacionais ou historico ja faturado.
2. **ANS_MD5_CANONICAL (Modo Experimental):** Gera um hash MD5 de 32 caracteres a partir do texto XML higienizado, aproximando-se da regra teorica da ANS.

**Fato Crucial:**
Nenhum algoritmo MD5 canonico implementado em codigo pode ser considerado "homologado pela ANS" sem que:
- Tenha sido testado com um vetor de teste oficial fornecido pela ANS, OU
- Um arquivo XML de lote real tenha sido enviado ao portal de uma operadora de saude (ex: Unimed, Bradesco, Amil, SulAmerica) e aceito pelo validador TISS dela sem rejeicao do hash.

Alem disso, o validador interno de XML do sistema hoje opera atraves de um **Adaptador de Validacao** (`TissXsdAdapter`):
- **Modo ESTRUTURAL (Ativo por padrao):** Realiza validacao estrutural e semantica por codigo (conferencia de campos obrigatorios, datas e formatos), exibindo o aviso "Validacao estrutural simplificada (nao substitui a validacao oficial da operadora)".
- **Modo XSD_OFICIAL:** E ativado automaticamente assim que os arquivos `.xsd` oficiais forem depositados na pasta `lib/services/tiss/schemas/`.

---

## 2. Como Descobrir Qual Modo Sua Operadora Aceita

Para descobrir com 100% de certeza qual algoritmo a operadora da sua clinica exige no portal de envio:

1. **Gere o mesmo lote de teste nos dois modos:**
   - Crie um lote de teste pequeno (1 a 3 guias).
   - No modo padrao (`LEGACY_SHA256_JSON`), gere o XML e salve como `lote_teste_sha256.xml`.
   - Nas configuracoes da clinica, alterne para `ANS_MD5_CANONICAL`, gere o XML e salve como `lote_teste_md5.xml`.
2. **Submeta ambos ao ambiente de homologacao / validador da operadora:**
   - Faca o upload do `lote_teste_sha256.xml` no validador/portal da operadora.
   - Faca o upload do `lote_teste_md5.xml` no validador/portal da operadora.
3. **Compare o retorno da operadora:**
   - Se o portal rejeitar o hash de 64 caracteres com erro tipo "Tamanho do hash invalido (esperado 32)" ou "Schema XSD inválido no elemento hash", significa que a operadora valida o schema estrito da ANS e exige hash de 32 caracteres (`ANS_MD5_CANONICAL`).
   - Se o portal aceitar o XML com SHA-256 ou rejeitar o MD5 alegando divergencia de hash canonico, mantenha `LEGACY_SHA256_JSON`.
   - Registre o resultado por operadora (ex: Unimed exige MD5, Bradesco aceita SHA-256).

---

## 3. Se Voce Ja Enviou Lotes Reais Antes, O Que Verificar

Se sua clinica ja gerou e enviou lotes TISS pelo CliniGO no passado que foram aceitos e pagos pela operadora:

1. **Qual operadora aceitou e pagou o lote:**
   - Identifique quais operadoras processaram os lotes com sucesso.
2. **Com qual versao do sistema o lote foi gerado:**
   - Lotes gerados antes de 29/09/2026 utilizaram o modo `LEGACY_SHA256_JSON`. Se a operadora aceitou esses lotes, nao altere a configuracao daquela clinica/operadora.
3. **Qual valor e formato de hash consta no XML aceito:**
   - Abra o arquivo XML do lote aprovado que foi enviado e localize a tag `<ans:hash>` ou `<hash>`.
   - Se o valor contem 64 caracteres hexadecimais, a operadora nao rejeita o modo legado SHA-256.
   - Se o valor contem 32 caracteres, anote a versao e o padrao aceito.
4. **Regra de ouro:** Nunca altere o algoritmo de uma clinica em producao que ja tenha fluxo de faturamento estavel sem antes testar em homologacao.

---

## 4. Passo a Passo: Como Obter e Instalar os Arquivos XSD Oficiais da ANS

Para ativar a validacao formal por XSD no CliniGO:

1. Acesse o portal oficial da ANS:
   - Endereco oficial: `https://www.ans.gov.br/padroes-tiss`
   - Navegue ate a secao da versao TISS utilizada pela sua clinica (ex: **Versao 4.01.00** ou **Versao 4.02.00**).
   - Baixe o pacote compactado `.zip` contendo os **Esquemas XML (XSD)**.

2. Arquivos principais contidos no pacote oficial:
   - `tissV4_01_00.xsd` (ou versao equivalente)
   - `tissComplexTypesV4_01_00.xsd`
   - `tissSimpleTypesV4_01_00.xsd`
   - `tissGuiasV4_01_00.xsd`
   - `tissGlosasV4_01_00.xsd`
   - `xmldsig-core-schema.xsd` (se houver assinatura digital)

3. **Onde colocar os arquivos no repositorio:**
   - Extraia os arquivos `.xsd` dentro da pasta:
     `lib/services/tiss/schemas/`
   - O sistema detectara automaticamente a presenca desses arquivos atraves do `TissXsdAdapter` e ativara o modo `XSD_OFICIAL`, substituindo o modo `ESTRUTURAL`.
