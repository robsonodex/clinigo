// lib/services/tiss/xml-generator.ts
import type { TissBatch, TissGuide } from '@/types/tiss';

/**
 * Gerador de XML TISS 4.02.00
 * Gera XML conforme padrão ANS para envio às operadoras
 */

interface XMLGeneratorOptions {
    includeHeader: boolean;
    encoding: 'UTF-8' | 'ISO-8859-1';
}

export class TissXMLGenerator {
    private options: XMLGeneratorOptions;

    constructor(options?: Partial<XMLGeneratorOptions>) {
        this.options = {
            includeHeader: true,
            encoding: 'UTF-8',
            ...options,
        };
    }

    /**
     * Gera XML completo de um lote TISS
     */
    public generateBatchXML(
        batch: TissBatch,
        guides: TissGuide[],
        clinic: any,
        operadora: any
    ): string {
        const xml: string[] = [];

        // Header XML
        if (this.options.includeHeader) {
            xml.push(`<?xml version="1.0" encoding="${this.options.encoding}"?>`);
        }

        // Root element
        xml.push('<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');

        // Cabeçalho
        xml.push('  <ans:cabecalho>');
        xml.push(`    <ans:identificadorTransacao>${this.generateTransactionId()}</ans:identificadorTransacao>`);
        xml.push('    <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>');
        xml.push(`    <ans:sequencialTransacao>${batch.batch_number}</ans:sequencialTransacao>`);
        xml.push(`    <ans:dataEnvio>${this.formatDate(new Date())}</ans:dataEnvio>`);
        xml.push(`    <ans:horaEnvio>${this.formatTime(new Date())}</ans:horaEnvio>`);
        xml.push('    <ans:Padrao>4.02.00</ans:Padrao>');

        // Prestador (Clínica)
        xml.push('    <ans:prestador>');
        xml.push(`      <ans:codigoPrestadorNaOperadora>${clinic.operadora_code || '000000'}</ans:codigoPrestadorNaOperadora>`);
        xml.push(`      <ans:nomeContratado>${this.escapeXML(clinic.name)}</ans:nomeContratado>`);
        xml.push(`      <ans:CNPJContratado>${clinic.cnpj?.replace(/\D/g, '') || '00000000000000'}</ans:CNPJContratado>`);
        xml.push('    </ans:prestador>');

        // Operadora
        xml.push('    <ans:operadora>');
        xml.push(`      <ans:codigoOperadoraANS>${operadora.code || '000000'}</ans:codigoOperadoraANS>`);
        xml.push(`      <ans:nomeOperadora>${this.escapeXML(operadora.name)}</ans:nomeOperadora>`);
        xml.push('    </ans:operadora>');

        xml.push('  </ans:cabecalho>');

        // Lote de Guias
        xml.push('  <ans:loteGuias>');
        xml.push(`    <ans:numeroLote>${batch.batch_number}</ans:numeroLote>`);

        // Iterar sobre cada guia
        for (const guide of guides) {
            xml.push(this.generateGuideXML(guide));
        }

        xml.push('  </ans:loteGuias>');

        // Hash do XML (para integridade)
        // xml.push(`  <ans:hash>${this.generateHash(xml.join(''))}</ans:hash>`);

        xml.push('</ans:mensagemTISS>');

        return xml.join('\n');
    }

    /**
     * Gera XML de uma guia individual
     */
    private generateGuideXML(guide: TissGuide): string {
        const xml: string[] = [];

        xml.push(`    <ans:guia tipoGuia="${guide.guide_type}">`);

        // Número da guia
        xml.push(`      <ans:numeroGuiaPrestador>${guide.guide_number}</ans:numeroGuiaPrestador>`);
        xml.push(`      <ans:dataEmissao>${this.formatDate(new Date(guide.created_at))}</ans:dataEmissao>`);

        // Beneficiário (Paciente)
        xml.push('      <ans:beneficiario>');
        xml.push(`        <ans:numeroCarteira>${guide.patient_card_number}</ans:numeroCarteira>`);
        xml.push(`        <ans:nomeBeneficiario>${this.escapeXML(guide.patient_name)}</ans:nomeBeneficiario>`);
        if (guide.patient_cpf) {
            xml.push(`        <ans:cpf>${guide.patient_cpf.replace(/\D/g, '')}</ans:cpf>`);
        }
        xml.push('      </ans:beneficiario>');

        // Procedimentos
        xml.push('      <ans:procedimentos>');
        xml.push('        <ans:procedimento>');
        xml.push('          <ans:codigoTabela>22</ans:codigoTabela>'); // TUSS
        xml.push(`          <ans:codigoProcedimento>${guide.procedure_code}</ans:codigoProcedimento>`);
        xml.push(`          <ans:descricaoProcedimento>${this.escapeXML(guide.procedure_name)}</ans:descricaoProcedimento>`);
        xml.push(`          <ans:quantidadeExecutada>${guide.procedure_quantity}</ans:quantidadeExecutada>`);
        xml.push(`          <ans:valorUnitario>${guide.unit_value.toFixed(2)}</ans:valorUnitario>`);
        xml.push(`          <ans:valorTotal>${guide.total_value.toFixed(2)}</ans:valorTotal>`);
        xml.push('        </ans:procedimento>');
        xml.push('      </ans:procedimentos>');

        // Diagnóstico
        if (guide.cid10_code) {
            xml.push('      <ans:diagnostico>');
            xml.push(`        <ans:CID>${guide.cid10_code}</ans:CID>`);
            xml.push('      </ans:diagnostico>');
        }

        // Autorização
        if (guide.authorization_code) {
            xml.push(`      <ans:numeroAutorizacao>${guide.authorization_code}</ans:numeroAutorizacao>`);
        }

        // Observação
        if (guide.notes) {
            xml.push(`      <ans:observacao>${this.escapeXML(guide.notes)}</ans:observacao>`);
        }

        xml.push('    </ans:guia>');

        return xml.join('\n');
    }

    /**
     * Helpers
     */

    private generateTransactionId(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `${timestamp}${random}`;
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private formatTime(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    private escapeXML(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    private generateHash(content: string): string {
        // TODO: Implementar hash SHA-256 real
        // Por enquanto, retorna um hash mockado
        return 'HASH_PLACEHOLDER';
    }
}

/**
 * Factory function para facilitar uso
 */
export function generateTissXML(
    batch: TissBatch,
    guides: TissGuide[],
    clinic: any,
    operadora: any,
    options?: Partial<XMLGeneratorOptions>
): string {
    const generator = new TissXMLGenerator(options);
    return generator.generateBatchXML(batch, guides, clinic, operadora);
}
