/**
 * GET /api/patient/evolutions/pdf?id=<evolution_id>
 * Gera PDF da evolução assinado para o paciente/família visualizar e imprimir de forma segura.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPatientToken } from '@/lib/patient-auth'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

export const maxDuration = 15
export const dynamic = 'force-dynamic'

const TEMPLATE_LABELS: Record<string, string> = { 
    free: 'Livre', 
    soap: 'SOAP', 
    cif: 'CIF', 
    dap: 'DAP', 
    multidisciplinar: 'Multidisciplinar' 
}

export async function GET(request: NextRequest) {
    try {
        const patient = await verifyPatientToken(request)
        if (!patient) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const evolutionId = request.nextUrl.searchParams.get('id')
        if (!evolutionId) {
            return NextResponse.json({ error: 'ID da evolução é obrigatório' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: rawRecord, error } = await supabase
            .from('session_evolutions')
            .select(`
                *,
                patients!patient_id(full_name, cpf),
                doctors!doctor_id(
                    crm, crm_state, specialty, profession_type,
                    users!user_id(full_name)
                ),
                clinics!clinic_id(name)
            `)
            .eq('id', evolutionId)
            .eq('patient_id', patient.sub) // Garantia absoluta de segurança: o paciente só acessa a própria evolução!
            .single()

        if (error || !rawRecord) {
            return NextResponse.json({ error: 'Evolução não encontrada' }, { status: 404 })
        }

        const record = rawRecord as any
        if (record && record.template_type === 'soap' && (record.data_description || record.content)) {
            record.template_type = 'multidisciplinar'
        }

        // Apenas evoluções assinadas ou finalizadas podem ser vistas pela família
        if (!record.signed_at && !record.finalized_at) {
            return NextResponse.json({ error: 'Evolução ainda não finalizada pelo profissional' }, { status: 403 })
        }

        const doctorData = Array.isArray(record.doctors) ? record.doctors[0] : record.doctors
        const patientData = Array.isArray(record.patients) ? record.patients[0] : record.patients
        const clinicData = Array.isArray(record.clinics) ? record.clinics[0] : record.clinics
        const userData = doctorData?.users
        const doctorName = userData?.full_name || 'Profissional'
        const crmLabel = doctorData?.crm ? `CRM ${doctorData.crm}-${doctorData.crm_state || 'SP'}` : ''

        // Generate PDF
        const doc = new jsPDF()
        let y = 15

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(clinicData?.name || 'CliniGo', 105, y, { align: 'center' })
        y += 7

        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(`Evolução por Sessão — ${TEMPLATE_LABELS[record.template_type] || record.template_type}`, 105, y, { align: 'center' })
        y += 5

        doc.setLineWidth(0.5)
        doc.line(15, y, 195, y)
        y += 8

        // Patient & Doctor info
        doc.setFontSize(9)
        const addField = (label: string, value: string, x: number, currentY: number) => {
            if (!value) return
            doc.setFont('helvetica', 'bold')
            doc.text(`${label}: `, x, currentY)
            const lw = doc.getTextWidth(`${label}: `)
            doc.setFont('helvetica', 'normal')
            doc.text(value, x + lw, currentY)
        }

        addField('Paciente', patientData?.full_name || '-', 15, y)
        addField('Data', new Date(record.evolution_date + 'T12:00:00').toLocaleDateString('pt-BR'), 120, y)
        y += 5
        addField('CPF', patientData?.cpf || '-', 15, y)
        addField('Profissional', `${doctorName}${crmLabel ? ` - ${crmLabel}` : ''}`, 120, y)
        y += 3

        doc.setLineWidth(0.3)
        doc.line(15, y, 195, y)
        y += 6

        // Content sections
        const addSection = (title: string, content: string | null | undefined) => {
            if (!content?.trim()) return
            if (y > 260) { doc.addPage(); y = 15 }
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(title.toUpperCase(), 15, y)
            y += 5
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            const lines = doc.splitTextToSize(content, 175)
            for (const line of lines) {
                if (y > 270) { doc.addPage(); y = 15 }
                doc.text(line, 15, y)
                y += 4.5
            }
            y += 3
        }

        if (record.template_type === 'soap') {
            addSection('S — Subjetivo', record.subjective)
            addSection('O — Objetivo', record.objective)
            addSection('A — Avaliação', record.assessment)
            addSection('P — Plano', record.plan_notes)
        } else if (record.template_type === 'cif') {
            addSection('Funções do Corpo', record.body_functions)
            addSection('Atividades e Participação', record.activities_participation)
            addSection('Fatores Ambientais', record.environmental_factors)
        } else if (record.template_type === 'dap') {
            addSection('D — Dados', record.data_description)
            addSection('A — Avaliação', record.analysis)
            addSection('P — Plano', record.plan_action)
        } else if (record.template_type === 'multidisciplinar') {
            addSection('Data e Horário do Atendimento', record.data_description)
            addSection('Objetivo Terapêutico', record.subjective)
            addSection('Estratégias/Intervenções Utilizadas', record.objective)
            addSection('Desempenho do Paciente', record.assessment)
            addSection('Intercorrências', record.plan_notes)
            addSection('Orientações aos Responsáveis', record.content)
        } else if (record.template_type === 'free') {
            addSection('Conteúdo', record.content)
        }

        addSection('Resposta do Paciente', record.patient_response)
        addSection('Técnicas Utilizadas', record.techniques_used)
        addSection('Objetivos para Próxima Sessão', record.next_session_goals)

        // Mood & Engagement
        const MOOD_LABELS = ['Muito Baixo', 'Baixo', 'Neutro', 'Bom', 'Excelente']
        if (record.mood_rating || record.engagement_rating) {
            if (y > 255) { doc.addPage(); y = 15 }
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            const moodLine = [
                record.mood_rating ? `Humor: ${MOOD_LABELS[(record.mood_rating || 3) - 1]}` : '',
                record.engagement_rating ? `Engajamento: ${MOOD_LABELS[(record.engagement_rating || 3) - 1]}` : '',
            ].filter(Boolean).join('   |   ')
            doc.text(moodLine, 15, y)
            y += 6
        }

        // Signature Area
        if (y > 240) { doc.addPage(); y = 15 }
        y = Math.max(y + 20, 230)

        doc.setLineWidth(0.3)
        doc.line(50, y, 160, y)
        y += 5

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(doctorName, 105, y, { align: 'center' })
        y += 5

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        const profLabel = doctorData?.profession_type === 'psicologo' ? 'Psicólogo(a)' :
            doctorData?.profession_type === 'terapeuta' ? 'Terapeuta' : 'Profissional'
        doc.text(`${profLabel}${crmLabel ? ` - ${crmLabel}` : ''}`, 105, y, { align: 'center' })
        y += 4

        // Signature status
        if (record.signature_hash && record.signed_at) {
            doc.setFontSize(7)
            doc.setFont('helvetica', 'italic')
            doc.text(
                `Assinado digitalmente (ICP-Brasil) em ${new Date(record.signed_at).toLocaleString('pt-BR')}`,
                105, y, { align: 'center' }
            )
            y += 3
            doc.text(`Hash SHA-256: ${record.signature_hash.substring(0, 32)}...`, 105, y, { align: 'center' })
        } else if (record.finalized_at) {
            doc.setFontSize(7)
            doc.setFont('helvetica', 'italic')
            doc.text(
                `Finalizada (Assinatura Simples) em ${new Date(record.finalized_at).toLocaleString('pt-BR')}`,
                105, y, { align: 'center' }
            )
        }

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(150)
            doc.text(
                `CliniGo - Portal do Paciente | Página ${i}/${pageCount} | Gerado em ${new Date().toLocaleString('pt-BR')}`,
                105, 290, { align: 'center' }
            )
            doc.setTextColor(0)
        }

        const arrayBuffer = doc.output('arraybuffer')
        const pdfBuffer = Buffer.from(arrayBuffer)

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="evolucao_${evolutionId.substring(0, 8)}.pdf"`,
            },
        })

    } catch (error) {
        console.error('Error generating patient evolution PDF', { error })
        return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
    }
}
