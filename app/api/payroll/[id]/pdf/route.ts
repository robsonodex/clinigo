// app/api/payroll/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;

    try {
        const supabase = await createClient();
        const supabaseAdmin = createServiceRoleClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        // Buscar folha com dados do médico
        let query = supabaseAdmin
            .from('medical_payroll')
            .select(`
                *,
                doctor:doctors(
                    id, crm, crm_state, specialty,
                    user:users(full_name, email, cpf)
                )
            `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id);

        // RBAC: médico só acessa a própria folha
        if (profile.role === 'DOCTOR') {
            const { data: doctorRecord } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .single();

            if (!doctorRecord) {
                return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
            }
            query = query.eq('doctor_id', doctorRecord.id);
        }

        const { data: payroll, error: payrollError } = await query.single();

        if (payrollError || !payroll) {
            return NextResponse.json({ success: false, error: 'Folha não encontrada' }, { status: 404 });
        }

        // Buscar itens da folha
        const { data: items } = await supabaseAdmin
            .from('payroll_items')
            .select('*')
            .eq('payroll_id', params.id)
            .neq('status', 'CANCELLED')
            .order('appointment_date', { ascending: true });

        // Buscar dados da clínica
        const { data: clinic } = await supabaseAdmin
            .from('clinics')
            .select('name, cnpj, address, phone, email, professional_label')
            .eq('id', profile.clinic_id)
            .single();

        // ─── Geração do PDF ───────────────────────────────────────────
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 18;
        const colRight = pageWidth - margin;
        let y = 18;

        const fmt = (v: number) =>
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

        const refDate = new Date(payroll.reference_month + 'T12:00:00');
        const refLabel = refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const lineH = (doc: jsPDF) => doc.internal.scaleFactor > 1 ? 6 : 6;
        const hr = (yPos: number, color: [number, number, number] = [220, 220, 220]) => {
            doc.setDrawColor(...color);
            doc.line(margin, yPos, colRight, yPos);
            return yPos + 4;
        };

        // ── CABEÇALHO ──
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(0, 0, pageWidth, 36, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(clinic?.name?.toUpperCase() || 'CLÍNICA', margin, 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (clinic?.cnpj) doc.text(`CNPJ: ${clinic.cnpj}`, margin, 21);
        if (clinic?.phone) doc.text(`Tel: ${clinic.phone}`, margin, 27);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('HOLERITE DE REPASSE', colRight - doc.getTextWidth('HOLERITE DE REPASSE'), 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Competência: ${refLabel}`, colRight - doc.getTextWidth(`Competência: ${refLabel}`), 21);

        const statusLabel: Record<string, string> = {
            OPEN: 'Aberto', PENDING_APPROVAL: 'Aguardando Aprovação',
            APPROVED: 'Aprovado', PAID: 'Pago', CANCELLED: 'Cancelado',
        };
        const st = statusLabel[payroll.status] || payroll.status;
        doc.text(`Status: ${st}`, colRight - doc.getTextWidth(`Status: ${st}`), 27);

        y = 44;
        doc.setTextColor(0, 0, 0);

        // ── DADOS DO PROFISSIONAL ──
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, colRight - margin, 26, 'F');

        const profLabel = (clinic as any)?.professional_label || 'Médico';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`DADOS DO ${profLabel.toUpperCase()}`, margin + 3, y + 2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const doctor = (payroll as any).doctor;
        y += 9;
        doc.text(`Nome: ${doctor?.user?.full_name || '—'}`, margin + 3, y);
        doc.text(`CRM: ${doctor?.crm || '—'}${doctor?.crm_state ? `/${doctor.crm_state}` : ''}`, margin + 90, y);
        y += 7;
        doc.text(`Especialidade: ${doctor?.specialty || '—'}`, margin + 3, y);
        if (doctor?.user?.cpf) doc.text(`CPF: ${doctor.user.cpf}`, margin + 90, y);
        y += 12;

        // ── RESUMO FINANCEIRO ──
        y = hr(y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('RESUMO FINANCEIRO', margin, y + 4);
        y += 10;

        const summaryRows = [
            ['Produção Bruta (consultas)', fmt(payroll.gross_revenue || 0)],
            ['Repasse Bruto', fmt(payroll.gross_payroll || 0)],
        ];
        if (payroll.inss_retention) summaryRows.push(['(-) INSS', `-${fmt(payroll.inss_retention)}`]);
        if (payroll.irrf_retention) summaryRows.push(['(-) IRRF', `-${fmt(payroll.irrf_retention)}`]);
        if (payroll.iss_retention) summaryRows.push(['(-) ISS', `-${fmt(payroll.iss_retention)}`]);
        if (payroll.other_deductions) summaryRows.push(['(-) Outras Deduções', `-${fmt(payroll.other_deductions)}`]);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);

        for (const [label, value] of summaryRows) {
            doc.text(label, margin, y);
            doc.text(value, colRight - doc.getTextWidth(value), y);
            y += 6;
        }

        // Linha total
        y += 1;
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(margin, y, colRight, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(22, 163, 74); // green-600
        doc.text('VALOR LÍQUIDO A RECEBER', margin, y);
        const netStr = fmt(payroll.net_payroll || 0);
        doc.text(netStr, colRight - doc.getTextWidth(netStr), y);
        doc.setLineWidth(0.2);
        y += 10;

        // ── DETALHAMENTO DE ATENDIMENTOS ──
        doc.setTextColor(0, 0, 0);
        y = hr(y, [180, 180, 180]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('DETALHAMENTO DE ATENDIMENTOS', margin, y + 4);
        y += 10;

        if (items && items.length > 0) {
            // Cabeçalho da tabela
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, y - 3, colRight - margin, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('Data', margin + 2, y + 2);
            doc.text('Paciente', margin + 22, y + 2);
            doc.text('Tipo', margin + 78, y + 2);
            doc.text('Convênio', margin + 96, y + 2);
            doc.text('Valor', margin + 128, y + 2);
            doc.text('%', margin + 148, y + 2);
            doc.text('Repasse', colRight - doc.getTextWidth('Repasse') - 2, y + 2);
            y += 9;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);

            for (const item of items) {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                const dateStr = item.appointment_date
                    ? new Date(item.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR')
                    : '—';
                const patientName = (item.patient_name || '—').substring(0, 28);
                const payType = item.payment_type === 'PRIVATE' ? 'Particular' : 'Convênio';
                const insurance = (item.insurance_company || '—').substring(0, 14);
                const pctStr = item.applied_percentage ? `${item.applied_percentage}%` : '—';

                doc.text(dateStr, margin + 2, y);
                doc.text(patientName, margin + 22, y);
                doc.text(payType, margin + 78, y);
                doc.text(insurance, margin + 96, y);
                doc.text(fmt(item.procedure_value || 0), margin + 128, y);
                doc.text(pctStr, margin + 148, y);

                const netItem = fmt(item.calculated_net || 0);
                doc.text(netItem, colRight - doc.getTextWidth(netItem) - 2, y);
                y += 5.5;

                // Linha divisória sutil
                doc.setDrawColor(230, 230, 230);
                doc.line(margin, y - 1, colRight, y - 1);
            }
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text('Nenhum atendimento detalhado nesta folha.', margin, y + 4);
            y += 12;
        }

        // ── TOTAIS DE ATENDIMENTOS ──
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total de atendimentos: ${payroll.total_appointments || 0}`, margin, y);
        doc.text(
            `Particulares: ${payroll.total_private_appointments || 0}  •  Convênios: ${payroll.total_insurance_appointments || 0}`,
            margin + 70, y
        );
        y += 10;

        // ── PAGAMENTO ──
        if (payroll.status === 'PAID' && payroll.payment_date) {
            y = hr(y, [180, 180, 180]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(22, 163, 74);
            const paidDate = new Date(payroll.payment_date + 'T12:00:00').toLocaleDateString('pt-BR');
            doc.text(`✓ Pagamento realizado em ${paidDate}`, margin, y + 4);
            if (payroll.payment_method) {
                doc.setFont('helvetica', 'normal');
                doc.text(`  Método: ${payroll.payment_method}`, margin, y + 10);
                if (payroll.payment_reference) {
                    doc.text(`  Referência: ${payroll.payment_reference}`, margin, y + 16);
                }
            }
            y += 22;
        }

        // ── ASSINATURA ──
        if (y > pageHeight - 45) { doc.addPage(); y = 20; }

        y = Math.max(y, pageHeight - 45);
        hr(y, [200, 200, 200]);
        y += 10;

        const sigW = 70;
        const xLeft = margin + 5;
        const xRight = colRight - sigW - 5;

        doc.setDrawColor(100, 116, 139);
        doc.line(xLeft, y, xLeft + sigW, y);
        doc.line(xRight, y, xRight + sigW, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const clinicName = (clinic?.name || 'Clínica').substring(0, 30);
        doc.text(clinicName, xLeft + (sigW - doc.getTextWidth(clinicName)) / 2, y);
        const docName = (doctor?.user?.full_name || profLabel).substring(0, 30);
        doc.text(docName, xRight + (sigW - doc.getTextWidth(docName)) / 2, y);
        y += 4;
        doc.text('CONTRATANTE', xLeft + (sigW - doc.getTextWidth('CONTRATANTE')) / 2, y);
        doc.text('CONTRATADO(A)', xRight + (sigW - doc.getTextWidth('CONTRATADO(A)')) / 2, y);

        // ── RODAPÉ ──
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(6.5);
        const footer = `Documento gerado pelo CliniGo em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        doc.text(footer, (pageWidth - doc.getTextWidth(footer)) / 2, pageHeight - 6);

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        const safeName = (doctor?.user?.full_name || 'profissional')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="holerite_${safeName}_${payroll.reference_month?.substring(0, 7)}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao gerar holerite PDF:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
