// lib/services/tiss/parser-strategies.ts
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createInterface } from 'readline';
import iconv from 'iconv-lite';
import { XMLParser } from 'fast-xml-parser';

/**
 * STRATEGY PATTERN: Parser de Retorno TISS por Operadora
 * Cada operadora tem seu próprio parser customizado
 */

// ============================================
// INTERFACE BASE
// ============================================

export interface TissReturnData {
    guide_number: string;
    status: 'APPROVED' | 'DENIED' | 'PARTIAL';
    denial_code?: string;
    denial_reason?: string;
    approved_value?: number;
    denied_value?: number;
    can_appeal?: boolean;
}

export interface ParseResult {
    success: boolean;
    data: TissReturnData[];
    metadata: {
        total_guides: number;
        approved_count: number;
        denied_count: number;
        partial_count: number;
        parser_used: string;
        encoding_detected: string;
        parsing_duration_ms: number;
    };
    errors: Array<{
        line?: number;
        message: string;
        severity: 'WARNING' | 'ERROR';
    }>;
}

export interface ITissParserStrategy {
    readonly name: string;
    readonly supportedOperadoras: string[]; // CNPJs ou nomes
    canHandle(fileContent: string): boolean; // Detecta se pode fazer parse
    parse(filePath: string, encoding: string): Promise<ParseResult>;
}

// ============================================
// PARSER GENÉRICO (FALLBACK)
// ============================================

export class GenericTissParser implements ITissParserStrategy {
    readonly name = 'Generic';
    readonly supportedOperadoras = ['*']; // Aceita qualquer

    canHandle(fileContent: string): boolean {
        // Verifica se tem estrutura XML TISS
        return fileContent.includes('<ans:mensagemTISS') || fileContent.includes('<?xml');
    }

    async parse(filePath: string, encoding: string): Promise<ParseResult> {
        const startTime = Date.now();
        const results: TissReturnData[] = [];
        const errors: ParseResult['errors'] = [];

        try {
            // Ler arquivo com encoding correto
            const stream = createReadStream(filePath)
                .pipe(iconv.decodeStream(encoding));

            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
                textNodeName: '#text',
            });

            let xmlBuffer = '';

            // Ler via stream (para arquivos grandes)
            for await (const chunk of stream) {
                xmlBuffer += chunk;
            }

            const parsed = parser.parse(xmlBuffer);

            // Navegar estrutura XML genérica
            const guias = this.extractGuides(parsed);

            for (const guia of guias) {
                try {
                    const result = this.parseGuide(guia);
                    if (result) results.push(result);
                } catch (err: any) {
                    errors.push({
                        message: `Erro ao parsear guia: ${err.message}`,
                        severity: 'WARNING',
                    });
                }
            }

            return {
                success: true,
                data: results,
                metadata: {
                    total_guides: results.length,
                    approved_count: results.filter(r => r.status === 'APPROVED').length,
                    denied_count: results.filter(r => r.status === 'DENIED').length,
                    partial_count: results.filter(r => r.status === 'PARTIAL').length,
                    parser_used: this.name,
                    encoding_detected: encoding,
                    parsing_duration_ms: Date.now() - startTime,
                },
                errors,
            };

        } catch (error: any) {
            return {
                success: false,
                data: [],
                metadata: {
                    total_guides: 0,
                    approved_count: 0,
                    denied_count: 0,
                    partial_count: 0,
                    parser_used: this.name,
                    encoding_detected: encoding,
                    parsing_duration_ms: Date.now() - startTime,
                },
                errors: [{
                    message: `Erro fatal no parse: ${error.message}`,
                    severity: 'ERROR',
                }],
            };
        }
    }

    private extractGuides(parsed: any): any[] {
        // Navegação genérica (pode variar por operadora)
        try {
            return parsed['ans:mensagemTISS']?.['ans:loteGuias']?.['ans:guia'] || [];
        } catch {
            return [];
        }
    }

    private parseGuide(guia: any): TissReturnData | null {
        const guideNumber = guia['ans:numeroGuiaPrestador']?.['#text'] || guia['ans:numeroGuiaPrestador'];
        const statusCode = guia['ans:statusProcessamento']?.['#text'] || guia['ans:statusProcessamento'];

        if (!guideNumber) return null;

        // Mapear status (genérico)
        let status: TissReturnData['status'] = 'APPROVED';
        if (statusCode === '2' || statusCode === 'NEGADO') status = 'DENIED';
        if (statusCode === '3' || statusCode === 'PARCIAL') status = 'PARTIAL';

        return {
            guide_number: guideNumber,
            status,
            denial_code: guia['ans:codigoGlosa']?.['#text'],
            denial_reason: guia['ans:motivoGlosa']?.['#text'],
            approved_value: parseFloat(guia['ans:valorAprovado']?.['#text'] || '0'),
            denied_value: parseFloat(guia['ans:valorGlosado']?.['#text'] || '0'),
            can_appeal: guia['ans:permiteRecurso']?.['#text'] === 'S',
        };
    }
}

// ============================================
// PARSER ESPECÍFICO: UNIMED
// ============================================

export class UnimedTissParser extends GenericTissParser {
    readonly name = 'Unimed';
    readonly supportedOperadoras = ['UNIMED', '3.11.111/0001-11']; // Nome ou CNPJ

    canHandle(fileContent: string): boolean {
        return fileContent.includes('UNIMED') || fileContent.includes('ans:operadora');
    }

    // Override específico para Unimed (se necessário)
    protected parseGuide(guia: any): TissReturnData | null {
        // Unimed usa campos ligeiramente diferentes
        const result = super.parseGuide(guia);

        if (result) {
            // Customização específica Unimed
            // Ex: campo de recurso tem nome diferente
            result.can_appeal = guia['ans:indPermiteRecurso'] === '1';
        }

        return result;
    }
}

// ============================================
// PARSER ESPECÍFICO: BRADESCO
// ============================================

export class BradescoTissParser extends GenericTissParser {
    readonly name = 'Bradesco';
    readonly supportedOperadoras = ['BRADESCO', '60.850.229/0001-47'];

    canHandle(fileContent: string): boolean {
        return fileContent.includes('BRADESCO') || fileContent.includes('60850229');
    }

    // Bradesco tem formato TXT ao invés de XML
    async parse(filePath: string, encoding: string): Promise<ParseResult> {
        const startTime = Date.now();
        const results: TissReturnData[] = [];
        const errors: ParseResult['errors'] = [];

        try {
            const fileStream = createReadStream(filePath);
            const rl = createInterface({
                input: fileStream.pipe(iconv.decodeStream(encoding)),
                crlfDelay: Infinity,
            });

            let lineNumber = 0;

            for await (const line of rl) {
                lineNumber++;

                // Pular header
                if (lineNumber === 1 && line.startsWith('HEADER')) continue;

                // Parse linha formato: GUIA|STATUS|VALOR|GLOSA|...
                const fields = line.split('|');

                if (fields.length < 4) {
                    errors.push({
                        line: lineNumber,
                        message: `Linha com formato inválido (esperado 4+ campos, encontrado ${fields.length})`,
                        severity: 'WARNING',
                    });
                    continue;
                }

                const [guideNumber, statusCode, approvedValue, deniedValue] = fields;

                results.push({
                    guide_number: guideNumber.trim(),
                    status: statusCode === '1' ? 'APPROVED' : statusCode === '2' ? 'DENIED' : 'PARTIAL',
                    approved_value: parseFloat(approvedValue || '0'),
                    denied_value: parseFloat(deniedValue || '0'),
                    can_appeal: false, // Bradesco não fornece essa info no TXT
                });
            }

            return {
                success: true,
                data: results,
                metadata: {
                    total_guides: results.length,
                    approved_count: results.filter(r => r.status === 'APPROVED').length,
                    denied_count: results.filter(r => r.status === 'DENIED').length,
                    partial_count: results.filter(r => r.status === 'PARTIAL').length,
                    parser_used: this.name,
                    encoding_detected: encoding,
                    parsing_duration_ms: Date.now() - startTime,
                },
                errors,
            };

        } catch (error: any) {
            return {
                success: false,
                data: [],
                metadata: {
                    total_guides: 0,
                    approved_count: 0,
                    denied_count: 0,
                    partial_count: 0,
                    parser_used: this.name,
                    encoding_detected: encoding,
                    parsing_duration_ms: Date.now() - startTime,
                },
                errors: [{
                    message: `Erro fatal: ${error.message}`,
                    severity: 'ERROR',
                }],
            };
        }
    }
}

// ============================================
// FACTORY: Seleciona Parser Correto
// ============================================

export class TissParserFactory {
    private static strategies: ITissParserStrategy[] = [
        new UnimedTissParser(),
        new BradescoTissParser(),
        new GenericTissParser(), // Sempre por último (fallback)
    ];

    static async detectAndParse(
        filePath: string,
        operadoraName?: string,
        encoding: string = 'UTF-8'
    ): Promise<ParseResult> {
        // Ler primeiros 5000 bytes para detectar operadora
        const sample = await this.readFileSample(filePath, encoding);

        // Tentar match por nome
        if (operadoraName) {
            const strategyByName = this.strategies.find(s =>
                s.supportedOperadoras.some(op =>
                    op.toLowerCase().includes(operadoraName.toLowerCase())
                )
            );

            if (strategyByName) {
                return strategyByName.parse(filePath, encoding);
            }
        }

        // Tentar detectar automaticamente
        for (const strategy of this.strategies) {
            if (strategy.canHandle(sample)) {
                return strategy.parse(filePath, encoding);
            }
        }

        // Fallback para genérico
        return this.strategies[this.strategies.length - 1].parse(filePath, encoding);
    }

    private static async readFileSample(filePath: string, encoding: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const stream = createReadStream(filePath, { start: 0, end: 5000 });
            let buffer = '';

            stream
                .pipe(iconv.decodeStream(encoding))
                .on('data', (chunk) => { buffer += chunk; })
                .on('end', () => resolve(buffer))
                .on('error', reject);
        });
    }
}
