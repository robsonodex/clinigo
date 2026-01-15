import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();
    const today = now.getDate();

    try {
        const { getClinicAutomationConfig } = await import('@/lib/automation-config');

        // Buscar clínicas com plano ENTERPRISE e NETWORK
        const { data: clinicsData } = await (supabase as any)
            .from('clinics')
            .select('id, name, plan_type')
            .in('plan_type', ['ENTERPRISE', 'NETWORK'])
            .eq('is_active', true);

        const clinics = clinicsData as any[];
        const stats = { batches_created: 0, guides_created: 0, errors: 0 };

        for (const clinic of clinics || []) {
            // 1. Get Config
            const config = await getClinicAutomationConfig<any>(
                supabase,
                clinic.id,
                'tiss_batch',
                clinic.plan_type
            );

            // If disabled (auto_generate = false) or configs says disabled
            if (!config || config.auto_generate === false) continue;

            // Check day
            const targetDay = config.day_of_month || 5;
            if (today !== targetDay) continue;

            // Logic variables
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const referenceMonth = lastMonth.getMonth() + 1; // 1-12
            const referenceYear = lastMonth.getFullYear();

            // Buscar operadoras ativas
            const { data: insurancesData } = await (supabase as any)
                .from('health_insurances')
                .select('id, name')
                .eq('clinic_id', clinic.id)
                .eq('is_active', true);

            const insurances = insurancesData as any[];

            for (const insurance of insurances || []) {
                try {
                    // Verificar se já existe lote para este período
                    const { data: existingBatch } = await (supabase as any)
                        .from('tiss_batches')
                        .select('id')
                        .eq('clinic_id', clinic.id)
                        .eq('insurance_company_id', insurance.id)
                        .eq('reference_month', referenceMonth)
                        .eq('reference_year', referenceYear)
                        .single();

                    if (existingBatch) continue;

                    // Buscar consultas elegíveis (convênio, realizadas, não faturadas as TISS)
                    const monthStart = new Date(referenceYear, referenceMonth - 1, 1);
                    const monthEnd = new Date(referenceYear, referenceMonth, 1);

                    const { data: appointmentsData } = await (supabase as any)
                        .from('appointments')
                        .select(`
              id,
              patient_id,
              doctor_id,
              scheduled_at,
              payment_amount,
              patients (
                id,
                full_name,
                cpf,
                insurance_card_number
              ),
              doctors (
                id,
                full_name,
                crm,
                crm_state
              )
            `)
                        .eq('clinic_id', clinic.id)
                        .eq('status', 'COMPLETED')
                        .is('tiss_guide_id', null)
                        .gte('scheduled_at', monthStart.toISOString())
                        .lt('scheduled_at', monthEnd.toISOString());

                    const appointments = appointmentsData as any[];

                    if (!appointments?.length) continue;

                    // Gerar número do lote: YYYYMM + 001 (simplified)
                    const batchNumber = `${referenceYear}${String(referenceMonth).padStart(2, '0')}001`;

                    // Criar lote
                    const { data: batch, error: batchError } = await (supabase as any)
                        .from('tiss_batches')
                        .insert({
                            clinic_id: clinic.id,
                            insurance_company_id: insurance.id,
                            batch_number: batchNumber,
                            reference_month: referenceMonth,
                            reference_year: referenceYear,
                            status: 'DRAFT',
                            total_guides: appointments.length,
                            total_value: appointments.reduce((sum: number, a: any) => sum + (a.payment_amount || 0), 0)
                        })
                        .select()
                        .single();

                    if (batchError) {
                        console.error('Error creating batch:', batchError);
                        continue;
                    }

                    // Criar guias
                    const guides = appointments.map((apt: any, index: number) => ({
                        batch_id: batch.id,
                        guide_number: `${batchNumber}${String(index + 1).padStart(4, '0')}`,
                        patient_id: apt.patient_id,
                        doctor_id: apt.doctor_id,
                        procedure_code: '10101012',
                        procedure_name: 'Consulta médica',
                        unit_value: apt.payment_amount || 0,
                        quantity: 1,
                        total_value: apt.payment_amount || 0,
                        status: 'PENDING'
                    }));

                    const { error: guidesError } = await (supabase as any).from('tiss_guides').insert(guides);

                    if (guidesError) {
                        console.error('Error inserting guides', guidesError);
                        continue;
                    }

                    stats.batches_created++;
                    stats.guides_created += guides.length;

                    // Notificar admin da clínica
                    const { data: admin } = await (supabase as any)
                        .from('users')
                        .select('email, full_name')
                        .eq('clinic_id', clinic.id)
                        .eq('role', 'CLINIC_ADMIN')
                        .limit(1)
                        .single();

                    if (admin) {
                        const html = `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>Olá, ${admin.full_name}!</h2>
                <p>Um novo lote TISS foi gerado automaticamente:</p>
                <ul>
                  <li><strong>Operadora:</strong> ${insurance.name}</li>
                  <li><strong>Período:</strong> ${referenceMonth}/${referenceYear}</li>
                  <li><strong>Número do Lote:</strong> ${batchNumber}</li>
                  <li><strong>Total de Guias:</strong> ${guides.length}</li>
                  <li><strong>Valor Total:</strong> R$ ${batch.total_value.toFixed(2)}</li>
                </ul>
                <p>Acesse o dashboard para revisar e enviar.</p>
              </div>
            `;
                        await sendEmail(admin.email, `Lote TISS Gerado - ${insurance.name}`, html);
                    }

                } catch (innerError) {
                    console.error('Inner loop error:', innerError);
                    stats.errors++;
                }
            }
        }

        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        console.error('TISS batch cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
