/**
 * Prescription PDF API — GET
 * 
 * Gera PDF da prescrição sob demanda (padrão payroll)
 * Layout: cabeçalho clínica, dados paciente, medicamentos, assinatura, rodapé
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { guardFeature, createPlanError } from '@/lib/middlewares/plan-guard'
import { jsPDF } from 'jspdf'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params

    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Plan guard
        const validation = await guardFeature(profile.clinic_id, 'prescricao_digital')
        if (!validation.allowed) {
            return createPlanError(validation.planType, 'Prescrição Digital', 'PROFESSIONAL')
        }

        // Fetch prescription + doctor data
        let prescQuery = supabaseAdmin
            .from('prescriptions')
            .select(`
                *,
                patient:patients(id, full_name, cpf, birth_date, email, phone),
                doctor:users!prescriptions_doctor_id_fkey(id, full_name),
                signer:users!prescriptions_signed_by_fkey(id, full_name)
            `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)

        if (profile.role === 'DOCTOR') {
            prescQuery = prescQuery.eq('doctor_id', user.id)
        }

        const { data: prescription, error: prescError } = await prescQuery.single()

        if (prescError || !prescription) {
            return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
        }

        const presc = prescription as any

        // Fetch items
        const { data: items } = await supabaseAdmin
            .from('prescription_items')
            .select('*')
            .eq('prescription_id', params.id)
            .order('sort_order', { ascending: true })

        // Fetch clinic data
        const { data: clinic } = await supabaseAdmin
            .from('clinics')
            .select('name, cnpj, address, phone, email')
            .eq('id', profile.clinic_id)
            .single()

        // Get doctor CRM
        const { data: doctorProfile } = await supabaseAdmin
            .from('doctors')
            .select('crm, crm_state, specialty')
            .eq('user_id', presc.doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .single()

        // ─── PDF Generation ───
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 18
        const colRight = pageWidth - margin
        let y = 18

        const clinicData = clinic as any
        const patientData = presc.patient as any
        const doctorData = presc.doctor as any
        const signerData = presc.signer as any
        const doctorInfo = doctorProfile as any

        // ── CABEÇALHO ──
        doc.setFillColor(30, 41, 59) // slate-800
        doc.rect(0, 0, pageWidth, 36, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text(clinicData?.name?.toUpperCase() || 'CLÍNICA', margin, 14)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        if (clinicData?.cnpj) doc.text(`CNPJ: ${clinicData.cnpj}`, margin, 21)
        if (clinicData?.phone) doc.text(`Tel: ${clinicData.phone}`, margin, 27)
        if (clinicData?.address) {
            const addr = clinicData.address.substring(0, 60)
            doc.text(addr, margin, 33)
        }

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        const title = 'PRESCRIÇÃO MÉDICA'
        doc.text(title, colRight - doc.getTextWidth(title), 14)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const dateStr = new Date(presc.created_at).toLocaleDateString('pt-BR')
        doc.text(`Data: ${dateStr}`, colRight - doc.getTextWidth(`Data: ${dateStr}`), 21)

        const crmLabel = doctorInfo?.crm
            ? `CRM: ${doctorInfo.crm}${doctorInfo.crm_state ? `/${doctorInfo.crm_state}` : ''}`
            : ''
        if (crmLabel) {
            doc.text(crmLabel, colRight - doc.getTextWidth(crmLabel), 27)
        }

        y = 44
        doc.setTextColor(0, 0, 0)

        // ── DADOS DO PACIENTE ──
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y - 4, colRight - margin, 20, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(71, 85, 105)
        doc.text('DADOS DO PACIENTE', margin + 3, y + 2)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        y += 9
        doc.text(`Nome: ${patientData?.full_name || '—'}`, margin + 3, y)

        if (patientData?.cpf) {
            doc.text(`CPF: ${patientData.cpf}`, margin + 100, y)
        }

        y += 7
        if (patientData?.birth_date) {
            const birthDate = new Date(patientData.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')
            doc.text(`Nascimento: ${birthDate}`, margin + 3, y)
        }

        y += 12

        // ── LINHA SEPARADORA ──
        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, colRight, y)
        y += 8

        // ── MEDICAMENTOS ──
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text('MEDICAMENTOS PRESCRITOS', margin, y)
        y += 10

        if (items && items.length > 0) {
            items.forEach((item: any, idx: number) => {
                if (y > pageHeight - 60) {
                    doc.addPage()
                    y = 20
                }

                // Number circle
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(10)
                doc.setTextColor(59, 130, 246) // blue-500
                doc.text(`${idx + 1}.`, margin, y)

                // Medication name
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(10)
                doc.setTextColor(30, 41, 59)
                doc.text(item.medication_name, margin + 8, y)

                y += 6

                // Details
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(9)
                doc.setTextColor(71, 85, 105)

                const details = []
                if (item.dosage) details.push(`Dosagem: ${item.dosage}`)
                if (item.frequency) details.push(`Posologia: ${item.frequency}`)
                if (item.duration) details.push(`Duração: ${item.duration}`)

                doc.text(details.join('  •  '), margin + 8, y)
                y += 5

                if (item.instructions) {
                    doc.setFontSize(8.5)
                    doc.setTextColor(100, 116, 139)
                    const instrLines = doc.splitTextToSize(`Orientações: ${item.instructions}`, colRight - margin - 12)
                    instrLines.forEach((line: string) => {
                        doc.text(line, margin + 8, y)
                        y += 4.5
                    })
                }

                y += 4

                // Divider
                doc.setDrawColor(235, 235, 235)
                doc.line(margin + 8, y - 2, colRight, y - 2)
                y += 2
            })
        } else {
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(9)
            doc.setTextColor(148, 163, 184)
            doc.text('Nenhum medicamento prescrito.', margin, y)
            y += 8
        }

        // ── OBSERVAÇÕES ──
        if (presc.notes) {
            y += 4
            doc.setDrawColor(220, 220, 220)
            doc.line(margin, y, colRight, y)
            y += 8

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.setTextColor(71, 85, 105)
            doc.text('OBSERVAÇÕES', margin, y)
            y += 7

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(30, 41, 59)
            const noteLines = doc.splitTextToSize(presc.notes, colRight - margin)
            noteLines.forEach((line: string) => {
                if (y > pageHeight - 50) {
                    doc.addPage()
                    y = 20
                }
                doc.text(line, margin, y)
                y += 5
            })
        }

        // ── ASSINATURA DIGITAL ──
        if (y > pageHeight - 50) { doc.addPage(); y = 20 }

        y = Math.max(y + 10, pageHeight - 50)
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y, colRight, y)
        y += 10

        const sigW = 80
        const xCenter = (pageWidth - sigW) / 2

        doc.setDrawColor(100, 116, 139)
        doc.line(xCenter, y, xCenter + sigW, y)
        y += 5

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        const doctorName = `Dr(a). ${doctorData?.full_name || 'Médico'}`
        doc.text(doctorName, xCenter + (sigW - doc.getTextWidth(doctorName)) / 2, y)
        y += 5

        if (crmLabel) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139)
            doc.text(crmLabel, xCenter + (sigW - doc.getTextWidth(crmLabel)) / 2, y)
            y += 5
        }

        if (doctorInfo?.specialty) {
            doc.text(doctorInfo.specialty, xCenter + (sigW - doc.getTextWidth(doctorInfo.specialty)) / 2, y)
            y += 5
        }

        // Digital signature stamp
        if (presc.status === 'SIGNED' && presc.signed_at) {
            y += 3
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(7.5)
            doc.setTextColor(22, 163, 74) // green-600

            const signedDate = new Date(presc.signed_at).toLocaleString('pt-BR')
            const signerName = signerData?.full_name || doctorData?.full_name || 'Médico'
            const stampText = `Assinado digitalmente por Dr(a). ${signerName} em ${signedDate}`
            doc.text(stampText, xCenter + (sigW - doc.getTextWidth(stampText)) / 2, y)
        }

        // ── RODAPÉ ──
        doc.setTextColor(180, 180, 180)
        doc.setFontSize(6.5)
        const footer1 = `Prescrição nº ${params.id.substring(0, 8).toUpperCase()}`
        const footer2 = `Documento gerado pelo CliniGo em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`
        doc.text(footer1, (pageWidth - doc.getTextWidth(footer1)) / 2, pageHeight - 10)
        doc.text(footer2, (pageWidth - doc.getTextWidth(footer2)) / 2, pageHeight - 6)

        // ── Output ──
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
        const safeName = (patientData?.full_name || 'paciente')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="prescricao_${safeName}_${dateStr.replace(/\//g, '-')}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('[Prescriptions] PDF error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao gerar PDF' }, { status: 500 })
    }
}
