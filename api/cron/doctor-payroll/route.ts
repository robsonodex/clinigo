import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications';

export async function GET(request: Request) {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();

    // Apenas executa no dia 20 (Safety check, though cron handles schedule)
    if (now.getDate() !== 20) {
        return NextResponse.json({ message: 'Not payroll day', date: now.toISOString() });
    }

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const periodEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    try {
        // Buscar todas as clínicas ativas
        const { data: clinics } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('is_active', true);

        const stats = { processed: 0, skipped: 0, errors: 0 };

        for (const clinic of clinics || []) {
            // Buscar médicos da clínica com contrato ativo
            const { data: doctors } = await supabase
                .from('doctors')
                .select(`
          id,
          user:users!inner(full_name, email),
          contract:doctor_contracts!inner(percentage, fixed_value)
        `)
                .eq('clinic_id', clinic.id)
                .eq('is_active', true);

            for (const doctor of doctors || []) {
                try {
                    const doc = doctor as any;
                    // Verificar se já existe folha para este período
                    const { data: existingPayroll } = await (supabase as any)
                        .from('medical_payroll')
                        .select('id')
                        .eq('doctor_id', doc.id)
                        .eq('period_start', periodStart.toISOString())
                        .single();

                    if (existingPayroll) {
                        stats.skipped++;
                        continue;
                    }

                    // Buscar consultas do período
                    const { data: consultations } = await (supabase as any)
                        .from('appointments')
                        .select('id, payment_amount')
                        .eq('doctor_id', doc.id)
                        .eq('status', 'COMPLETED')
                        .gte('scheduled_at', periodStart.toISOString())
                        .lte('scheduled_at', periodEnd.toISOString());

                    const consultationCount = consultations?.length || 0;

                    // Calcular total
                    // Assuming payment_amount is always populated for COMPLETED. If null, treat as 0.
                    const totalAmount = (consultations || []).reduce((sum: number, c: any) => {
                        const amount = c.payment_amount || 0;
                        const percentage = doc.contract.percentage || 0;
                        const repasse = amount * (percentage / 100);
                        return sum + repasse;
                    }, 0);

                    // Criar registro de folha
                    const { data: payroll, error: payrollError } = await (supabase as any)
                        .from('medical_payroll')
                        .insert({
                            doctor_id: doc.id,
                            clinic_id: clinic.id,
                            period_start: periodStart.toISOString(),
                            period_end: periodEnd.toISOString(),
                            total_consultations: consultationCount,
                            total_amount: totalAmount,
                            status: 'DRAFT'
                        })
                        .select()
                        .single();

                    if (payrollError) throw payrollError;

                    // Criar lançamento financeiro (Despesa)
                    if (totalAmount > 0) {
                        await (supabase as any).from('financial_entries').insert({
                            clinic_id: clinic.id,
                            type: 'EXPENSE',
                            category: 'Repasse Médico', // Ideally retrieve ID from financial_categories
                            description: `Repasse Dr(a). ${doc.user.full_name} - ${periodStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
                            amount: totalAmount,
                            date: now.toISOString(),
                            status: 'PENDING',
                            metadata: { payroll_id: payroll.id }
                        });
                    }

                    // Enviar notificação ao médico
                    const html = `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Olá, Dr(a). ${doc.user.full_name}!</h2>
              <p>Seu repasse de ${periodStart.toLocaleDateString('pt-BR', { month: 'long' })} foi calculado:</p>
              <ul>
                <li><strong>Total de Consultas:</strong> ${consultationCount}</li>
                <li><strong>Valor Bruto:</strong> R$ ${(consultations || []).reduce((s: number, c: any) => s + (c.payment_amount || 0), 0).toFixed(2)}</li>
                <li><strong>Percentual:</strong> ${doc.contract.percentage}%</li>
                <li><strong>Valor do Repasse:</strong> R$ ${totalAmount.toFixed(2)}</li>
              </ul>
              <p>Previsão de pagamento: ${now.toLocaleDateString('pt-BR')}</p>
            </div>
          `;

                    await sendEmail(doc.user.email, 'Repasse Mensal Calculado', html);

                    stats.processed++;

                } catch (doctorError) {
                    console.error(`Error processing payroll for doctor ${doctor.id}:`, doctorError);
                    stats.errors++;
                }
            }
        }

        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        console.error('Payroll cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
