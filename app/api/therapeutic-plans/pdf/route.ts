/**
 * GET /api/therapeutic-plans/pdf?id=<plan_id>
 * Gera PDF do plano terapêutico com assinatura do profissional para impressão
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, unauthorizedResponse, forbiddenResponse } from '@/lib/middlewares/auth'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import { log } from '@/lib/logger'

export const maxDuration = 15
export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = { active: 'Ativo', paused: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado' }
const GOAL_STATUS: Record<string, string> = { pending: 'Pendente', in_progress: 'Em Andamento', achieved: 'Alcançado', not_achieved: 'Não Alcançado' }
const PRIORITY_LABELS: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' }

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireRole(['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'])
        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult
        const planId = request.nextUrl.searchParams.get('id')
        if (!planId) {
            return NextResponse.json({ error: 'ID do plano é obrigatório' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: rawPlan, error } = await supabase
            .from('therapeutic_plans')
            .select(`
                *,
                patients!patient_id(full_name, cpf, birth_date),
                doctors!doctor_id(
                    crm, crm_state, specialty, profession_type,
                    users!user_id(full_name)
                ),
                clinics!clinic_id(name),
                therapeutic_plan_goals(*)
            `)
            .eq('id', planId)
            .eq('clinic_id', user.clinic_id)
            .single()

        if (error || !rawPlan) {
            return NextResponse.json({ error: 'Plano terapêutico não encontrado' }, { status: 404 })
        }

        const plan = rawPlan as any

        const doctorData = Array.isArray(plan.doctors) ? plan.doctors[0] : plan.doctors
        const patientData = Array.isArray(plan.patients) ? plan.patients[0] : plan.patients
        const clinicData = Array.isArray(plan.clinics) ? plan.clinics[0] : plan.clinics
        const userData = doctorData?.users
        const doctorName = userData?.full_name || 'Profissional'
        const crmLabel = doctorData?.crm ? `CRM ${doctorData.crm}-${doctorData.crm_state || 'SP'}` : ''
        const goals = plan.therapeutic_plan_goals || []

        // Generate PDF
        const doc = new jsPDF()
        let y = 15

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(clinicData?.name || 'CliniGo', 105, y, { align: 'center' })
        y += 7

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Plano Terapêutico', 105, y, { align: 'center' })
        y += 5

        doc.setLineWidth(0.5)
        doc.line(15, y, 195, y)
        y += 8

        // Info fields
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
        addField('Status', STATUS_LABELS[plan.status] || plan.status, 140, y)
        y += 5
        addField('CPF', patientData?.cpf || '-', 15, y)
        addField('Profissional', `${doctorName}${crmLabel ? ` - ${crmLabel}` : ''}`, 140, y)
        y += 5

        // Title
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`Título: ${plan.title}`, 15, y)
        y += 5

        if (plan.diagnosis || plan.cid_code) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            const diagLine = [
                plan.diagnosis ? `Diagnóstico: ${plan.diagnosis}` : '',
                plan.cid_code ? `CID: ${plan.cid_code}` : '',
            ].filter(Boolean).join('  |  ')
            doc.text(diagLine, 15, y)
            y += 5
        }

        // Dates
        const dates = [
            plan.start_date ? `Início: ${new Date(plan.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : '',
            plan.end_date ? `Término: ${new Date(plan.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : '',
            plan.review_date ? `Revisão: ${new Date(plan.review_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : '',
        ].filter(Boolean).join('   |   ')
        if (dates) {
            doc.setFontSize(8)
            doc.text(dates, 15, y)
            y += 5
        }

        if (plan.frequency || plan.estimated_duration) {
            const freqLine = [
                plan.frequency ? `Frequência: ${plan.frequency}` : '',
                plan.estimated_duration ? `Duração Estimada: ${plan.estimated_duration}` : '',
            ].filter(Boolean).join('   |   ')
            doc.text(freqLine, 15, y)
            y += 5
        }

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

        addSection('Objetivos Gerais', plan.objectives)
        addSection('Metodologia', plan.methodology)
        addSection('Observações', plan.notes)

        // Goals
        if (goals.length > 0) {
            if (y > 240) { doc.addPage(); y = 15 }
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text(`METAS (${goals.length})`, 15, y)
            y += 6

            goals.forEach((goal: any, idx: number) => {
                if (y > 255) { doc.addPage(); y = 15 }

                // Goal header
                doc.setFontSize(9)
                doc.setFont('helvetica', 'bold')
                doc.text(`${idx + 1}. ${goal.title || 'Meta sem título'}`, 15, y)
                y += 4.5

                // Status, priority, progress
                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')
                const metaLine = [
                    `Status: ${GOAL_STATUS[goal.status] || goal.status}`,
                    `Prioridade: ${PRIORITY_LABELS[goal.priority] || goal.priority}`,
                    `Progresso: ${goal.progress || 0}%`,
                ].join('   |   ')
                doc.text(metaLine, 20, y)
                y += 4

                if (goal.description?.trim()) {
                    const descLines = doc.splitTextToSize(goal.description, 165)
                    for (const line of descLines) {
                        if (y > 270) { doc.addPage(); y = 15 }
                        doc.text(line, 20, y)
                        y += 4
                    }
                }
                y += 2
            })
        }

        // =====================================================================
        // Signature Area
        // =====================================================================
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

        // Footer
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

        const arrayBuffer = doc.output('arraybuffer')
        const pdfBuffer = Buffer.from(arrayBuffer)

        log.audit(user.id, 'export_therapeutic_plan_pdf', { plan_id: planId })

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="plano_terapeutico_${planId.substring(0, 8)}.pdf"`,
            },
        })

    } catch (error) {
        log.error('Error generating therapeutic plan PDF', { error })
        return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
    }
}
