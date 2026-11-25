import * as crypto from 'crypto';
import iconv from 'iconv-lite';

export type TissHashAlgorithm = 'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL';

/**
 * Decodifica entidades XML básicas para texto puro conforme especificação ANS de cálculo do hash.
 */
function decodeBasicXmlEntities(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

/**
 * Extrai a concatenação ordenada do conteúdo textual de todas as tags folha de um XML TISS,
 * excluindo declaração XML, comentários, `<ans:epilogo>` e `<ds:Signature>` (Padrão ANS Componente de Comunicação).
 */
export function extractAnsTissCanonicalText(xmlContent: string): string {
    if (!xmlContent) return '';

    const withoutEnvelopeExtras = xmlContent
        // Remove declaração XML (<?xml ... ?>)
        .replace(/<\?xml[\s\S]*?\?>/gi, '')
        // Remove comentários XML
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove bloco epilogo / hash pré-existente para evitar auto-referência
        .replace(/<(?:[a-zA-Z0-9_-]+:)?epilogo\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?epilogo>/gi, '')
        .replace(/<(?:[a-zA-Z0-9_-]+:)?hashDocumento\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?hashDocumento>/gi, '')
        .replace(/<(?:[a-zA-Z0-9_-]+:)?hash\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?hash>/gi, '')
        // Remove assinatura digital XML-DSig se presente
        .replace(/<(?:[a-zA-Z0-9_-]+:)?Signature\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?Signature>/gi, '');

    // Extrai apenas o texto entre tags (ignora espaços puros de indentação entre tags irmãs)
    const chunks: string[] = [];
    const tagSplit = withoutEnvelopeExtras.split(/<[^>]+>/);
    for (const part of tagSplit) {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
            chunks.push(decodeBasicXmlEntities(trimmed));
        }
    }

    return chunks.join('');
}

/**
 * Calcula o hash MD5 oficial do `<ans:epilogo><ans:hash>` segundo o Padrão TISS/ANS:
 * concatenação dos valores textuais de todas as tags (excluindo epílogo e assinatura),
 * codificados em ISO-8859-1, seguidos de digest MD5 hexadecimal minúsculo (32 caracteres).
 */
export function calculateOfficialAnsEpilogoMd5(xmlContent: string): string {
    const canonicalText = extractAnsTissCanonicalText(xmlContent);
    const latin1Buffer = iconv.encode(canonicalText, 'ISO-8859-1');
    return crypto.createHash('md5').update(latin1Buffer).digest('hex');
}

/**
 * CLINIGO - Cálculo de Hash do Lote TISS
 *
 * ALGORITMOS SUPORTADOS:
 * 1. LEGACY_SHA256_JSON (Compatibilidade Histórica):
 *    - SHA-256 UTF-8 (64 chars hex) sobre o objeto/string de dados.
 * 2. ANS_MD5_CANONICAL (Padrão Oficial TISS/ANS — Componente de Comunicação):
 *    - Extrai a concatenação dos valores textuais das tags folha (sem tags, sem epílogo, sem assinatura),
 *      codifica em ISO-8859-1 e calcula MD5 hexadecimal de 32 caracteres (`ans:st_hash`).
 */
export function calculateTissHash(
    xmlContentOrData: string | Record<string, any>,
    algorithm: TissHashAlgorithm = 'LEGACY_SHA256_JSON'
): string {
    if (algorithm === 'LEGACY_SHA256_JSON') {
        const jsonString =
            typeof xmlContentOrData === 'string'
                ? xmlContentOrData
                : JSON.stringify(xmlContentOrData);
        return crypto.createHash('sha256').update(jsonString, 'utf-8').digest('hex');
    }

    const content =
        typeof xmlContentOrData === 'string'
            ? xmlContentOrData
            : JSON.stringify(xmlContentOrData);

    // Se for XML, usa o algoritmo canônico ANS (valores das tags em ISO-8859-1 -> MD5 32 chars)
    if (content.includes('<') && content.includes('>')) {
        return calculateOfficialAnsEpilogoMd5(content);
    }

    // Fallback determinístico para string simples não-XML
    const latin1 = iconv.encode(content.replace(/\r\n/g, '\n').trim(), 'ISO-8859-1');
    return crypto.createHash('md5').update(latin1).digest('hex');
}
