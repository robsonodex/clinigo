/**
 * TISS Version Type Definitions
 * 
 * Supports dual TISS version system (4.01.00 and 4.02.00) as mandated by ANS.
 * Version 4.02.00 becomes mandatory on December 1, 2025 (RN 590/2023).
 * 
 * Key Changes in 4.02.00:
 * - LGPD Compliance: Patient full name replaced with initials
 * - Extended TUSS codes: 8 → 10 digits
 * - Additional validation rules for data privacy
 * - New metadata fields for compliance tracking
 * 
 * @see https://www.ans.gov.br/prestadores/tiss-troca-de-informacao-de-saude-suplementar/padrao-tiss
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Supported TISS versions
 * 
 * - **4.01.00**: Current standard (valid until Nov 30, 2025)
 * - **4.02.00**: New standard (mandatory from Dec 1, 2025)
 */
export type TissVersion = '4.01.00' | '4.02.00';

/**
 * Configuration object for each TISS version
 */
export interface TissVersionConfig {
    /** Version identifier */
    version: TissVersion;

    /** XML namespace URI for this version */
    xmlNamespace: string;

    /** XSD schema location for validation */
    schemaLocation: string;

    /** Validation rule codes supported in this version */
    validationRules: string[];

    /** Guide types supported (some are version-specific) */
    supportedGuideTypes: string[];

    /** Whether this version includes LGPD compliance features */
    lgpdCompliant: boolean;

    /** TUSS code format (number of digits) */
    tussCodeLength: 8 | 10;

    /** Effective date when this version becomes mandatory */
    mandatoryFrom?: Date;

    /** Deprecated date (when this version should no longer be used) */
    deprecatedFrom?: Date;
}

// ============================================================================
// Version Configurations
// ============================================================================

/**
 * Complete configuration for all supported TISS versions
 * 
 * Use this constant to access version-specific settings throughout the app.
 * 
 * @example
 * ```ts
 * const config = TISS_VERSION_CONFIGS['4.02.00'];
 * console.log(config.xmlNamespace);
 * // => 'http://www.ans.gov.br/padroes/tiss/schemas/v4_02_00'
 * ```
 */
export const TISS_VERSION_CONFIGS: Record<TissVersion, TissVersionConfig> = {
    '4.01.00': {
        version: '4.01.00',
        xmlNamespace: 'http://www.ans.gov.br/padroes/tiss/schemas/v4_01_00',
        schemaLocation: 'http://www.ans.gov.br/padroes/tiss/schemas/v4_01_00/tissV4_01_00.xsd',
        validationRules: [
            'V001', // Número de guia obrigatório
            'V002', // Data de emissão válida
            'V003', // Dados do beneficiário completos
            'V004', // Código do procedimento válido (TUSS)
            'V005', // Valor total consistente
            'V006', // Dados do prestador completos
            'V007', // Assinatura digital (quando aplicável)
            'V008', // Dados da solicitação
            'V009', // CID-10 válido
            'V010', // Quantidade de procedimentos
        ],
        supportedGuideTypes: [
            'CONSULTA',           // Guia de consulta
            'SP/SADT',            // Serviços Profissionais / SADT
            'INTERNACAO',         // Internação hospitalar
            'HONORARIOS',         // Guia de honorários
            'ODONTO',             // Odontologia
        ],
        lgpdCompliant: false,
        tussCodeLength: 8,
        deprecatedFrom: new Date('2025-12-01'), // Obsoleto a partir de dez/2025
    },

    '4.02.00': {
        version: '4.02.00',
        xmlNamespace: 'http://www.ans.gov.br/padroes/tiss/schemas/v4_02_00',
        schemaLocation: 'http://www.ans.gov.br/padroes/tiss/schemas/v4_02_00/tissV4_02_00.xsd',
        validationRules: [
            'V001', 'V002', 'V003', 'V004', 'V005',
            'V006', 'V007', 'V008', 'V009', 'V010',
            'V011', // LGPD: Validação de consentimento de dados
            'V012', // LGPD: Validação de anonimização (iniciais)
            'V013', // Códigos TUSS expandidos (10 dígitos)
            'V014', // Rastreabilidade de alterações
        ],
        supportedGuideTypes: [
            'CONSULTA',
            'SP/SADT',
            'INTERNACAO',
            'HONORARIOS',
            'ODONTO',
            'TRATAMENTO_ODONTO',  // Novo tipo em 4.02.00
        ],
        lgpdCompliant: true,
        tussCodeLength: 10,
        mandatoryFrom: new Date('2025-12-01'), // Obrigatório a partir de dez/2025
    },
};

// ============================================================================
// Version Differences Documentation
// ============================================================================

/**
 * Interface documenting a specific difference between TISS versions
 */
export interface TissVersionDifference {
    /** Field or element name affected */
    field: string;

    /** Behavior in TISS 4.01.00 */
    v4_01_00: string | null;

    /** Behavior in TISS 4.02.00 */
    v4_02_00: string | null;

    /** Whether this is a breaking change requiring code updates */
    breaking: boolean;

    /** Human-readable description of the change */
    description: string;

    /** Category of change */
    category: 'LGPD' | 'TUSS' | 'VALIDATION' | 'STRUCTURE' | 'METADATA';
}

/**
 * Comprehensive list of differences between TISS 4.01.00 and 4.02.00
 * 
 * **Critical for compliance**: Review all breaking changes before enabling 4.02.00
 */
export const TISS_VERSION_DIFFERENCES: TissVersionDifference[] = [
    // LGPD Changes (Privacy Compliance)
    {
        field: 'nomeBeneficiario',
        v4_01_00: 'OBRIGATÓRIO - Nome completo (ex: João da Silva)',
        v4_02_00: 'REMOVIDO - Campo não deve existir no XML',
        breaking: true,
        description: 'Para conformidade LGPD, o nome completo do beneficiário não é mais transmitido nas guias TISS',
        category: 'LGPD',
    },
    {
        field: 'iniciaisBeneficiario',
        v4_01_00: null,
        v4_02_00: 'OBRIGATÓRIO - Apenas iniciais (ex: J.S.)',
        breaking: true,
        description: 'Novo campo obrigatório contendo apenas as iniciais do nome do beneficiário, sem preposições',
        category: 'LGPD',
    },
    {
        field: 'consentimentoLGPD',
        v4_01_00: null,
        v4_02_00: 'OBRIGATÓRIO - Flag booleana de consentimento',
        breaking: true,
        description: 'Indica se o beneficiário consentiu com o tratamento de dados conforme LGPD',
        category: 'LGPD',
    },

    // TUSS Code Changes
    {
        field: 'codigoProcedimento',
        v4_01_00: 'Código TUSS com 8 dígitos (ex: 10101012)',
        v4_02_00: 'Código TUSS com 10 dígitos (ex: 1010101201)',
        breaking: true,
        description: 'Tabela TUSS expandida para 10 dígitos permitindo maior granularidade de procedimentos',
        category: 'TUSS',
    },
    {
        field: 'codigoMaterial',
        v4_01_00: 'Código de material com 8 dígitos',
        v4_02_00: 'Código de material com 10 dígitos',
        breaking: false,
        description: 'Materiais e medicamentos também migram para 10 dígitos',
        category: 'TUSS',
    },

    // Structural Changes
    {
        field: 'numeroCarteira',
        v4_01_00: 'Até 20 caracteres alfanuméricos',
        v4_02_00: 'Até 30 caracteres alfanuméricos',
        breaking: false,
        description: 'Tamanho máximo do número da carteirinha aumentado para suportar novos formatos',
        category: 'STRUCTURE',
    },
    {
        field: 'versaoAplicativo',
        v4_01_00: 'Opcional',
        v4_02_00: 'OBRIGATÓRIO - Identificação do software emissor',
        breaking: false,
        description: 'Rastreabilidade: sistema emissor deve se identificar',
        category: 'METADATA',
    },
    {
        field: 'conformidadeLGPD',
        v4_01_00: null,
        v4_02_00: 'OBRIGATÓRIO - Flag de conformidade LGPD',
        breaking: true,
        description: 'Campo booleano indicando que o XML está em conformidade com a LGPD',
        category: 'LGPD',
    },

    // Validation Changes
    {
        field: 'validacaoAssinaturaDigital',
        v4_01_00: 'Validação básica de certificado A1/A3',
        v4_02_00: 'Validação estendida incluindo timestamp',
        breaking: false,
        description: 'Assinaturas digitais devem incluir timestamp para não-repúdio',
        category: 'VALIDATION',
    },
    {
        field: 'hashDocumento',
        v4_01_00: null,
        v4_02_00: 'OBRIGATÓRIO - SHA-256 do XML',
        breaking: false,
        description: 'Hash criptográfico do documento para garantir integridade',
        category: 'VALIDATION',
    },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get configuration for a specific TISS version
 * 
 * @param version - TISS version to retrieve config for
 * @returns Configuration object for the specified version
 * 
 * @example
 * ```ts
 * const config = getTissConfig('4.02.00');
 * console.log(config.lgpdCompliant); // => true
 * ```
 */
export function getTissConfig(version: TissVersion): TissVersionConfig {
    return TISS_VERSION_CONFIGS[version];
}

/**
 * Check if a TISS version is currently valid (not deprecated)
 * 
 * @param version - Version to check
 * @param referenceDate - Date to check against (defaults to now)
 * @returns True if version is still valid
 * 
 * @example
 * ```ts
 * isVersionValid('4.01.00'); // false (if after Dec 2025)
 * isVersionValid('4.02.00'); // true
 * ```
 */
export function isVersionValid(
    version: TissVersion,
    referenceDate: Date = new Date()
): boolean {
    const config = getTissConfig(version);

    if (config.deprecatedFrom && referenceDate >= config.deprecatedFrom) {
        return false;
    }

    return true;
}

/**
 * Get the recommended TISS version for a given date
 * 
 * @param referenceDate - Date to check (defaults to now)
 * @returns Recommended version for the given date
 * 
 * @example
 * ```ts
 * getRecommendedVersion(new Date('2025-11-30')); // => '4.01.00'
 * getRecommendedVersion(new Date('2025-12-01')); // => '4.02.00'
 * ```
 */
export function getRecommendedVersion(referenceDate: Date = new Date()): TissVersion {
    const transitionDate = new Date('2025-12-01');
    return referenceDate >= transitionDate ? '4.02.00' : '4.01.00';
}

/**
 * Get breaking changes between two TISS versions
 * 
 * @returns Array of breaking changes only
 */
export function getBreakingChanges(): TissVersionDifference[] {
    return TISS_VERSION_DIFFERENCES.filter(diff => diff.breaking);
}

/**
 * Get changes by category
 * 
 * @param category - Category to filter by
 * @returns Array of changes in the specified category
 */
export function getChangesByCategory(
    category: TissVersionDifference['category']
): TissVersionDifference[] {
    return TISS_VERSION_DIFFERENCES.filter(diff => diff.category === category);
}

/**
 * Format TUSS code to the correct length for a TISS version
 * 
 * @param code - TUSS code (any length)
 * @param version - Target TISS version
 * @returns Formatted code with correct padding
 * 
 * @example
 * ```ts
 * formatTussCode('10101012', '4.01.00');   // => '10101012' (8 digits)
 * formatTussCode('10101012', '4.02.00');   // => '1010101200' (10 digits)
 * formatTussCode('123', '4.02.00');        // => '0000000123' (10 digits)
 * ```
 */
export function formatTussCode(code: string, version: TissVersion): string {
    const config = getTissConfig(version);
    const length = config.tussCodeLength;

    // Remove non-numeric characters
    const numericCode = code.replace(/\D/g, '');

    // Pad with zeros on the left
    return numericCode.padStart(length, '0').slice(0, length);
}

/**
 * Extract initials from full name (for LGPD compliance in 4.02.00)
 * 
 * Ignores prepositions (de, da, do, dos, das, e)
 * 
 * @param fullName - Complete name
 * @returns Initials formatted with dots (ex: "J.S.")
 * 
 * @example
 * ```ts
 * getInitials('João da Silva');           // => 'J.S.'
 * getInitials('Maria de Souza Santos');   // => 'M.S.S.'
 * getInitials('Ana E. Costa');            // => 'A.E.C.'
 * ```
 */
export function getInitials(fullName: string): string {
    const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e'];

    return fullName
        .trim()
        .split(/\s+/)
        .filter(part => {
            // Ignore short parts and prepositions
            if (part.length <= 1) return false;
            if (prepositions.includes(part.toLowerCase())) return false;
            return true;
        })
        .map(part => part[0].toUpperCase())
        .join('.');
}

/**
 * Validate if a string is a valid TISS version
 * 
 * @param version - String to validate
 * @returns True if valid TISS version
 */
export function isValidTissVersion(version: string): version is TissVersion {
    return version === '4.01.00' || version === '4.02.00';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Date when TISS 4.02.00 becomes mandatory
 */
export const TISS_TRANSITION_DATE = new Date('2025-12-01T00:00:00Z');

/**
 * Default TISS version (safest option during transition period)
 */
export const DEFAULT_TISS_VERSION: TissVersion = '4.01.00';

/**
 * All supported TISS versions (for dropdowns, etc.)
 */
export const SUPPORTED_TISS_VERSIONS: TissVersion[] = ['4.01.00', '4.02.00'];
