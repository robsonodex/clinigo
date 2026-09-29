/**
 * CLINIGO - TISS XSD Validation Adapter
 * 
 * Adaptador de validação com três modos de operação:
 * 1. XSD_PARCIAL: Ativado quando arquivos .xsd estão presentes e são validados via motor WASM (xmllint-wasm)
 * 2. XSD_NAO_SUPORTADO: Ativado quando o schema XSD contém construções externas ou não suportadas (FALHA FECHADO - NUNCA APROVA)
 * 3. ESTRUTURAL: Modo de validação estrutural e semântica interna simplificada (fallback ativo)
 * 
 * Justificativa técnica:
 * Motor WebAssembly nativo compilado da libxml2 (xmllint-wasm), com bundle de apenas 0.83 MB,
 * sem dependências C++ nativas de sistema operacional (node-gyp), compatível com Node.js e Serverless.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getTISSXSDValidator, XSDValidationError } from './tiss-xsd-validator';

export type ValidationMode = 'XSD_PARCIAL' | 'XSD_NAO_SUPORTADO' | 'ESTRUTURAL';

export interface AdapterValidationResult {
    valid: boolean;
    errors: XSDValidationError[];
    schemaVersion: string;
    validatedAt: string;
    validation_mode: ValidationMode;
    disclaimer: string;
    schemaFile?: string;
    unsupportedConstructs?: string[];
}

export class TissXsdAdapter {
    private schemasDir: string;

    constructor(customSchemasDir?: string) {
        this.schemasDir = customSchemasDir || path.join(process.cwd(), 'lib', 'services', 'tiss', 'schemas');
    }

    /**
     * Verifica se existem arquivos .xsd no diretório de schemas
     */
    public hasXsdSchemas(): boolean {
        try {
            if (!fs.existsSync(this.schemasDir)) {
                return false;
            }
            const files = fs.readdirSync(this.schemasDir);
            return files.some((f) => f.toLowerCase().endsWith('.xsd'));
        } catch {
            return false;
        }
    }

    /**
     * Alias retrocompatível
     */
    public hasOfficialSchemas(): boolean {
        return this.hasXsdSchemas();
    }

    /**
     * Obtém lista de arquivos XSD disponíveis
     */
    public getAvailableXsdFiles(): string[] {
        try {
            if (!fs.existsSync(this.schemasDir)) {
                return [];
            }
            return fs.readdirSync(this.schemasDir).filter((f) => f.toLowerCase().endsWith('.xsd'));
        } catch {
            return [];
        }
    }

    /**
     * Validação do XML utilizando XSD se presente, ou fallback estrutural
     */
    public async validate(xmlContent: string, requestedVersion?: string): Promise<AdapterValidationResult> {
        const xsdFiles = this.getAvailableXsdFiles();

        if (xsdFiles.length > 0) {
            return this.validateWithXsd(xmlContent, xsdFiles, requestedVersion);
        }

        return this.validateStructural(xmlContent);
    }

    /**
     * Executa a validação XSD quando arquivos .xsd estão presentes (via xmllint-wasm)
     */
    public async validateWithXsd(
        xmlContent: string,
        xsdFiles: string[],
        requestedVersion?: string
    ): Promise<AdapterValidationResult> {
        const validatedAt = new Date().toISOString();
        const schemaFileName = xsdFiles[0];
        const schemaPath = path.join(this.schemasDir, schemaFileName);

        let schemaContent: string;
        try {
            schemaContent = fs.readFileSync(schemaPath, 'utf8');
        } catch (err: any) {
            return {
                valid: false,
                errors: [{ code: 'SCHEMA_READ_ERROR', field: 'schema', message: `Erro ao ler schema XSD: ${err.message}` }],
                schemaVersion: requestedVersion || 'unknown',
                validatedAt,
                validation_mode: 'XSD_NAO_SUPORTADO',
                disclaimer: 'Falha ao carregar schema XSD',
            };
        }

        // Inspeção de segurança prévia: Detectar construções não suportadas (FALHA FECHADO)
        const unsupportedConstructs: string[] = [];

        // Exemplo: imports com links HTTP externos que exigiriam rede em runtime
        if (/schemaLocation\s*=\s*["']https?:\/\//i.test(schemaContent)) {
            unsupportedConstructs.push('External network schemaLocation (HTTP/HTTPS import não permitido offline)');
        }
        // Exemplo: DTD entities não permitidas
        if (/<!DOCTYPE/i.test(schemaContent) || /<!ENTITY/i.test(schemaContent)) {
            unsupportedConstructs.push('DTD Entity Declaration (proibido por diretriz de segurança XXE)');
        }

        if (unsupportedConstructs.length > 0) {
            return {
                valid: false,
                errors: unsupportedConstructs.map((c) => ({
                    code: 'XSD_UNSUPPORTED_CONSTRUCT',
                    field: 'schema',
                    message: `Construção XSD não suportada pelo motor seguro: ${c}`,
                })),
                schemaVersion: requestedVersion || schemaFileName,
                validatedAt,
                validation_mode: 'XSD_NAO_SUPORTADO',
                disclaimer: 'Schema contém construções não suportadas ou inseguras. Validação rejeitada (Fail-Closed).',
                schemaFile: schemaFileName,
                unsupportedConstructs,
            };
        }

        // Executar validação com xmllint-wasm
        try {
            const xmllint = require('xmllint-wasm');
            const result = await xmllint.validateXML({
                xml: xmlContent,
                schema: schemaContent,
            });

            if (result.valid) {
                return {
                    valid: true,
                    errors: [],
                    schemaVersion: requestedVersion || schemaFileName,
                    validatedAt,
                    validation_mode: 'XSD_PARCIAL',
                    disclaimer: 'Validação realizada contra schema XSD fornecido (modo parcial; não homologado ANS).',
                    schemaFile: schemaFileName,
                };
            }

            const mappedErrors: XSDValidationError[] = (result.errors || []).map((e: any, idx: number) => ({
                code: 'XSD_SCHEMA_ERROR',
                field: e.message && e.message.includes("Element '") ? (e.message.match(/Element '([^']+)'/) || [])[1] || 'xml' : 'xml',
                message: e.message || e.rawMessage || `Erro de validação XSD #${idx + 1}`,
                line: e.loc?.line,
                column: e.loc?.col,
            }));

            return {
                valid: false,
                errors: mappedErrors.length > 0 ? mappedErrors : [{ code: 'XSD_INVALID', field: 'xml', message: result.rawOutput || 'XML inválido contra o schema XSD' }],
                schemaVersion: requestedVersion || schemaFileName,
                validatedAt,
                validation_mode: 'XSD_PARCIAL',
                disclaimer: 'Validação realizada contra schema XSD fornecido (erros detectados).',
                schemaFile: schemaFileName,
            };
        } catch (err: any) {
            return {
                valid: false,
                errors: [
                    {
                        code: 'XSD_ENGINE_EXCEPTION',
                        field: 'engine',
                        message: `Exceção do motor de validação XSD: ${err.message}`,
                    },
                ],
                schemaVersion: requestedVersion || schemaFileName,
                validatedAt,
                validation_mode: 'XSD_NAO_SUPORTADO',
                disclaimer: 'Exceção interna ao processar schema XSD. Falha fechada.',
                schemaFile: schemaFileName,
            };
        }
    }

    /**
     * Validação estrutural de fallback (sem XSD presente)
     */
    public async validateStructural(xmlContent: string): Promise<AdapterValidationResult> {
        const validator = getTISSXSDValidator();
        const res = await validator.validateXML(xmlContent);

        return {
            valid: res.valid,
            errors: res.errors,
            schemaVersion: res.schemaVersion,
            validatedAt: res.validatedAt,
            validation_mode: 'ESTRUTURAL',
            disclaimer: 'Validação estrutural simplificada (não substitui a validação oficial da operadora)',
        };
    }
}

let adapterInstance: TissXsdAdapter | null = null;
export function getTissXsdAdapter(): TissXsdAdapter {
    if (!adapterInstance) {
        adapterInstance = new TissXsdAdapter();
    }
    return adapterInstance;
}
