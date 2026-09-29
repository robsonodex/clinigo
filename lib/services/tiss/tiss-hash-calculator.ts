import * as crypto from 'crypto';

export type TissHashAlgorithm = 'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL';

/**
 * CLINIGO - Cálculo de Hash do Lote TISS
 * 
 * ALGORITMOS SUPORTADOS:
 * 
 * 1. LEGACY_SHA256_JSON (Padrão Ativo / Compatibilidade Histórica):
 *    - Entrada: Objeto de dados do lote (TissBatchData) ou string do lote.
 *    - Tratamento: Se for objeto, serializado via JSON.stringify(). Se string, mantido como recebido.
 *    - Hash: SHA-256 computado sobre bytes codificados em UTF-8.
 *    - Saída: String hexadecimal de 64 caracteres em caixa baixa.
 *    - Uso: Mantido por padrão para segurança de todas as clínicas existentes e retrocompatibilidade.
 * 
 * 2. ANS_MD5_CANONICAL (Modo Experimental / Não Homologado com Operadora Real):
 *    - ATENÇÃO: Este algoritmo é uma aproximação baseada na especificação teórica do Padrão TISS.
 *      Ele NÃO foi validado com um vetor de teste oficial emitido pela ANS nem homologado
 *      contra o validador de uma operadora de saúde em produção.
 *    - Entrada: Conteúdo textual do documento XML gerado.
 *    - Higienização / O que é excluído:
 *      * Remoção de quaisquer tags de hash pré-existentes:
 *        /<ans:hashDocumento>.*?<\/ans:hashDocumento>/g
 *        /<ans:hash>.*?<\/ans:hash>/g
 *        /<hash>.*?<\/hash>/g
 *      * Normalização de quebras de linha: conversão de '\r\n' (CRLF) para '\n' (LF).
 *      * Remoção de espaços em branco no início e final (.trim()).
 *    - Hash: MD5 computado sobre o texto higienizado codificado em UTF-8.
 *    - Saída: String hexadecimal de 32 caracteres em caixa baixa (compatível com ans:st_hash maxLength=32).
 */
export function calculateTissHash(
  xmlContentOrData: string | Record<string, any>,
  algorithm: TissHashAlgorithm = 'LEGACY_SHA256_JSON'
): string {
  if (algorithm === 'LEGACY_SHA256_JSON') {
    const jsonString = typeof xmlContentOrData === 'string'
      ? xmlContentOrData
      : JSON.stringify(xmlContentOrData);
    return crypto.createHash('sha256').update(jsonString, 'utf-8').digest('hex');
  }

  // ANS_MD5_CANONICAL (Experimental)
  const content = typeof xmlContentOrData === 'string'
    ? xmlContentOrData
    : JSON.stringify(xmlContentOrData);

  // Remove tag de hash pré-existente se houver para evitar auto-referência
  const sanitized = content
    .replace(/<ans:hashDocumento>.*?<\/ans:hashDocumento>/g, '')
    .replace(/<ans:hash>.*?<\/ans:hash>/g, '')
    .replace(/<hash>.*?<\/hash>/g, '')
    .replace(/\r\n/g, '\n')
    .trim();

  return crypto.createHash('md5').update(sanitized, 'utf-8').digest('hex');
}

