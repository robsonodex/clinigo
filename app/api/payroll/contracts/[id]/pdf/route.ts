// app/api/payroll/contracts/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';

const CONTRACT_TYPE_LABELS: Record<string, string> = {
    PERCENTAGE_GROSS: '% sobre Valor Bruto',
    PERCENTAGE_NET: '% sobre Valor Líquido',
    FIXED_VALUE: 'Valor Fixo por Consulta',
    HYBRID: 'Híbrido (% + Piso Mínimo)',
    FIXED_HOURS: 'Salário Fixo + Excedente por Atendimento',
};

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
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        // Buscar contrato com dados do profissional
        const { data: contract, error: contractError } = await supabaseAdmin
            .from('doctor_contracts')
            .select(`
                *,
                doctor:doctors(id, crm, crm_state, specialty, user:users(full_name, email))
            `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (contractError || !contract) {
            return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
        }

        // Buscar dados da clínica
        const { data: clinic } = await supabaseAdmin
            .from('clinics')
            .select('name, cnpj, address, phone, email, professional_label')
            .eq('id', profile.clinic_id)
            .single();

        if (!clinic) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 404 });
        }

        // Gerar PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = 20;

        // Helper para texto centralizado
        const centerText = (text: string, yPos: number, fontSize: number = 12) => {
            doc.setFontSize(fontSize);
            const textWidth = doc.getTextWidth(text);
            doc.text(text, (pageWidth - textWidth) / 2, yPos);
            return yPos + fontSize * 0.5;
        };

        // Helper para linha horizontal
        const drawLine = (yPos: number) => {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            return yPos + 5;
        };

        // Helper para campo label: valor
        const addField = (label: string, value: string, yPos: number) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, margin + doc.getTextWidth(label) + 3, yPos);
            return yPos + 7;
        };

        const profLabel = (clinic as any).professional_label || 'Médico';

        // ===== CABEÇALHO =====
        doc.setFont('helvetica', 'bold');
        y = centerText(clinic.name?.toUpperCase() || 'CLÍNICA', y, 16);
        y += 3;

        doc.setFont('helvetica', 'normal');
        if (clinic.cnpj) {
            y = centerText(`CNPJ: ${clinic.cnpj}`, y, 9);
            y += 2;
        }
        if (clinic.address) {
            y = centerText(typeof clinic.address === 'string' ? clinic.address : JSON.stringify(clinic.address), y, 9);
            y += 2;
        }
        if (clinic.phone) {
            y = centerText(`Tel: ${clinic.phone}`, y, 9);
            y += 2;
        }
        if (clinic.email) {
            y = centerText(clinic.email, y, 9);
            y += 2;
        }

        y += 5;
        y = drawLine(y);
        y += 3;

        // ===== TÍTULO =====
        doc.setFont('helvetica', 'bold');
        y = centerText('CONTRATO DE REPASSE - PRESTAÇÃO DE SERVIÇOS', y, 14);
        y += 10;

        // ===== DATA =====
        const dataAtual = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Data de emissão: ${dataAtual}`, margin, y);
        y += 5;

        const validFrom = contract.valid_from
            ? new Date(contract.valid_from).toLocaleDateString('pt-BR')
            : 'N/A';
        doc.text(`Vigência a partir de: ${validFrom}`, margin, y);
        y += 10;

        y = drawLine(y);
        y += 3;

        // ===== DADOS DO PROFISSIONAL =====
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`DADOS DO ${profLabel.toUpperCase()}`, margin, y);
        y += 8;

        const doctor = contract.doctor as any;
        y = addField('Nome:', doctor?.user?.full_name || 'N/A', y);
        y = addField('Registro:', doctor?.crm || 'N/A', y);
        if (doctor?.crm_state) {
            y = addField('UF:', doctor.crm_state, y);
        }
        y = addField('Especialidade:', doctor?.specialty || 'N/A', y);
        if (doctor?.user?.email) {
            y = addField('E-mail:', doctor.user.email, y);
        }

        y += 5;
        y = drawLine(y);
        y += 3;

        // ===== TERMOS DO CONTRATO =====
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TERMOS DO CONTRATO DE REPASSE', margin, y);
        y += 8;

        const contractType = CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type;
        y = addField('Tipo de Contrato:', contractType, y);

        // Detalhes por tipo
        if (contract.contract_type.includes('PERCENTAGE')) {
            y = addField('Repasse Particular:', `${contract.percentage_private}%`, y);
            y = addField('Repasse Convênio:', `${contract.percentage_insurance}%`, y);
        }

        if (contract.contract_type === 'FIXED_VALUE') {
            y = addField('Valor Particular:', `R$ ${Number(contract.fixed_value_private || 0).toFixed(2)}`, y);
            y = addField('Valor Convênio:', `R$ ${Number(contract.fixed_value_insurance || 0).toFixed(2)}`, y);
        }

        if (contract.contract_type === 'HYBRID') {
            y = addField('Repasse Particular:', `${contract.percentage_private}%`, y);
            y = addField('Repasse Convênio:', `${contract.percentage_insurance}%`, y);
            if (contract.minimum_value) {
                y = addField('Piso Mínimo:', `R$ ${Number(contract.minimum_value).toFixed(2)}`, y);
            }
        }

        if (contract.contract_type === 'FIXED_HOURS') {
            y = addField('Horas Semanais:', `${contract.weekly_hours_limit || 0}h`, y);
            y = addField('Salário Fixo:', `R$ ${Number(contract.fixed_salary || 0).toFixed(2)}`, y);
            y = addField('Valor por Excedente:', `R$ ${Number(contract.extra_per_appointment || 0).toFixed(2)}`, y);
        }

        y += 5;
        y = drawLine(y);
        y += 3;

        // ===== IMPOSTOS =====
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('RETENÇÃO DE IMPOSTOS', margin, y);
        y += 8;

        y = addField('Reter Impostos:', contract.apply_tax_retention ? 'Sim' : 'Não', y);
        if (contract.apply_tax_retention) {
            y = addField('INSS:', `${contract.inss_rate}%`, y);
            y = addField('IRRF:', `${contract.irrf_rate || 0}%`, y);
            y = addField('ISS:', `${contract.iss_rate || 0}%`, y);
        }

        y += 5;
        y = drawLine(y);
        y += 3;

        // ===== STATUS =====
        y = addField('Status:', contract.is_active ? 'ATIVO' : 'INATIVO', y);

        y += 20;

        // ===== ASSINATURAS =====
        y = drawLine(y);
        y += 15;

        // Assinatura da clínica
        const sigLineWidth = contentWidth * 0.4;
        const sigLeftX = margin;
        const sigRightX = pageWidth - margin - sigLineWidth;

        doc.setDrawColor(0, 0, 0);
        doc.line(sigLeftX, y, sigLeftX + sigLineWidth, y);
        doc.line(sigRightX, y, sigRightX + sigLineWidth, y);

        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(clinic.name || 'Clínica', sigLeftX + sigLineWidth / 2 - doc.getTextWidth(clinic.name || 'Clínica') / 2, y);
        const doctorName = doctor?.user?.full_name || 'Profissional';
        doc.text(doctorName, sigRightX + sigLineWidth / 2 - doc.getTextWidth(doctorName) / 2, y);

        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('CONTRATANTE', sigLeftX + sigLineWidth / 2 - doc.getTextWidth('CONTRATANTE') / 2, y);
        doc.text('CONTRATADO(A)', sigRightX + sigLineWidth / 2 - doc.getTextWidth('CONTRATADO(A)') / 2, y);

        // ===== RODAPÉ =====
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        const footerText = `Documento gerado pelo CliniGo em ${dataAtual}`;
        doc.text(footerText, (pageWidth - doc.getTextWidth(footerText)) / 2, doc.internal.pageSize.getHeight() - 10);

        // Gerar buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        const sanitizedName = (doctor?.user?.full_name || 'profissional').replace(/[^a-zA-Z0-9]/g, '_');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="contrato_${sanitizedName}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao gerar PDF do contrato:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
