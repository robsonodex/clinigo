/**
 * TISS XML Generator V2 — Padrão ANS Real (4.01.00 / 4.02.00)
 *
 * Correções estruturais ANS/XSD aplicadas (REG-01 / QA-01):
 * - Declaração XML em ISO-8859-1 (padrão oficial ANS de intercâmbio).
 * - `<ans:registroANS>` preenchido corretamente no `<ans:cabecalhoGuia>`.
 * - Elemento oficial `<ans:guiaSP-SADT>` (em vez de `guiaSpSadt`).
 * - Remoção de tags inventadas fora do XSD ANS (`iniciaisBeneficiario`, `consentimentoLGPD`,
 *   `versaoAplicativo`, `conformidadeLGPD`, `hashDocumento`).
 * - `<ans:codigoTabela>22</ans:codigoTabela>` + código TUSS oficial de 8 dígitos.
 * - `<ans:epilogo><ans:hash>...</ans:hash></ans:epilogo>` obrigatório calculado via
 *   MD5 ISO-8859-1 da concatenação dos valores textuais (Padrão ANS Componente de Comunicação).
 * - Cálculos monetários exatos em inteiros (centavos) via `lib/tiss/money.ts`.
 */

import { XMLBuilder } from 'fast-xml-parser';
import {
    calculateOfficialAnsEpilogoMd5,
    type TissHashAlgorithm,
} from './tiss-hash-calculator';
import {
    type TissVersion,
    getTissConfig,
    TISS_VERSION_CONFIGS,
} from '@/lib/types/tiss-versions';
import { formatCentsTiss, multiplyQtyUnitCents, toCents } from '@/lib/tiss/money';

export interface TissBeneficiary {
    cardNumber: string;
    fullName: string;
    cpf?: string;
    birthDate?: string;
    cns?: string;
    atendimentoRN?: 'S' | 'N';
}

export interface TissProcedure {
    code: string;
    description: string;
    quantity: number;
    unitValue: number;
    executionDate: string;
    professionalId?: string;
    tableCode?: string; // Padrão '22' (TUSS Procedimentos e Eventos em Saúde)
}

export interface TissProvider {
    cnesCode: string;
    name: string;
    taxId: string;
    type: 'PF' | 'PJ';
    operatorCode?: string;
}

export interface TissGuideData {
    guideNumber: string;
    type: 'CONSULTA' | 'SP/SADT' | 'INTERNACAO' | 'HONORARIOS' | 'ODONTO';
    issueDate: string;
    beneficiary: TissBeneficiary;
    provider: TissProvider;
    procedures: TissProcedure[];
    totalValue: number;
    observations?: string;
    authorizationCode?: string;
    cid10Code?: string;
}

export interface TissBatchData {
    batchNumber: string;
    insuranceAnsCode: string;
    insuranceName: string;
    provider: TissProvider;
    guides: TissGuideData[];
    createdAt: Date;
}

function normalizeTuss8Digits(code: string): string {
    const digits = String(code || '').replace(/\D/g, '');
    if (!digits) return '10101012';
    return digits.length >= 8 ? digits.slice(0, 8) : digits.padStart(8, '0');
}

function sanitizeAnsRegistry(ansCode: string): string {
    const digits = String(ansCode || '').replace(/\D/g, '');
    return digits ? digits.padStart(6, '0').slice(0, 6) : '000000';
}

function sanitizeBatchNumericSeq(batchNumber: string): string {
    const digits = String(batchNumber || '').replace(/\D/g, '');
    return (digits || '1').slice(-12);
}

export class TissXMLGeneratorV2 {
    private version: TissVersion;
    private config: typeof TISS_VERSION_CONFIGS[TissVersion];
    private hashAlgorithm: TissHashAlgorithm;

    constructor(version: TissVersion = '4.01.00', hashAlgorithm: TissHashAlgorithm = 'ANS_MD5_CANONICAL') {
        this.version = version;
        this.config = getTissConfig(version);
        this.hashAlgorithm = hashAlgorithm;
    }

    getVersion(): TissVersion {
        return this.version;
    }

    async generateBatchXML(batchData: TissBatchData): Promise<string> {
        const xmlObj = this.buildXMLStructure(batchData);

        const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            indentBy: '  ',
            suppressEmptyNode: true,
        });

        const xmlWithoutEpilogo = builder.build(xmlObj);
        const epilogoHash = calculateOfficialAnsEpilogoMd5(xmlWithoutEpilogo);

        // Insere o bloco obrigatório <ans:epilogo><ans:hash>...</ans:hash></ans:epilogo> antes de </ans:mensagemTISS>
        const closingTag = '</ans:mensagemTISS>';
        const idx = xmlWithoutEpilogo.lastIndexOf(closingTag);
        if (idx === -1) {
            return xmlWithoutEpilogo;
        }

        const epilogoBlock = `  <ans:epilogo>\n    <ans:hash>${epilogoHash}</ans:hash>\n  </ans:epilogo>\n`;
        return xmlWithoutEpilogo.slice(0, idx) + epilogoBlock + xmlWithoutEpilogo.slice(idx);
    }

    private buildXMLStructure(batchData: TissBatchData): Record<string, any> {
        const schemaLocation = `${this.config.namespace} ${this.config.schemaFile}`;

        return {
            '?xml': {
                '@_version': '1.0',
                '@_encoding': 'ISO-8859-1',
            },
            'ans:mensagemTISS': {
                '@_xmlns:ans': this.config.namespace,
                '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                '@_xsi:schemaLocation': schemaLocation,
                'ans:cabecalho': this.buildHeader(batchData),
                'ans:prestadorParaOperadora': {
                    'ans:loteGuias': this.buildGuideBatch(batchData),
                },
            },
        };
    }

    private buildHeader(batchData: TissBatchData): Record<string, any> {
        const now = batchData.createdAt || new Date();
        const ansCode = sanitizeAnsRegistry(batchData.insuranceAnsCode);
        const cnpjClean = String(batchData.provider.taxId || '').replace(/\D/g, '') || '00000000000000';
        const prestadorId: Record<string, any> = {};

        if (batchData.provider.operatorCode) {
            prestadorId['ans:codigoPrestadorNaOperadora'] = batchData.provider.operatorCode;
        } else if (batchData.provider.type === 'PJ') {
            prestadorId['ans:CNPJ'] = cnpjClean.padStart(14, '0').slice(0, 14);
        } else {
            prestadorId['ans:CPF'] = cnpjClean.padStart(11, '0').slice(0, 11);
        }

        return {
            'ans:identificacaoTransacao': {
                'ans:tipoTransacao': 'ENVIO_LOTE_GUIAS',
                'ans:sequencialTransacao': sanitizeBatchNumericSeq(batchData.batchNumber),
                'ans:dataRegistroTransacao': this.formatDate(now),
                'ans:horaRegistroTransacao': this.formatTime(now),
            },
            'ans:origem': {
                'ans:identificacaoPrestador': prestadorId,
            },
            'ans:destino': {
                'ans:registroANS': ansCode,
            },
            'ans:Padrao': this.version,
        };
    }

    private buildGuideBatch(batchData: TissBatchData): Record<string, any> {
        const ansCode = sanitizeAnsRegistry(batchData.insuranceAnsCode);
        return {
            'ans:numeroLote': sanitizeBatchNumericSeq(batchData.batchNumber),
            'ans:guiasTISS': batchData.guides.map((guide) => this.buildGuide(guide, ansCode)),
        };
    }

    private buildGuide(guide: TissGuideData, ansCode: string): Record<string, any> {
        const guideTag = this.mapGuideTagName(guide.type);
        const totalCents =
            guide.procedures && guide.procedures.length > 0
                ? guide.procedures.reduce((acc, p) => acc + multiplyQtyUnitCents(p.quantity, p.unitValue), 0)
                : toCents(guide.totalValue);

        const body: Record<string, any> = {
            'ans:cabecalhoGuia': this.buildGuideHeader(guide, ansCode),
            'ans:dadosBeneficiario': this.buildBeneficiaryData(guide.beneficiary),
            'ans:dadosProcedimento': this.buildProcedures(guide.procedures),
            'ans:valorTotal': {
                'ans:valorProcedimentos': formatCentsTiss(totalCents),
                'ans:valorTotalGeral': formatCentsTiss(totalCents),
            },
        };

        if (guide.authorizationCode) {
            body['ans:dadosAutorizacao'] = {
                'ans:senha': guide.authorizationCode,
            };
        }

        if (guide.observations) {
            body['ans:observacao'] = String(guide.observations).slice(0, 500);
        }

        return {
            [guideTag]: body,
        };
    }

    private buildGuideHeader(guide: TissGuideData, ansCode: string): Record<string, any> {
        return {
            'ans:registroANS': ansCode,
            'ans:numeroGuiaPrestador': String(guide.guideNumber || '').slice(0, 20),
            'ans:dataEmissao': this.formatDate(new Date(guide.issueDate)),
        };
    }

    /**
     * Padrão ANS TISS 4.01/4.02 LGPD:
     * Em 4.02.00 omite nomeBeneficiario (minimização LGPD oficial ANS — sem inventar tags fora do XSD).
     */
    private buildBeneficiaryData(beneficiary: TissBeneficiary): Record<string, any> {
        const cardClean = String(beneficiary.cardNumber || '').replace(/\s+/g, '');
        const base: Record<string, any> = {
            'ans:numeroCarteira': cardClean,
            'ans:atendimentoRN': beneficiary.atendimentoRN || 'N',
        };

        if (this.version === '4.01.00' && beneficiary.fullName) {
            base['ans:nomeBeneficiario'] = String(beneficiary.fullName).slice(0, 70);
        }

        if (beneficiary.cns) {
            base['ans:numeroCNS'] = String(beneficiary.cns).replace(/\D/g, '').slice(0, 15);
        }

        return base;
    }

    private buildProcedures(procedures: TissProcedure[]): any[] {
        return (procedures || []).map((proc, index) => {
            const unitCents = toCents(proc.unitValue);
            const totalCents = multiplyQtyUnitCents(proc.quantity, proc.unitValue);

            return {
                'ans:sequencialItem': index + 1,
                'ans:dataExecucao': this.formatDate(new Date(proc.executionDate)),
                'ans:procedimento': {
                    'ans:codigoTabela': proc.tableCode || '22',
                    'ans:codigoProcedimento': normalizeTuss8Digits(proc.code),
                    'ans:descricaoProcedimento': String(proc.description || 'Procedimento').slice(0, 150),
                },
                'ans:quantidadeExecutada': proc.quantity,
                'ans:valorUnitario': formatCentsTiss(unitCents),
                'ans:valorTotal': formatCentsTiss(totalCents),
            };
        });
    }

    private mapGuideTagName(type: TissGuideData['type']): string {
        const typeMap: Record<TissGuideData['type'], string> = {
            CONSULTA: 'ans:guiaConsulta',
            'SP/SADT': 'ans:guiaSP-SADT',
            INTERNACAO: 'ans:guiaResumoInternacao',
            HONORARIOS: 'ans:guiaHonorarios',
            ODONTO: 'ans:guiaOdonto',
        };

        return typeMap[type] || 'ans:guiaSP-SADT';
    }

    private formatDate(date: Date): string {
        if (Number.isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
    }

    private formatTime(date: Date): string {
        if (Number.isNaN(date.getTime())) {
            return '00:00:00';
        }
        return date.toTimeString().split(' ')[0];
    }
}

export function createTissGenerator(
    version?: TissVersion,
    hashAlgorithm?: TissHashAlgorithm
): TissXMLGeneratorV2 {
    return new TissXMLGeneratorV2(version, hashAlgorithm);
}
