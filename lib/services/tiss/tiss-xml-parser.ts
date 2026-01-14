/**
 * CLINIGO PREMIUM - TISS XML Parser (REAL)
 * Squad B: TISS Pré-Auditoria
 * 
 * Parsers para operadoras:
 * - Unimed
 * - Bradesco Saúde
 * - SulAmérica
 * 
 * ZERO MOCKS - Parser XML real conforme padrão TISS 3.0.4
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser'

// TISS 3.0.4 Return Structure
interface TISSReturnGuide {
    guide_number: string
    protocol_number: string
    status: 'APPROVED' | 'DENIED' | 'PARTIAL'
    requested_value: number
    approved_value: number
    denied_value: number
    glosa_code?: string
    glosa_description?: string
    denial_reason?: string
    operator_notes?: string
}

interface TISSReturnBatch {
    batch_number: string
    operator_name: string
    operator_ans_code: string
    return_date: string
    total_guides: number
    total_approved: number
    total_denied: number
    total_partial: number
    amount_requested: number
    amount_approved: number
    amount_denied: number
    guides: TISSReturnGuide[]
}

// XML Parser Configuration
const parserOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true
}

const parser = new XMLParser(parserOptions)

/**
 * Parse Unimed XML Return
 * Estrutura específica Unimed baseada em TISS 3.0.4
 */
export function parseUnimedXML(xmlContent: string): TISSReturnBatch {
    try {
        const result = parser.parse(xmlContent)

        // Navegar estrutura Unimed
        const loteGuias = result.ans?.loteGuias || result.loteGuias

        if (!loteGuias) {
            throw new Error('Estrutura XML inválida para Unimed')
        }

        const guides: TISSReturnGuide[] = []
        const guiasArray = Array.isArray(loteGuias.guiasTISS?.guia)
            ? loteGuias.guiasTISS.guia
            : [loteGuias.guiasTISS?.guia].filter(Boolean)

        for (const guia of guiasArray) {
            const statusAuditoria = guia.statusAuditoria || guia.situacaoGuia

            let status: 'APPROVED' | 'DENIED' | 'PARTIAL' = 'APPROVED'
            let glosaCode = undefined
            let glosaDescription = undefined

            // Interpretar status Unimed
            if (statusAuditoria === '01' || statusAuditoria === 'APROVADO') {
                status = 'APPROVED'
            } else if (statusAuditoria === '02' || statusAuditoria === 'NEGADO') {
                status = 'DENIED'
                glosaCode = guia.codigoGlosa || 'UNIMED_NEGACAO'
                glosaDescription = guia.motivoGlosa || guia.justificativa || 'Guia negada pela operadora'
            } else if (statusAuditoria === '03' || statusAuditoria === 'PARCIAL') {
                status = 'PARTIAL'
                glosaCode = guia.codigoGlosa || 'UNIMED_GLOSA_PARCIAL'
                glosaDescription = guia.motivoGlosa || 'Glosa parcial'
            }

            guides.push({
                guide_number: guia.numeroGuiaPrestador || guia.numeroGuia,
                protocol_number: guia.numeroProtocolo || guia.numeroLote,
                status,
                requested_value: parseFloat(guia.valorSolicitado || guia.valorTotal || 0),
                approved_value: parseFloat(guia.valorAprovado || guia.valorLiberado || 0),
                denied_value: parseFloat(guia.valorGlosado || 0),
                glosa_code: glosaCode,
                glosa_description: glosaDescription,
                denial_reason: guia.motivoNegacao || undefined,
                operator_notes: guia.observacoes || undefined
            })
        }

        // Calcular totais
        const totalApproved = guides.filter(g => g.status === 'APPROVED').length
        const totalDenied = guides.filter(g => g.status === 'DENIED').length
        const totalPartial = guides.filter(g => g.status === 'PARTIAL').length

        const amountRequested = guides.reduce((sum, g) => sum + g.requested_value, 0)
        const amountApproved = guides.reduce((sum, g) => sum + g.approved_value, 0)
        const amountDenied = guides.reduce((sum, g) => sum + g.denied_value, 0)

        return {
            batch_number: loteGuias.numeroLote || loteGuias['@_numeroLote'],
            operator_name: 'UNIMED',
            operator_ans_code: loteGuias.codigoOperadora || '000000',
            return_date: loteGuias.dataRetorno || new Date().toISOString(),
            total_guides: guides.length,
            total_approved: totalApproved,
            total_denied: totalDenied,
            total_partial: totalPartial,
            amount_requested: amountRequested,
            amount_approved: amountApproved,
            amount_denied: amountDenied,
            guides
        }

    } catch (error) {
        console.error('Erro ao parsear XML Unimed:', error)
        throw new Error(`Falha no parse XML Unimed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
}

/**
 * Parse Bradesco Saúde XML Return
 * Estrutura específica Bradesco
 */
export function parseBradescoXML(xmlContent: string): TISSReturnBatch {
    try {
        const result = parser.parse(xmlContent)

        // Bradesco usa estrutura ligeiramente diferente
        const lote = result.mensagemTISS?.loteGuias || result.loteGuias

        if (!lote) {
            throw new Error('Estrutura XML inválida para Bradesco')
        }

        const guides: TISSReturnGuide[] = []
        const guiasArray = Array.isArray(lote.guia) ? lote.guia : [lote.guia].filter(Boolean)

        for (const guia of guiasArray) {
            // Bradesco usa códigos diferentes
            const codigoRetorno = guia.codigoRetorno || guia.situacao

            let status: 'APPROVED' | 'DENIED' | 'PARTIAL' = 'APPROVED'
            let glosaCode = undefined
            let glosaDescription = undefined

            if (codigoRetorno === 'A' || codigoRetorno === '1') {
                status = 'APPROVED'
            } else if (codigoRetorno === 'N' || codigoRetorno === '2') {
                status = 'DENIED'
                glosaCode = guia.motivoNegacao?.codigo || 'BRADESCO_NEGACAO'
                glosaDescription = guia.motivoNegacao?.descricao || 'Guia negada'
            } else if (codigoRetorno === 'P' || codigoRetorno === '3') {
                status = 'PARTIAL'
                glosaCode = 'BRADESCO_GLOSA'
                glosaDescription = guia.justificativaGlosa || 'Glosa parcial'
            }

            guides.push({
                guide_number: guia.numeroGuia || guia.numeroGuiaOperadora,
                protocol_number: guia.protocolo || guia.numeroProtocolo,
                status,
                requested_value: parseFloat(guia.valorApresentado || 0),
                approved_value: parseFloat(guia.valorProcessado || guia.valorPago || 0),
                denied_value: parseFloat(guia.valorGlosa || 0),
                glosa_code: glosaCode,
                glosa_description: glosaDescription,
                denial_reason: guia.observacao || undefined,
                operator_notes: guia.anotacoes || undefined
            })
        }

        const totalApproved = guides.filter(g => g.status === 'APPROVED').length
        const totalDenied = guides.filter(g => g.status === 'DENIED').length
        const totalPartial = guides.filter(g => g.status === 'PARTIAL').length

        const amountRequested = guides.reduce((sum, g) => sum + g.requested_value, 0)
        const amountApproved = guides.reduce((sum, g) => sum + g.approved_value, 0)
        const amountDenied = guides.reduce((sum, g) => sum + g.denied_value, 0)

        return {
            batch_number: lote.numeroLote || lote['@_numero'],
            operator_name: 'BRADESCO',
            operator_ans_code: lote.registroANS || '005711',
            return_date: lote.dataProcessamento || new Date().toISOString(),
            total_guides: guides.length,
            total_approved: totalApproved,
            total_denied: totalDenied,
            total_partial: totalPartial,
            amount_requested: amountRequested,
            amount_approved: amountApproved,
            amount_denied: amountDenied,
            guides
        }

    } catch (error) {
        console.error('Erro ao parsear XML Bradesco:', error)
        throw new Error(`Falha no parse XML Bradesco: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
}

/**
 * Parse SulAmérica XML Return
 */
export function parseSulamericaXML(xmlContent: string): TISSReturnBatch {
    try {
        const result = parser.parse(xmlContent)

        const lote = result.retornoLote || result.loteGuias

        if (!lote) {
            throw new Error('Estrutura XML inválida para SulAmérica')
        }

        const guides: TISSReturnGuide[] = []
        const guiasArray = Array.isArray(lote.retornoGuia) ? lote.retornoGuia : [lote.retornoGuia].filter(Boolean)

        for (const guia of guiasArray) {
            const statusGuia = guia.status || guia.situacaoAutorizacao

            let status: 'APPROVED' | 'DENIED' | 'PARTIAL' = 'APPROVED'
            let glosaCode = undefined
            let glosaDescription = undefined

            // SulAmérica usa nomenclatura própria
            if (statusGuia === 'AUTORIZADO' || statusGuia === 'OK') {
                status = 'APPROVED'
            } else if (statusGuia === 'NEGADO' || statusGuia === 'RECUSADO') {
                status = 'DENIED'
                glosaCode = guia.codigoNegativa || 'SULAMERICA_NEGACAO'
                glosaDescription = guia.motivoNegativa || 'Autorização negada'
            } else if (statusGuia === 'PARCIAL' || statusGuia === 'AUTORIZADO_PARCIAL') {
                status = 'PARTIAL'
                glosaCode = 'SULAMERICA_PARCIAL'
                glosaDescription = guia.observacao || 'Autorização parcial'
            }

            guides.push({
                guide_number: guia.numeroGuiaPrestador || guia.sequencialGuia,
                protocol_number: guia.numeroAutorizacao || guia.senha,
                status,
                requested_value: parseFloat(guia.valorSolicitado || 0),
                approved_value: parseFloat(guia.valorAutorizado || 0),
                denied_value: parseFloat(guia.valorNegado || 0),
                glosa_code: glosaCode,
                glosa_description: glosaDescription,
                denial_reason: guia.justificativa || undefined,
                operator_notes: guia.anotacao || undefined
            })
        }

        const totalApproved = guides.filter(g => g.status === 'APPROVED').length
        const totalDenied = guides.filter(g => g.status === 'DENIED').length
        const totalPartial = guides.filter(g => g.status === 'PARTIAL').length

        const amountRequested = guides.reduce((sum, g) => sum + g.requested_value, 0)
        const amountApproved = guides.reduce((sum, g) => sum + g.approved_value, 0)
        const amountDenied = guides.reduce((sum, g) => sum + g.denied_value, 0)

        return {
            batch_number: lote.numeroLote || lote.identificadorLote,
            operator_name: 'SULAMERICA',
            operator_ans_code: lote.codigoOperadora || '000329',
            return_date: lote.dataRetorno || new Date().toISOString(),
            total_guides: guides.length,
            total_approved: totalApproved,
            total_denied: totalDenied,
            total_partial: totalPartial,
            amount_requested: amountRequested,
            amount_approved: amountApproved,
            amount_denied: amountDenied,
            guides
        }

    } catch (error) {
        console.error('Erro ao parsear XML SulAmérica:', error)
        throw new Error(`Falha no parse XML SulAmérica: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
}

/**
 * Auto-detect operator and parse accordingly
 */
export function parseTISSReturn(xmlContent: string, operatorName?: string): TISSReturnBatch {
    // Auto-detect se não especificado
    if (!operatorName) {
        if (xmlContent.includes('unimed') || xmlContent.includes('UNIMED')) {
            operatorName = 'UNIMED'
        } else if (xmlContent.includes('bradesco') || xmlContent.includes('BRADESCO')) {
            operatorName = 'BRADESCO'
        } else if (xmlContent.includes('sulamerica') || xmlContent.includes('SULAMERICA')) {
            operatorName = 'SULAMERICA'
        } else {
            // Fallback: tentar Unimed (padrão TISS mais comum)
            operatorName = 'UNIMED'
        }
    }

    switch (operatorName.toUpperCase()) {
        case 'UNIMED':
            return parseUnimedXML(xmlContent)
        case 'BRADESCO':
        case 'BRADESCO_SAUDE':
            return parseBradescoXML(xmlContent)
        case 'SULAMERICA':
        case 'SUL_AMERICA':
            return parseSulamericaXML(xmlContent)
        default:
            // Tentar parser genérico
            try {
                return parseUnimedXML(xmlContent)
            } catch {
                throw new Error(`Operadora não suportada: ${operatorName}`)
            }
    }
}
