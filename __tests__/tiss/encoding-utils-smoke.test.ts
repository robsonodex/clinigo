/**
 * @jest-environment node
 */
import iconv from 'iconv-lite';
import {
    detectEncoding,
    normalizeToUTF8,
    sanitizeXML,
    prepareXMLBuffer,
    isValidTissXML,
} from '@/lib/services/tiss/encoding-utils';

describe('D8.2: Teste de Fumaça de Codificação (encoding-utils)', () => {
    it('1. Deve preservar UTF-8 padrão sem corrupção', () => {
        const text = '<?xml version="1.0" encoding="UTF-8"?><mensagemTISS><guia>Consulta de Cardiologia</guia></mensagemTISS>';
        const buf = Buffer.from(text, 'utf8');

        expect(detectEncoding(buf)).toBe('UTF-8');
        expect(normalizeToUTF8(buf)).toBe(text);
        expect(isValidTissXML(text)).toBe(true);
    });

    it('2. Deve detectar e remover UTF-8 BOM', () => {
        const text = '<mensagemTISS><guia>Exame de Ultrassonografia</guia></mensagemTISS>';
        const buf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(text, 'utf8')]);

        const result = prepareXMLBuffer(buf);
        expect(result.hasBOM).toBe(true);
        expect(result.encoding).toBe('UTF-8');
        expect(result.xml).toBe(text);
    });

    it('3. Deve converter buffer ISO-8859-1 com acentuação PT-BR para UTF-8 limpo sem replacement character', () => {
        const originalText = '<mensagemTISS><guia>Atenção Médica e Fisioterapia Respiratória</guia></mensagemTISS>';
        const isoBuf = iconv.encode(originalText, 'ISO-8859-1');

        const normalized = normalizeToUTF8(isoBuf);
        expect(normalized).toBe(originalText);
        expect(normalized).not.toContain('\ufffd');
    });

    it('4. Deve sanitizar caracteres de controle nulos e preservando tags', () => {
        const dirtyXml = '<mensagemTISS>\x00\x08<guia>Cirurgia Geral</guia>\x1F</mensagemTISS>';
        const cleanXml = sanitizeXML(dirtyXml);

        expect(cleanXml).not.toContain('\x00');
        expect(cleanXml).not.toContain('\x08');
        expect(cleanXml).not.toContain('\x1F');
        expect(cleanXml).toContain('<guia>Cirurgia Geral</guia>');
    });
});
