import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const batchGenerateSchema = z.object({
    health_insurance_id: z.string().uuid().optional().nullable(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD obrigatório'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD obrigatório'),
    default_tuss_code: z.string().optional().default('10101012'),
});

/**
 * POST /api/tiss/guides/batch-generate
 * Geração em massa de guias TISS para atendimentos concluídos no período.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'FINANCIAL') {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        const body = await request.json();
        const validated = batchGenerateSchema.parse(body);

        // 1. Buscar atendimentos elegíveis concluídos no período
        let query = supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                payment_type,
                health_insurance_id,
                patient_id,
                patient:patients(
                    id,
                    full_name,
                    cpf,
                    health_insurance_card,
                    health_insurance_validity,
                    health_insurance_id
                ),
                doctor_id,
                doctor:doctors(
                    id,
                    crm,
                    cbo_code,
                    user:users(full_name)
                ),
                tiss_guides(id, status)
            `)
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', validated.start_date)
            .lte('appointment_date', validated.end_date);

        if (validated.health_insurance_id) {
            query = query.eq('health_insurance_id', validated.health_insurance_id);
        } else {
            query = query.not('health_insurance_id', 'is', null);
        }

        const { data: appointments, error: apptError } = await query;

        if (apptError) {
            return NextResponse.json({ success: false, error: apptError.message }, { status: 500 });
        }

        // Filtrar apenas os que não possuem guia ativa emitida
        const eligibleAppointments = (appointments || []).filter(a => {
            const hasActiveGuide = a.tiss_guides?.some((g: any) => g.status !== 'DENIED');
            return !hasActiveGuide;
        });

        if (eligibleAppointments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Nenhum atendimento pendente de guia TISS encontrado no período selecionado.',
                generated_count: 0,
                eligible_count: 0,
            });
        }

        // Carregar preços da clínica para o código TUSS
        const { data: priceRules } = await supabase
            .from('health_insurance_price_tables')
            .select('health_insurance_id, tuss_code, price, procedure_name')
            .eq('clinic_id', profile.clinic_id)
            .eq('tuss_code', validated.default_tuss_code)
            .eq('is_active', true);

        const priceMap = new Map<string, { price: number; name: string }>();
        priceRules?.forEach(r => {
            priceMap.set(r.health_insurance_id, {
                price: Number(r.price) || 0,
                name: r.procedure_name || 'Consulta Médica',
            });
        });

        const year = new Date().getFullYear();
        const { count: guideCount } = await supabase
            .from('tiss_guides')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', profile.clinic_id)
            .gte('created_at', `${year}-01-01`);

        let currentSeq = (guideCount || 0) + 1;
        const generatedGuides: any[] = [];

        for (const appt of eligibleAppointments) {
            const guideNumber = `${year}${String(currentSeq).padStart(6, '0')}`;
            currentSeq++;

            const insId = appt.health_insurance_id || appt.patient?.health_insurance_id;
            const priceInfo = insId ? priceMap.get(insId) : null;
            const unitPrice = priceInfo ? priceInfo.price : 0;
            const procedureName = priceInfo ? priceInfo.name : 'Consulta Médica';

            const guidePayload = {
                clinic_id: profile.clinic_id,
                appointment_id: appt.id,
                patient_id: appt.patient_id,
                doctor_id: appt.doctor_id,
                guide_number: guideNumber,
                guide_type: 'CONSULTATION',
                patient_name: appt.patient?.full_name || 'Paciente',
                patient_cpf: appt.patient?.cpf || null,
                patient_card_number: appt.patient?.health_insurance_card || '',
                patient_card_validity: appt.patient?.health_insurance_validity || null,
                procedure_code: validated.default_tuss_code,
                procedure_name: procedureName,
                procedure_quantity: 1,
                unit_value: unitPrice,
                total_value: unitPrice,
                execution_date: appt.appointment_date,
                status: 'PENDING',
                validation_status: 'VALID',
                created_at: new Date().toISOString(),
                status_history: [
                    {
                        status: 'PENDING',
                        timestamp: new Date().toISOString(),
                        updated_by: profile.full_name,
                        notes: 'Geração em lote de guias pendentes do período',
                    }
                ],
            };

            const { data: created, error: createErr } = await supabase
                .from('tiss_guides')
                .insert(guidePayload)
                .select()
                .single();

            if (!createErr && created) {
                generatedGuides.push(created);

                // Criar item de procedimento
                await supabase.from('tiss_guide_procedures').insert({
                    guide_id: created.id,
                    procedure_code: validated.default_tuss_code,
                    procedure_name: procedureName,
                    quantity: 1,
                    unit_value: unitPrice,
                    execution_date: appt.appointment_date,
                });
            }
        }

        // Auditoria
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_BATCH_GUIDES_BULK_GENERATED',
            entity_type: 'tiss_batch_generation',
            metadata: {
                total_eligible: eligibleAppointments.length,
                total_generated: generatedGuides.length,
                start_date: validated.start_date,
                end_date: validated.end_date,
            }
        });

        return NextResponse.json({
            success: true,
            message: `${generatedGuides.length} guias TISS geradas com sucesso a partir dos atendimentos do período.`,
            generated_count: generatedGuides.length,
            eligible_count: eligibleAppointments.length,
        });

    } catch (err: any) {
        console.error('[TISS] Erro na geração em massa:', err);
        if (err instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
