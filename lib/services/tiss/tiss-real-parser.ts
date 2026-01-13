// lib/services/tiss/tiss-real-parser.ts
/**
 * TISS REAL PARSER - Production Implementation
 * Suporta: ANS 3.05.00 e 4.02.00
 * Operadoras testadas: Unimed, Bradesco, SulAmérica, Amil
 * 
 * NÃO É MOCK. Este código lê XMLs reais.
 */

import { XMLParser } from 'fast-xml-parser';
import { prepareXMLBuffer, isValidTissXML } from './encoding-utils';

// ============================================
// INTERFACES
// ============================================

export interface UnifiedTissReturn {
    lote_numero?: string;
    lote_protocolo?: string;
    operadora_codigo?: string;
    operadora_nome?: string;
    prestador_codigo?: string;
    prestador_nome?: string;
    data_envio?: string;
    data_processamento?: string;
    versao_tiss?: string;
    guias: TissGuideReturn[];
}

export interface TissGuideReturn {
    numero_guia_prestador: string; // CRÍTICO: key para matcher
    numero_guia_operadora?: string;
    senha_autorizacao?: string;

    // Beneficiário
    carteira_beneficiario?: string;
    nome_beneficiario?: string;
    cpf_beneficiario?: string;

    // Status
    status: 'APPROVED' | 'DENIED' | 'PARTIAL';
    codigo_status?: string; // 1=Aprovado, 2=Negado, 3=Parcial

    // Financeiro
    valor_apresentado?: number;
    valor_processado?: number;
    valor_liberado?: number;
    valor_glosa?: number;
    valor_co_participacao?: number;

    // Glosas
    glosas: TissGlosa[];

    // Observações
    obs_processamento?: string;
    motivo_encerramento?: string;
}

export interface TissGlosa {
    codigo_glosa: string;
    descricao_glosa: string;
    valor_glosa: number;
    sequencial_item?: number; // Qual procedimento foi glosado
    pode_recurso?: boolean;
}

export interface ParseResult {
    success: boolean;
    data: UnifiedTissReturn | null;
    metadata: {
        total_guias: number;
        total_aprovadas: number;
        total_negadas: number;
        total_parciais: number;
        encoding_detected: string;
        versao_tiss: string;
        parsing_duration_ms: number;
    };
    errors: ParseError[];
}

export interface ParseError {
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    path?: string; // Caminho XPath onde ocorreu erro
    line?: number;
}

// ============================================
// PARSER PRINCIPAL
// ============================================

export class TissRealParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseTagValue: true,
            parseAttributeValue: true,
            trimValues: true,
            // CRÍTICO: Preservar arrays mesmo com 1 elemento
            isArray: (tagName) => {
                return ['guia', 'procedimento', 'glosa', 'motivoGlosa'].includes(tagName);
            },
        });
    }

    /**
     * Parse principal - Entry point
     */
    async parseBuffer(buffer: Buffer): Promise<ParseResult> {
        const startTime = Date.now();
        const errors: ParseError[] = [];

        try {
            // 1. Normalizar encoding
            const { xml, encoding } = prepareXMLBuffer(buffer);

            // 2. Validar estrutura básica
            if (!isValidTissXML(xml)) {
                return {
                    success: false,
                    data: null,
                    metadata: {
                        total_guias: 0,
                        total_aprovadas: 0,
                        total_negadas: 0,
                        total_parciais: 0,
                        encoding_detected: encoding,
                        versao_tiss: 'UNKNOWN',
                        parsing_duration_ms: Date.now() - startTime,
                    },
                    errors: [{
                        severity: 'ERROR',
                        message: 'XML não contém estrutura TISS válida',
                    }],
                };
            }

            // 3. Parse XML
            const parsed = this.parser.parse(xml);

            // 4. Detectar versão TISS e extrair dados
            const version = this.detectTissVersion(parsed);
            const unified = await this.extractData(parsed, version, errors);

            // 5. Calcular estatísticas
            const stats = this.calculateStats(unified);

            return {
                success: true,
                data: unified,
                metadata: {
                    ...stats,
                    encoding_detected: encoding,
                    versao_tiss: version,
                    parsing_duration_ms: Date.now() - startTime,
                },
                errors,
            };

        } catch (error: any) {
            return {
                success: false,
                data: null,
                metadata: {
                    total_guias: 0,
                    total_aprovadas: 0,
                    total_negadas: 0,
                    total_parciais: 0,
                    encoding_detected: 'ERROR',
                    versao_tiss: 'UNKNOWN',
                    parsing_duration_ms: Date.now() - startTime,
                },
                errors: [{
                    severity: 'ERROR',
                    message: `Erro fatal no parse: ${error.message}`,
                }],
            };
        }
    }

    /**
     * Detecta versão TISS (3.05 ou 4.02)
     */
    private detectTissVersion(parsed: any): string {
        try {
            // Caminho comum: ans:mensagemTISS → ans:cabecalho → ans:versaoPadrao
            const cabecalho = this.navigate(parsed, [
                'ans:mensagemTISS',
                'mensagemTISS',
                'cabecalho',
                'ans:cabecalho'
            ]);

            if (cabecalho) {
                const versao = cabecalho['ans:versaoPadrao'] ||
                    cabecalho['versaoPadrao'] ||
                    cabecalho['Padrao'];

                if (versao) {
                    return typeof versao === 'object' ? versao['#text'] : versao.toString();
                }
            }

            // Fallback: detectar por estrutura
            if (parsed['ans:mensagemTISS']) return '4.02.00';
            if (parsed['mensagemTISS']) return '3.05.00';

            return 'UNKNOWN';
        } catch {
            return 'UNKNOWN';
        }
    }

    /**
     * Extrai dados unificados independente da versão
     */
    private async extractData(
        parsed: any,
        version: string,
        errors: ParseError[]
    ): Promise<UnifiedTissReturn> {
        const unified: UnifiedTissReturn = {
            guias: [],
        };

        try {
            // Extrair cabeçalho
            const header = this.extractHeader(parsed, version);
            Object.assign(unified, header);

            // Extrair guias
            const guias = this.extractGuias(parsed, version, errors);
            unified.guias = guias;

        } catch (error: any) {
            errors.push({
                severity: 'ERROR',
                message: `Erro ao extrair dados: ${error.message}`,
            });
        }

        return unified;
    }

    /**
     * Extrai informações do cabeçalho
     */
    private extractHeader(parsed: any, version: string): Partial<UnifiedTissReturn> {
        const header: Partial<UnifiedTissReturn> = {
            versao_tiss: version,
        };

        try {
            const root = this.navigate(parsed, ['ans:mensagemTISS', 'mensagemTISS']);

            if (!root) return header;

            // Cabeçalho
            const cabecalho = root['ans:cabecalho'] || root['cabecalho'];
            if (cabecalho) {
                header.lote_numero = this.getText(cabecalho, ['ans:numeroLote', 'numeroLote']);
                header.lote_protocolo = this.getText(cabecalho, ['ans:identificadorTransacao', 'identificadorTransacao']);
            }

            // Dados da operadora
            const operadora = this.navigate(root, [
                'ans:prestadorParaOperadora',
                'prestadorParaOperadora',
                'ans:dadosOperadora',
                'dadosOperadora'
            ]);

            if (operadora) {
                header.operadora_codigo = this.getText(operadora, ['ans:codigoOperadora', 'codigoOperadora', 'registro']);
                header.operadora_nome = this.getText(operadora, ['ans:nomeOperadora', 'nomeOperadora', 'razaoSocial']);
            }

            // Dados do prestador
            const prestador = this.navigate(root, [
                'ans:prestadorParaOperadora',
                'prestadorParaOperadora',
                'ans:dadosPrestador',
                'dadosPrestador'
            ]);

            if (prestador) {
                header.prestador_codigo = this.getText(prestador, ['ans:codigoPrestador', 'codigoPrestador']);
                header.prestador_nome = this.getText(prestador, ['ans:nomePrestador', 'nomePrestador']);
            }

        } catch (error: any) {
            console.warn('[TissParser] Erro ao extrair header:', error.message);
        }

        return header;
    }

    /**
     * Extrai array de guias (COM RESILIÊNCIA)
     */
    private extractGuias(parsed: any, version: string, errors: ParseError[]): TissGuideReturn[] {
        const guias: TissGuideReturn[] = [];

        try {
            const root = this.navigate(parsed, ['ans:mensagemTISS', 'mensagemTISS']);
            if (!root) return guias;

            // Encontrar lote de guias
            const loteGuias = root['ans:loteGuias'] ||
                root['loteGuias'] ||
                root['ans:prestadorParaOperadora'] ||
                root['prestadorParaOperadora'];

            if (!loteGuias) {
                errors.push({
                    severity: 'WARNING',
                    message: 'Estrutura de lote não encontrada',
                });
                return guias;
            }

            // Extrair array de guias (pode estar em vários caminhos)
            let guiasArray = loteGuias['ans:guia'] ||
                loteGuias['guia'] ||
                loteGuias['ans:guiaConsulta'] ||
                loteGuias['guiaConsulta'];

            // CRÍTICO: Normalizar para array (fast-xml-parser pode retornar objeto se tiver 1 item)
            if (!Array.isArray(guiasArray)) {
                guiasArray = guiasArray ? [guiasArray] : [];
            }

            // Processar cada guia individualmente (RESILIENTE)
            for (let i = 0; i < guiasArray.length; i++) {
                try {
                    const guia = this.extractGuia(guiasArray[i], i, errors);
                    if (guia) {
                        guias.push(guia);
                    }
                } catch (error: any) {
                    errors.push({
                        severity: 'WARNING',
                        message: `Erro ao processar guia #${i + 1}: ${error.message}`,
                        path: `guias[${i}]`,
                    });
                }
            }

        } catch (error: any) {
            errors.push({
                severity: 'ERROR',
                message: `Erro ao extrair guias: ${error.message}`,
            });
        }

        return guias;
    }

    /**
     * Extrai dados de UMA guia (CORE LOGIC)
     */
    private extractGuia(guiaXML: any, index: number, errors: ParseError[]): TissGuideReturn | null {
        try {
            // OBRIGATÓRIO: Número da guia (key para matcher)
            const numero_guia = this.getText(guiaXML, [
                'ans:numeroGuiaPrestador',
                'numeroGuiaPrestador',
                'ans:numeroGuia',
                'numeroGuia',
                'numeroGuiaNoReembolso'
            ]);

            if (!numero_guia) {
                errors.push({
                    severity: 'WARNING',
                    message: `Guia #${index + 1} sem número identificador`,
                });
                return null;
            }

            // Dados básicos
            const guia: TissGuideReturn = {
                numero_guia_prestador: numero_guia,
                numero_guia_operadora: this.getText(guiaXML, ['ans:numeroGuiaOperadora', 'numeroGuiaOperadora']),
                senha_autorizacao: this.getText(guiaXML, ['ans:senhaAutorizacao', 'senhaAutorizacao', 'numeroAutorizacao']),
                status: 'APPROVED', // Default, será atualizado
                glosas: [],
            };

            // Beneficiário
            const beneficiario = guiaXML['ans:dadosBeneficiario'] || guiaXML['dadosBeneficiario'];
            if (beneficiario) {
                guia.carteira_beneficiario = this.getText(beneficiario, ['ans:numeroCarteira', 'numeroCarteira', 'numeroCarteiraBeneficiario']);
                guia.nome_beneficiario = this.getText(beneficiario, ['ans:nomeBeneficiario', 'nomeBeneficiario']);
                guia.cpf_beneficiario = this.getText(beneficiario, ['ans:cpf', 'cpf']);
            }

            // Status e financeiro (ONDE A MÁGICA ACONTECE)
            this.extractStatusAndFinancials(guiaXML, guia);

            // Glosas (se houver)
            this.extractGlosas(guiaXML, guia, errors);

            return guia;

        } catch (error: any) {
            errors.push({
                severity: 'WARNING',
                message: `Erro ao processar guia: ${error.message}`,
                path: `guias[${index}]`,
            });
            return null;
        }
    }

    /**
     * Extrai status e valores financeiros (LÓGICA COMPLEXA)
     */
    private extractStatusAndFinancials(guiaXML: any, guia: TissGuideReturn): void {
        // Valores apresentados
        guia.valor_apresentado = this.getNumber(guiaXML, [
            'ans:valorTotalGuia',
            'valorTotalGuia',
            'ans:valorApresentado',
            'valorApresentado',
            'ans:valorTotal',
            'valorTotal'
        ]);

        // Valores processados
        guia.valor_processado = this.getNumber(guiaXML, [
            'ans:valorProcessado',
            'valorProcessado',
            'ans:valorLiberado',
            'valorLiberado'
        ]);

        guia.valor_liberado = this.getNumber(guiaXML, [
            'ans:valorLiberado',
            'valorLiberado',
            'ans:valorPago',
            'valorPago'
        ]);

        guia.valor_glosa = this.getNumber(guiaXML, [
            'ans:valorTotalGlosa',
            'valorTotalGlosa',
            'ans:valorGlosado',
            'valorGlosado'
        ]);

        // Código de status (1=Aprovado, 2=Negado, 3=Parcial, 4=Auditoria)
        const codigoStatus = this.getText(guiaXML, [
            'ans:statusProcessamento',
            'statusProcessamento',
            'ans:codigoStatus',
            'codigoStatus'
        ]);

        guia.codigo_status = codigoStatus;

        // Mapear status
        if (codigoStatus === '2' || codigoStatus === 'NEGADO') {
            guia.status = 'DENIED';
        } else if (codigoStatus === '3' || codigoStatus === 'PARCIAL') {
            guia.status = 'PARTIAL';
        } else if (guia.valor_glosa && guia.valor_glosa > 0) {
            // Se tem glosa mas não veio código, inferir PARTIAL
            guia.status = 'PARTIAL';
        } else {
            guia.status = 'APPROVED';
        }

        // Observações
        guia.obs_processamento = this.getText(guiaXML, [
            'ans:observacao',
            'observacao',
            'ans:mensagemRetorno',
            'mensagemRetorno'
        ]);
    }

    /**
     * Extrai glosas (array)
     */
    private extractGlosas(guiaXML: any, guia: TissGuideReturn, errors: ParseError[]): void {
        try {
            let glosasArray = guiaXML['ans:glosas'] ||
                guiaXML['glosas'] ||
                guiaXML['ans:motivoGlosa'] ||
                guiaXML['motivoGlosa'];

            if (!glosasArray) return;

            // Normalizar para array
            if (!Array.isArray(glosasArray)) {
                glosasArray = [glosasArray];
            }

            for (const glosaXML of glosasArray) {
                const codigo = this.getText(glosaXML, ['ans:codigoGlosa', 'codigoGlosa']);
                const descricao = this.getText(glosaXML, ['ans:descricaoGlosa', 'descricaoGlosa', 'ans:justificativa', 'justificativa']);
                const valor = this.getNumber(glosaXML, ['ans:valorGlosa', 'valorGlosa']);

                if (codigo || descricao) {
                    guia.glosas.push({
                        codigo_glosa: codigo || 'SEM_CODIGO',
                        descricao_glosa: descricao || 'Sem descrição',
                        valor_glosa: valor || 0,
                    });
                }
            }

        } catch (error: any) {
            errors.push({
                severity: 'WARNING',
                message: `Erro ao extrair glosas: ${error.message}`,
            });
        }
    }

    // ============================================
    // HELPERS DE NAVEGAÇÃO
    // ============================================

    /**
     * Navega por múltiplos caminhos possíveis (fallback chain)
     */
    private navigate(obj: any, paths: string[]): any {
        for (const path of paths) {
            if (obj && obj[path]) {
                return obj[path];
            }
        }
        return null;
    }

    /**
     * Extrai texto de múltiplos caminhos possíveis
     */
    private getText(obj: any, paths: string[]): string | undefined {
        const value = this.navigate(obj, paths);

        if (!value) return undefined;

        if (typeof value === 'object' && value['#text'] !== undefined) {
            return value['#text'].toString().trim();
        }

        return value.toString().trim();
    }

    /**
     * Extrai número (com parsing seguro)
     */
    private getNumber(obj: any, paths: string[]): number | undefined {
        const text = this.getText(obj, paths);

        if (!text) return undefined;

        // Remover símbolos de moeda e espaços
        const cleaned = text.replace(/[R$\s]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);

        return isNaN(parsed) ? undefined : parsed;
    }

    /**
     * Calcula estatísticas
     */
    private calculateStats(unified: UnifiedTissReturn) {
        const total = unified.guias.length;
        const approved = unified.guias.filter(g => g.status === 'APPROVED').length;
        const denied = unified.guias.filter(g => g.status === 'DENIED').length;
        const partial = unified.guias.filter(g => g.status === 'PARTIAL').length;

        return {
            total_guias: total,
            total_aprovadas: approved,
            total_negadas: denied,
            total_parciais: partial,
        };
    }
}

// ============================================
// FACTORY FUNCTION (Convenience)
// ============================================

export async function parseTissReturn(buffer: Buffer): Promise<ParseResult> {
    const parser = new TissRealParser();
    return parser.parseBuffer(buffer);
}
