/**
 * CLINIGO - PDF Generator for PEP Documents
 * 
 * Generates PDF documents from medical records using jsPDF.
 * Used for creating signable PDFs from prontuário data.
 */

import { jsPDF } from 'jspdf'

// ============================================================================
// Types
// ============================================================================

export interface PEPDocumentData {
    // Context
    clinicName: string
    clinicLogo?: string
    doctorName: string
    doctorSpecialty: string
    doctorCRM: string
    doctorCRMState: string
    patientName: string
    patientCPF: string
    appointmentDate: string

    // Medical Record Content
    professionType: 'MEDICO' | 'PSICOLOGO' | 'TERAPEUTA'
    chiefComplaint?: string
    historyPresentIllness?: string
    physicalExam?: string
    treatmentPlan?: string
    diagnosisText?: string

    // Vital Signs (Médico)
    weight?: string
    height?: string
    bloodPressure?: string
    heartRate?: string
    temperature?: string

    // Psychology
    demanda?: string
    evolucaoPsicologica?: string
    focoTerapeutico?: string

    // Therapy
    atividadesRealizadas?: string
    evolucaoFuncional?: string
    objetivosSessao?: string

    isMultidisciplinar?: boolean
    multidisciplinarData?: {
        dataDescription?: string
        subjective?: string
        objective?: string
        assessment?: string
        planNotes?: string
        content?: string
    }

    // Signature metadata (when document is signed)
    signatureInfo?: {
        signerName: string
        crm: string
        crmState: string
        signedAt: string
        certificateSerial: string
    }
}

export type DocumentType = 
    | 'receituario_simples'
    | 'receituario_azul'
    | 'atestado'
    | 'laudo'
    | 'declaracao_comparecimento'
    | 'solicitacao_exames'
    | 'prontuario'

// ============================================================================
// PDF Generator
// ============================================================================

export function generatePEPPdf(data: PEPDocumentData): Buffer {
    const doc = new jsPDF()
    let y = 15

    // =========================================================================
    // Header
    // =========================================================================
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(data.clinicName || 'CliniGo', 105, y, { align: 'center' })
    y += 7

    const professionLabel = {
        MEDICO: 'Evolução Médica',
        PSICOLOGO: 'Evolução Psicológica',
        TERAPEUTA: 'Evolução Terapêutica',
    }[data.professionType] || 'Prontuário Clínico'

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(professionLabel, 105, y, { align: 'center' })
    y += 5

    // Separator
    doc.setLineWidth(0.5)
    doc.line(15, y, 195, y)
    y += 8

    // =========================================================================
    // Patient & Doctor Info
    // =========================================================================
    doc.setFontSize(9)

    const addField = (label: string, value: string | undefined, x: number, currentY: number): number => {
        if (!value) return currentY
        doc.setFont('helvetica', 'bold')
        doc.text(`${label}: `, x, currentY)
        const labelWidth = doc.getTextWidth(`${label}: `)
        doc.setFont('helvetica', 'normal')
        doc.text(value, x + labelWidth, currentY)
        return currentY
    }

    addField('Paciente', data.patientName, 15, y)
    addField('Data', data.appointmentDate, 120, y)
    y += 5
    addField('CPF', data.patientCPF, 15, y)
    addField('Profissional', `${data.doctorName} - CRM ${data.doctorCRM}-${data.doctorCRMState}`, 120, y)
    y += 5
    addField('Especialidade', data.doctorSpecialty, 120, y)
    y += 3

    // Separator
    doc.setLineWidth(0.3)
    doc.line(15, y, 195, y)
    y += 6

    // =========================================================================
    // Content Sections
    // =========================================================================
    const addSection = (title: string, content: string | undefined): void => {
        if (!content || !content.trim()) return
        
        // Check page break
        if (y > 260) {
            doc.addPage()
            y = 15
        }

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(title.toUpperCase(), 15, y)
        y += 5

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(content, 175)
        for (const line of lines) {
            if (y > 270) {
                doc.addPage()
                y = 15
            }
            doc.text(line, 15, y)
            y += 4.5
        }
        y += 3
    }

    // Medical content
    if (data.isMultidisciplinar) {
        addSection('Data e Horário do Atendimento', data.multidisciplinarData?.dataDescription)
        addSection('Objetivo Terapêutico', data.multidisciplinarData?.subjective)
        addSection('Estratégias/Intervenções Utilizadas', data.multidisciplinarData?.objective)
        addSection('Desempenho do Paciente', data.multidisciplinarData?.assessment)
        addSection('Intercorrências', data.multidisciplinarData?.planNotes)
        addSection('Orientações aos Responsáveis', data.multidisciplinarData?.content)
    } else if (data.professionType === 'MEDICO') {
        // Vital Signs
        if (data.weight || data.bloodPressure || data.heartRate) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('SINAIS VITAIS', 15, y)
            y += 5
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            const vitals = [
                data.weight ? `Peso: ${data.weight}kg` : '',
                data.height ? `Altura: ${data.height}m` : '',
                data.bloodPressure ? `PA: ${data.bloodPressure}` : '',
                data.heartRate ? `FC: ${data.heartRate}bpm` : '',
                data.temperature ? `Temp/O2: ${data.temperature}` : '',
            ].filter(Boolean).join('  |  ')
            doc.text(vitals, 15, y)
            y += 8
        }

        addSection('Queixa Principal', data.chiefComplaint)
        addSection('História da Doença Atual', data.historyPresentIllness)
        addSection('Exame Físico', data.physicalExam)
        addSection('Diagnóstico / CID-10', data.diagnosisText)
        addSection('Prescrição / Conduta', data.treatmentPlan)
    } else if (data.professionType === 'PSICOLOGO') {
        addSection('Demanda', data.demanda)
        addSection('Foco Terapêutico', data.focoTerapeutico)
        addSection('Evolução Psicológica', data.evolucaoPsicologica)
    } else if (data.professionType === 'TERAPEUTA') {
        addSection('Objetivos da Sessão', data.objetivosSessao)
        addSection('Atividades Realizadas', data.atividadesRealizadas)
        addSection('Evolução Funcional', data.evolucaoFuncional)
    }

    // =========================================================================
    // Signature Area
    // =========================================================================
    if (y > 240) {
        doc.addPage()
        y = 15
    }

    y = Math.max(y + 15, 230)

    doc.setLineWidth(0.3)
    doc.line(50, y, 160, y)
    y += 5

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(data.doctorName, 105, y, { align: 'center' })
    y += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
        `${professionLabel} - CRM ${data.doctorCRM}-${data.doctorCRMState}`,
        105, y, { align: 'center' }
    )
    y += 5

    if (data.signatureInfo) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.text(
            `Assinado digitalmente em ${data.signatureInfo.signedAt} | Cert: ${data.signatureInfo.certificateSerial}`,
            105, y, { align: 'center' }
        )
    }

    // =========================================================================
    // Footer
    // =========================================================================
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150)
        doc.text(
            `CliniGo - Sistema de Gestão Clínica | Página ${i}/${pageCount} | Gerado em ${new Date().toLocaleString('pt-BR')}`,
            105, 290, { align: 'center' }
        )
        doc.setTextColor(0)
    }

    // Convert to Buffer
    const arrayBuffer = doc.output('arraybuffer')
    return Buffer.from(arrayBuffer)
}

export default generatePEPPdf
