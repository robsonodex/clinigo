# Esquemas Oficiais XSD do Padrão TISS (ANS)

Esta pasta deve conter os arquivos de esquema XML (.xsd) oficiais fornecidos pela Agência Nacional de Saúde Suplementar (ANS).

---

## 1. Arquivos Oficiais Necessários

Faça o download do pacote oficial de esquemas no portal da ANS (https://www.ans.gov.br/padroes-tiss) para a versão desejada (ex: v4.01.00 ou v4.02.00) e posicione os seguintes arquivos nesta pasta:

- `tissV4_01_00.xsd` (Esquema raiz da mensagem TISS)
- `tissComplexTypesV4_01_00.xsd` (Definições de tipos complexos: guias, operadora, prestador)
- `tissSimpleTypesV4_01_00.xsd` (Definições de tipos simples: tamanhos, máscaras, datas, st_hash)
- `tissGuiasV4_01_00.xsd` (Esquema detalhado de guias de consulta, SP/SADT, internação)
- `tissGlosasV4_01_00.xsd` (Esquema de demonstrativos de retorno e justificativas de glosa)
- `xmldsig-core-schema.xsd` (Esquema de assinatura digital padrão W3C)

---

## 2. Comportamento do Validador no CliniGO

- **Quando os arquivos .xsd NÃO estiverem presentes nesta pasta (Estado Atual):**
  O sistema opera automaticamente em modo de **Validação Estrutural Simplificada** (`lib/services/tiss/tiss-xsd-validator.ts`). Essa checagem confere tags obrigatórias, presença de CNES, registro ANS, carteirinha e valores via parser JS, sem exigir bibliotecas binárias de sistema operacional. A interface e a API informam claramente que se trata de uma validação estrutural simplificada e que não substitui a validação da operadora.

- **Quando os arquivos .xsd FOREM inseridos nesta pasta:**
  O sistema ativa a compilação de esquemas via biblioteca JavaScript/WASM pura (compatível com runtime serverless da Vercel / Node.js, sem dependência de módulos C++ nativos como `libxmljs` que quebram em hospedagens Linux sem compilação local).
