import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const { notaData, email } = body;

        if (!notaData || !email) {
            return NextResponse.json({ success: false, error: 'Dados incompletos para envio' }, { status: 400 });
        }

        const periodStart = notaData.periodo?.start;
        const periodEnd = notaData.periodo?.end;
        const profissional = notaData.profissional;
        const resumo = notaData.resumo;
        
        // Formatar tabela de atendimentos
        const atendimentosHtml = notaData.atendimentos.map((apt: any) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${apt.data.split(' ')[0]}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${apt.paciente}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${apt.convenio}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(apt.valor_bruto)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #16a34a;">${formatCurrency(apt.valor_repasse)}</td>
            </tr>
        `).join('');

        const deducoesHtml = resumo.deducoes?.length > 0 
            ? resumo.deducoes.map((d: any) => `
                <tr>
                    <td style="padding: 8px;">${d.description || d.expense_category || 'Dedução'}</td>
                    <td style="padding: 8px; text-align: right; color: #dc2626;">-${formatCurrency(d.amount)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="2" style="padding: 8px; color: #666;">Nenhuma dedução no período.</td></tr>';

        const htmlContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="text-align: center; color: #4f46e5;">CliniGo - Nota de Repasse</h2>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0 0 5px 0;"><strong>Profissional:</strong> ${profissional.nome}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Especialidade:</strong> ${profissional.especialidade} | <strong>Doc:</strong> ${profissional.documento}</p>
                    <p style="margin: 0;"><strong>Período:</strong> ${periodStart} a ${periodEnd}</p>
                </div>

                <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Atendimentos</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 8px; text-align: left;">Data</th>
                            <th style="padding: 8px; text-align: left;">Paciente</th>
                            <th style="padding: 8px; text-align: left;">Convênio</th>
                            <th style="padding: 8px; text-align: right;">Valor</th>
                            <th style="padding: 8px; text-align: right;">Repasse</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${atendimentosHtml}
                    </tbody>
                </table>

                <h3 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Deduções</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                    <tbody>
                        ${deducoesHtml}
                    </tbody>
                </table>

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <table style="width: 100%; font-size: 14px;">
                        <tr>
                            <td>Total Repasse:</td>
                            <td style="text-align: right;"><strong>${formatCurrency(resumo.total_repasse)}</strong></td>
                        </tr>
                        <tr>
                            <td>Deduções:</td>
                            <td style="text-align: right; color: #dc2626;"><strong>-${formatCurrency(resumo.total_deducoes)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="2"><hr style="border: 0; border-top: 1px solid #ccc; margin: 10px 0;" /></td>
                        </tr>
                        <tr style="font-size: 18px;">
                            <td><strong>Valor Líquido a Receber:</strong></td>
                            <td style="text-align: right; color: #16a34a;"><strong>${formatCurrency(resumo.valor_liquido)}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <p style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px;">
                    Este é um e-mail automático enviado pelo sistema CliniGo.<br>
                    Em caso de dúvidas, entre em contato com a administração da clínica.
                </p>
            </div>
        `;

        const data = await resend.emails.send({
            from: 'CliniGo Financeiro <financeiro@clinigo.com.br>',
            to: email,
            subject: `Nota de Repasse - ${profissional.nome} (${periodStart} a ${periodEnd})`,
            html: htmlContent,
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('[SendEmail] Erro ao enviar e-mail:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
