// lib/services/tiss/encoding-utils.ts
/**
 * ENCODING UTILITIES - A Guerra contra o � (Replacement Character)
 * 
 * Problema: Arquivos TISS legados vêm em ISO-8859-1, Windows-1252, ou UTF-8 com BOM.
 * Se você tentar ler com encoding errado = � � � everywhere.
 * 
 * Solução: Detectar encoding e converter para UTF-8 limpo.
 */

import iconv from 'iconv-lite';

export type DetectedEncoding = 'UTF-8' | 'ISO-8859-1' | 'WINDOWS-1252' | 'UNKNOWN';

/**
 * Detecta encoding de um buffer usando heurísticas
 * (Não é 100% preciso, mas funciona em 95% dos casos)
 */
export function detectEncoding(buffer: Buffer): DetectedEncoding {
    // 1. Verificar BOM UTF-8 (EF BB BF)
    if (buffer.length >= 3 &&
        buffer[0] === 0xEF &&
        buffer[1] === 0xBB &&
        buffer[2] === 0xBF) {
        return 'UTF-8';
    }

    // 2. Tentar decodificar como UTF-8
    try {
        const asUtf8 = buffer.toString('utf8');

        // Se tiver replacement character (�), provavelmente NÃO é UTF-8
        if (asUtf8.includes('\ufffd')) {
            // Provavelmente é ISO-8859-1 ou Windows-1252
            return detectLegacyEncoding(buffer);
        }

        // Se tiver caracteres de controle inválidos, também não é UTF-8
        if (/[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(asUtf8)) {
            return detectLegacyEncoding(buffer);
        }

        // Provavelmente é UTF-8 válido
        return 'UTF-8';
    } catch {
        return detectLegacyEncoding(buffer);
    }
}

/**
 * Diferencia ISO-8859-1 de Windows-1252
 * (Windows-1252 tem caracteres especiais em 0x80-0x9F)
 */
function detectLegacyEncoding(buffer: Buffer): DetectedEncoding {
    // Procurar por bytes no range 0x80-0x9F
    for (let i = 0; i < Math.min(buffer.length, 5000); i++) {
        const byte = buffer[i];

        // Caracteres comuns em Windows-1252 mas não em ISO-8859-1
        if (byte === 0x80 || byte === 0x82 || byte === 0x83 ||
            byte === 0x84 || byte === 0x85 || byte === 0x91 ||
            byte === 0x92 || byte === 0x93 || byte === 0x94) {
            return 'WINDOWS-1252';
        }
    }

    // Se tiver caracteres acentuados comuns em PT-BR (à, é, ç, etc)
    // Provavelmente é ISO-8859-1
    if (buffer.includes(0xE0) || buffer.includes(0xE9) || buffer.includes(0xE7)) {
        return 'ISO-8859-1';
    }

    return 'ISO-8859-1'; // Default para legado
}

/**
 * Converte buffer para string UTF-8 limpa
 * Esta é a função que você DEVE usar antes de parsear XML
 */
export function normalizeToUTF8(buffer: Buffer): string {
    const encoding = detectEncoding(buffer);

    switch (encoding) {
        case 'UTF-8':
            // Remover BOM se existir
            if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                return buffer.slice(3).toString('utf8');
            }
            return buffer.toString('utf8');

        case 'ISO-8859-1':
            // Converter ISO-8859-1 → UTF-8
            return iconv.decode(buffer, 'ISO-8859-1');

        case 'WINDOWS-1252':
            // Converter Windows-1252 → UTF-8
            return iconv.decode(buffer, 'Windows-1252');

        default:
            // Fallback: tentar UTF-8 e substituir caracteres inválidos
            return buffer.toString('utf8').replace(/\ufffd/g, '?');
    }
}

/**
 * Sanitiza string XML removendo caracteres de controle inválidos
 * (Alguns XMLs legados têm \x00, \x08, etc que quebram parsers)
 */
export function sanitizeXML(xml: string): string {
    return xml
        // Remover caracteres de controle inválidos (exceto tab, newline, carriage return)
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
        // Normalizar quebras de linha
        .replace(/\r\n/g, '\n')
        // Remover espaços duplicados dentro de tags
        .replace(/>\s+</g, '><')
        // Trim
        .trim();
}

/**
 * Pipeline completo: Buffer → UTF-8 limpo e sanitizado
 */
export function prepareXMLBuffer(buffer: Buffer): {
    xml: string;
    encoding: DetectedEncoding;
    hasBOM: boolean;
} {
    const encoding = detectEncoding(buffer);
    const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    const normalized = normalizeToUTF8(buffer);
    const sanitized = sanitizeXML(normalized);

    return {
        xml: sanitized,
        encoding,
        hasBOM,
    };
}

/**
 * Validação básica de XML TISS
 * (Verifica se tem estrutura mínima esperada)
 */
export function isValidTissXML(xml: string): boolean {
    // Deve ter tag raiz do TISS
    if (!xml.includes('mensagemTISS') && !xml.includes('loteGuias')) {
        return false;
    }

    // Deve ter pelo menos uma tag de guia
    if (!xml.includes('guia') && !xml.includes('Guia')) {
        return false;
    }

    // Deve ser XML bem formado (pelo menos <?xml)
    if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<')) {
        return false;
    }

    return true;
}

/**
 * Helper: Extrair encoding declarado no XML header
 * (Para comparar com o detectado automaticamente)
 */
export function extractDeclaredEncoding(xml: string): string | null {
    const match = xml.match(/<\?xml[^>]+encoding=["']([^"']+)["']/i);
    return match ? match[1].toUpperCase() : null;
}

/**
 * Log de debug de encoding (para troubleshooting)
 */
export function debugEncoding(buffer: Buffer): {
    detected: DetectedEncoding;
    declared: string | null;
    firstBytes: string;
    hasBOM: boolean;
    sampleText: string;
} {
    const { xml, encoding, hasBOM } = prepareXMLBuffer(buffer);
    const declared = extractDeclaredEncoding(xml);

    return {
        detected: encoding,
        declared,
        firstBytes: buffer.slice(0, 20).toString('hex'),
        hasBOM,
        sampleText: xml.slice(0, 200),
    };
}
