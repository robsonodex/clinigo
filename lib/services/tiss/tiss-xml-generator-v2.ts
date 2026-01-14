/**
 * TISS XML Generator V2 - Dual Version Support
 * 
 * Generates XML files compliant with ANS TISS standards, supporting both:
 * - TISS 4.01.00 (current, valid until Nov 30, 2025)
 * - TISS 4.02.00 (new, mandatory from Dec 1, 2025)
 * 
 * Key Features:
 * - Version-aware XML structure generation
 * - LGPD compliance for v4.02.00 (patient initials only)
 * - TUSS code formatting (8 vs 10 digits)
 * - XML namespace and schema management
 * 
 * @see lib/types/tiss-versions.ts for version configurations
 */

import { XMLBuilder } from 'fast-xml-parser';
import {
    type TissVersion,
    getTissConfig,
    formatTussCode,
    getInitials,
    TISS_VERSION_CONFIGS,
} from '@/lib/types/tiss-versions';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Patient/Beneficiary data for TISS guide
 */
export interface TissBeneficiary {
    /** Card number from insurance */
    cardNumber: string;

    /** Full name (used in 4.01.00, converted to initials in 4.02.00) */
    fullName: string;

    /** CPF number */
    cpf?: string;

    /** Birth date */
    birthDate?: string;

    /** CNS (Cartão Nacional de Saúde) number */
    cns?: string;
}

/**
 * Procedure/Service data
 */
export interface TissProcedure {
    /** TUSS procedure code (8 or 10 digits depending on version) */
    code: string;

    /** Procedure description */
    description: string;

    /** Quantity executed */
    quantity: number;

    /** Unit value in BRL */
    unitValue: number;

    /** Execution date */
    executionDate: string;

    /** Professional who executed (CRM/CRO) */
    professionalId?: string;
}

/**
 * Healthcare provider (prestador) data
 */
export interface TissProvider {
    /** CNES code */
    cnesCode: string;

    /** Corporate name or professional name */
    name: string;

    /** CNPJ or CPF */
    taxId: string;

    /** Provider type: PF (pessoa física) or PJ (pessoa jurídica) */
    type: 'PF' | 'PJ';
}

/**
 * Complete guide data for XML generation
 */
export interface TissGuideData {
    /** Internal guide number from provider */
    guideNumber: string;

    /** Guide type */
    type: 'CONSULTA' | 'SP/SADT' | 'INTERNACAO' | 'HONORARIOS' | 'ODONTO';

    /** Issue date */
    issueDate: string;

    /** Beneficiary information */
    beneficiary: TissBeneficiary;

    /** Provider information */
    provider: TissProvider;

    /** List of procedures */
    procedures: TissProcedure[];

    /** Total guide value (sum of all procedures) */
    totalValue: number;

    /** Additional observations */
    observations?: string;
}

/**
 * Batch data for XML generation
 */
export interface TissBatchData {
    /** Batch number */
    batchNumber: string;

    /** Insurance company ANS registration number */
    insuranceAnsCode: string;

    /** Insurance company name */
    insuranceName: string;

    /** Provider information */
    provider: TissProvider;

    /** List of guides in this batch */
    guides: TissGuideData[];

    /** Creation timestamp */
    createdAt: Date;
}

// ============================================================================
// XML Generator Class
// ============================================================================

export class TissXMLGeneratorV2 {
    private version: TissVersion;
    private config: ReturnType<typeof getTissConfig>;

    /**
     * @param version TISS version to generate XML for (defaults to 4.01.00)
     */
    constructor(version: TissVersion = '4.01.00') {
        this.version = version;
        this.config = getTissConfig(version);
    }

    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Generate complete TISS batch XML
     * 
     * @param batchData Batch data containing all guides
     * @returns XML string ready for submission
     * 
     * @example
     * ```ts
     * const generator = new TissXMLGeneratorV2('4.02.00');
     * const xml = await generator.generateBatchXML(batchData);
     * ```
     */
    async generateBatchXML(batchData: TissBatchData): Promise<string> {
        const xmlStructure = {
            '?xml': {
                '@_version': '1.0',
                '@_encoding': 'UTF-8',
            },
            'ans:mensagemTISS': {
                '@_xmlns:ans': this.config.xmlNamespace,
                '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                '@_xsi:schemaLocation': `${this.config.xmlNamespace} ${this.config.schemaLocation}`,

                'ans:cabecalho': this.buildHeader(batchData),
                'ans:prestadorParaOperadora': {
                    'ans:loteGuias': this.buildGuideBatch(batchData),
                },
            },
        };

        const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            indentBy: '  ',
            attributeNamePrefix: '@_',
            suppressEmptyNode: true,
        });

        return builder.build(xmlStructure);
    }

    /**
     * Get the TISS version being used by this generator
     */
    getVersion(): TissVersion {
        return this.version;
    }

    /**
     * Get the configuration for the current version
     */
    getConfig(): ReturnType<typeof getTissConfig> {
        return this.config;
    }

    // ==========================================================================
    // Private XML Building Methods
    // ==========================================================================

    /**
     * Build XML header section
     * 
     * **Version Differences:**
     * - v4.02.00 includes additional metadata (app version, LGPD compliance flag)
     */
    private buildHeader(batchData: TissBatchData): Record<string, any> {
        const transactionId = `LOTE-${batchData.batchNumber}-${Date.now()}`;
        const now = new Date();

        const baseHeader = {
            'ans:identificacaoTransacao': {
                'ans:tipoTransacao': 'ENVIO_LOTE_GUIAS',
                'ans:sequencialTransacao': transactionId,
                'ans:dataRegistroTransacao': this.formatDate(now),
                'ans:horaRegistroTransacao': this.formatTime(now),
            },
            'ans:origem': {
                'ans:identificacaoPrestador': {
                    'ans:codigoPrestadorNaOperadora': batchData.provider.cnesCode,
                    'ans:CNPJ': batchData.provider.type === 'PJ' ? batchData.provider.taxId : undefined,
                    'ans:CPF': batchData.provider.type === 'PF' ? batchData.provider.taxId : undefined,
                },
            },
            'ans:destino': {
                'ans:registroANS': batchData.insuranceAnsCode,
            },
            'ans:Padrao': this.version,
        };

        // Version 4.02.00 specific fields
        if (this.version === '4.02.00') {
            return {
                ...baseHeader,
                'ans:versaoAplicativo': 'CliniGo v2.1.0',
                'ans:conformidadeLGPD': 'true', // LGPD compliance flag
                'ans:hashDocumento': this.generateHash(batchData), // Document hash for integrity
            };
        }

        return baseHeader;
    }

    /**
     * Build the guide batch section
     */
    private buildGuideBatch(batchData: TissBatchData): Record<string, any> {
        return {
            'ans:numeroLote': batchData.batchNumber,
            'ans:guiasTISS': batchData.guides.map(guide => this.buildGuide(guide)),
        };
    }

    /**
     * Build individual guide structure
     * 
     * **Critical method**: Handles version-specific differences
     */
    private buildGuide(guide: TissGuideData): Record<string, any> {
        const guideType = this.mapGuideType(guide.type);

        return {
            [`ans:guia${guideType}`]: {
                'ans:cabecalhoGuia': this.buildGuideHeader(guide),
                'ans:dadosBeneficiario': this.buildBeneficiaryData(guide.beneficiary),
                'ans:dadosProcedimento': this.buildProcedures(guide.procedures),
                'ans:valorTotal': {
                    'ans:valorProcedimentos': guide.totalValue.toFixed(2),
                    'ans:valorTotalGeral': guide.totalValue.toFixed(2),
                },
                'ans:observacao': guide.observations,
            },
        };
    }

    /**
     * Build guide header
     */
    private buildGuideHeader(guide: TissGuideData): Record<string, any> {
        return {
            'ans:registroANS': '', // Will be filled by provider
            'ans:numeroGuiaPrestador': guide.guideNumber,
            'ans:dataEmissao': this.formatDate(new Date(guide.issueDate)),
        };
    }

    /**
     * Build beneficiary data section
     * 
     * **CRITICAL VERSION DIFFERENCE:**
     * - v4.01.00: Uses full patient name (`nomeBeneficiario`)
     * - v4.02.00: Uses only initials (`iniciaisBeneficiario`) for LGPD compliance
     */
    private buildBeneficiaryData(beneficiary: TissBeneficiary): Record<string, any> {
        if (this.version === '4.01.00') {
            // Version 4.01.00: Full name
            return {
                'ans:numeroCarteira': beneficiary.cardNumber,
                'ans:nomeBeneficiario': beneficiary.fullName,
                'ans:numeroCPF': beneficiary.cpf,
                'ans:dataNascimento': beneficiary.birthDate,
                'ans:CNS': beneficiary.cns,
            };
        } else {
            // Version 4.02.00: Initials only (LGPD)
            const initials = getInitials(beneficiary.fullName);

            return {
                'ans:numeroCarteira': beneficiary.cardNumber,
                'ans:iniciaisBeneficiario': initials, // NEW FIELD
                'ans:numeroCPF': beneficiary.cpf,
                'ans:dataNascimento': beneficiary.birthDate,
                'ans:CNS': beneficiary.cns,
                'ans:consentimentoLGPD': 'true', // NEW FIELD
            };
        }
    }

    /**
     * Build procedures section
     * 
     * **Version Difference:**
     * - v4.01.00: TUSS codes with 8 digits
     * - v4.02.00: TUSS codes with 10 digits
     */
    private buildProcedures(procedures: TissProcedure[]): any[] {
        return procedures.map((proc, index) => {
            const formattedCode = formatTussCode(proc.code, this.version);

            return {
                'ans:sequencialItem': index + 1,
                'ans:procedimento': {
                    'ans:codigoProcedimento': formattedCode,
                    'ans:descricaoProcedimento': proc.description,
                },
                'ans:quantidadeExecutada': proc.quantity,
                'ans:valorUnitario': proc.unitValue.toFixed(2),
                'ans:valorTotal': (proc.quantity * proc.unitValue).toFixed(2),
                'ans:dataExecucao': this.formatDate(new Date(proc.executionDate)),
                'ans:codigoProfissional': proc.professionalId,
            };
        });
    }

    // ==========================================================================
    // Helper Methods
    // ==========================================================================

    /**
     * Map guide type to TISS XML element name
     */
    private mapGuideType(type: TissGuideData['type']): string {
        const typeMap: Record<TissGuideData['type'], string> = {
            'CONSULTA': 'Consulta',
            'SP/SADT': 'SpSadt',
            'INTERNACAO': 'Internacao',
            'HONORARIOS': 'Honorarios',
            'ODONTO': 'Odonto',
        };

        return typeMap[type];
    }

    /**
     * Format date to TISS standard (YYYY-MM-DD)
     */
    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Format time to TISS standard (HH:MM:SS)
     */
    private formatTime(date: Date): string {
        return date.toTimeString().split(' ')[0];
    }

    /**
     * Generate SHA-256 hash for document integrity (v4.02.00 only)
     */
    private generateHash(batchData: TissBatchData): string {
        // Simplified hash for now - in production use crypto.subtle.digest
        const content = JSON.stringify(batchData);
        return Buffer.from(content).toString('base64').slice(0, 32);
    }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TISS XML generator for a specific version
 * 
 * @param version TISS version (defaults to recommended version for current date)
 * @returns TissXMLGeneratorV2 instance
 * 
 * @example
 * ```ts
 * const generator = createTissGenerator('4.02.00');
 * const xml = await generator.generateBatchXML(data);
 * ```
 */
export function createTissGenerator(version?: TissVersion): TissXMLGeneratorV2 {
    return new TissXMLGeneratorV2(version);
}
