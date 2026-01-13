// app/api/insurance/check-eligibility/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const eligibilitySchema = z.object({
    insurance_company: z.string().min(1),
    card_number: z.string().min(1),
    patient_cpf: z.string().length(11),
    patient_name: z.string().min(1),
    patient_birthdate: z.string().optional(),
    patient_id: z.string().uuid().optional(),
});

/**
 * POST /api/insurance/check-eligibility
 * Verifica elegibilidade do paciente no convênio
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const body = await request.json();
        const validated = eligibility_schema.parse(body);

        const startTime = Date.now();

        // Verificar se há integração ativa para esta operadora
        const { data: integration } = await supabase
            .from('insurance_integrations')
            .select('*')
            .eq('clinic_id', profile.clinic_id)
            .eq('insurance_company', validated.insurance_company)
            .eq('integration_type', 'ELIGIBILITY')
            .eq('is_active', true)
            .single();

        let isActive = false;
        let planName = null;
        let coverageDetails = {};
        let errorMessage = null;

        if (integration) {
            // TODO: Implementar integração real com API da operadora
            // Por enquanto, simulando resposta
            isActive = true;
            planName = 'Plano Ambulatorial + Hospitalar';
            coverageDetails = {
                max_consultations: 12,
                procedures_covered: ['Consulta', 'Exames Laboratoriais'],
                copay_value: 0,
            };
        } else {
            errorMessage = 'Integração não configurada para esta operadora';
        }

        const responseTime = Date.now() - startTime;

        // Registrar verificação
        const { data: check, error: checkError } = await supabase
            .from('eligibility_checks')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id: validated.patient_id,
                insurance_company: validated.insurance_company,
                card_number: validated.card_number,
                patient_cpf: validated.patient_cpf,
                patient_name: validated.patient_name,
                patient_birthdate: validated.patient_birthdate,
                is_active: isActive,
                plan_name: planName,
                coverage_details: coverageDetails,
                checked_by: user.id,
                response_time_ms: responseTime,
                error_message: errorMessage,
            })
            .select()
            .single();

        if (checkError) throw checkError;

        return NextResponse.json({
            success: true,
            data: {
                is_active: isActive,
                plan_name: planName,
                coverage_details: coverageDetails,
                check_id: check.id,
            },
        });

    } catch (error: any) {
        console.error('[Insurance] Erro ao verificar elegibilidade:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
