import * as crypto from 'crypto';

export type TissHashAlgorithm = 'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL';

/**
 * Calcula o hash oficial do lote TISS conforme o algoritmo selecionado.
 * 
 * Regra ANS (ANS_MD5_CANONICAL):
 * Aplicado algoritmo MD5 sobre o fluxo de caracteres UTF-8 da mensagem XML,
 * normalizado com quebras de linha padrão (\n).
 * 
 * Regra Legada CliniGo (LEGACY_SHA256_JSON):
 * Algoritmo SHA-256 calculado sobre a serialização JSON da estrutura TissBatchData.
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

  // ANS_MD5_CANONICAL
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
