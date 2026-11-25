import { z } from 'zod';

export interface EligibilityResult {
    is_active: boolean;
    plan_name: string | null;
    coverage_details: Record<string, any>;
    verification_method: 'INTERNAL_CHECK' | 'MANUAL_CONFERENCE' | 'OPERATOR_API';
    message: string;
    checked_by?: string;
    checked_at: string;
}

export const checkEligibilityInputSchema = z.object({
    insurance_company: z.string().optional(),
    card_number: z.string().optional(),
    patient_cpf: z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().min(11)).optional(),
    patient_name: z.string().optional(),
    patient_birthdate: z.string().optional(),
    patient_id: z.string().uuid().optional(),
    procedure_date: z.string().optional(),
    manual_conference_confirmed: z.boolean().optional(),
    manual_conference_notes: z.string().optional(),
});

export type CheckEligibilityInput = z.infer<typeof checkEligibilityInputSchema>;

export interface ExecutionContext {
    userId: string;
    clinicId: string;
    fullName?: string;
}

/**
 * Serviço central de checagem de elegibilidade de convênio.
 * Usado diretamente por APIs e chamadas internas (como agendamentos) sem depender de fetch HTTP.
 */
export async function checkInsuranceEligibilityService(
    input: CheckEligibilityInput,
    supabase: any,
    context: ExecutionContext
): Promise<EligibilityResult> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    // 1. Se for conferência manual informada pelo atendente
    if (input.manual_conference_confirmed) {
        await supabase.from('audit_logs').insert({
            clinic_id: context.clinicId,
            user_id: context.userId,
            action: 'ELIGIBILITY_MANUAL_CONFERENCE',
            entity_type: 'patient_insurance',
            metadata: {
                clinic_id: context.clinicId,
                insurance: input.insurance_company,
                card_last4: input.card_number ? String(input.card_number).slice(-4) : null,
                notes: input.manual_conference_notes || 'Conferido no portal da operadora',
            }
        });

        return {
            is_active: true,
            plan_name: 'Conferido no Portal da Operadora',
            coverage_details: {
                conference_type: 'MANUAL',
                notes: input.manual_conference_notes || 'Elegibilidade validada manualmente pelo atendente',
            },
            verification_method: 'MANUAL_CONFERENCE',
            message: `Elegibilidade confirmada via portal da operadora por ${context.fullName || 'Operador'} em ${new Date().toLocaleDateString('pt-BR')}`,
            checked_by: context.fullName,
            checked_at: now,
        };
    }

    // 2. Buscar dados do paciente se patient_id foi fornecido
    let patientRecord: any = null;
    if (input.patient_id || input.patient_cpf) {
        let query = supabase
            .from('patients')
            .select(`
                id,
                full_name,
                cpf,
                health_insurance_id,
                health_insurance_card,
                health_insurance_validity,
                health_insurance:health_insurances(id, name, status),
                health_insurance_plan:health_insurance_plans(id, name)
            `)
            .eq('clinic_id', context.clinicId);

        if (input.patient_id) {
            query = query.eq('id', input.patient_id);
        } else if (input.patient_cpf) {
            query = query.eq('cpf', input.patient_cpf);
        }

        const { data } = await query.maybeSingle();
        patientRecord = data;
    }

    // Se o paciente foi localizado e possui convênio cadastrado
    const insuranceName = input.insurance_company || patientRecord?.health_insurance?.name || '';
    const cardNumber = input.card_number || patientRecord?.health_insurance_card || '';
    const patientCpf = input.patient_cpf || patientRecord?.cpf || '';
    const patientName = input.patient_name || patientRecord?.full_name || '';

    // Se não tiver convênio associado
    if (!insuranceName && !patientRecord?.health_insurance_id) {
        return {
            is_active: false,
            plan_name: null,
            coverage_details: {},
            verification_method: 'INTERNAL_CHECK',
            message: 'Paciente sem convênio informado ou cadastrado.',
            checked_by: context.fullName,
            checked_at: now,
        };
    }

    // 3. Checar status da operadora
    if (insuranceName) {
        const { data: operadora } = await supabase
            .from('health_insurances')
            .select('id, name, status, tiss_version')
            .eq('clinic_id', context.clinicId)
            .ilike('name', `%${insuranceName}%`)
            .maybeSingle();

        if (operadora && operadora.status === 'INACTIVE') {
            return {
                is_active: false,
                plan_name: null,
                coverage_details: {},
                verification_method: 'INTERNAL_CHECK',
                message: `Operadora ${insuranceName} está inativa na clínica.`,
                checked_by: context.fullName,
                checked_at: now,
            };
        }
    }

    let isActive = false;
    let planName: string | null = null;
    let coverageDetails: Record<string, any> = {};
    let message = '';

    if (!patientRecord) {
        message = 'Paciente não localizado no cadastro interno. Favor validar no portal da operadora.';
    } else {
        const cardInRecord = patientRecord.health_insurance_card?.replace(/\s/g, '');
        const cardProvided = cardNumber ? cardNumber.replace(/\s/g, '') : null;
        const validityStr = patientRecord.health_insurance_validity;

        if (cardProvided && cardInRecord && cardInRecord !== cardProvided) {
            message = 'Número da carteirinha informado difere do cadastro do paciente.';
        } else if (validityStr) {
            const validityDate = new Date(validityStr);
            const targetDate = input.procedure_date ? new Date(input.procedure_date) : new Date();
            targetDate.setHours(0, 0, 0, 0);

            if (validityDate < targetDate) {
                isActive = false;
                message = `Carteirinha VENCIDA em ${validityDate.toLocaleDateString('pt-BR')}. Risco de glosa.`;
            } else {
                isActive = true;
                planName = patientRecord.health_insurance_plan?.name || 'Plano Cadastrado';
                message = `Carteirinha VÁLIDA até ${validityDate.toLocaleDateString('pt-BR')}.`;
                coverageDetails = {
                    valid_until: validityStr,
                    plan_name: planName,
                    procedures_covered: ['Consulta Ambulatorial', 'Sessões Terapêuticas'],
                    copay_value: 0
                };
            }
        } else {
            isActive = true;
            planName = patientRecord.health_insurance_plan?.name || 'Plano Cadastrado';
            message = 'Carteirinha cadastrada sem data de expiração. Validação cadastral ativa.';
            coverageDetails = {
                plan_name: planName,
                procedures_covered: ['Consulta Ambulatorial', 'Sessões Terapêuticas'],
                copay_value: 0
            };
        }
    }

    const responseTime = Date.now() - startTime;

    // Registrar no histórico real de elegibilidade (tiss_eligibility_checks — tabela existente com RLS)
    const { error: historyErr } = await supabase
        .from('tiss_eligibility_checks')
        .insert({
            clinic_id: context.clinicId,
            patient_id: input.patient_id || patientRecord?.id || null,
            health_insurance_id: patientRecord?.health_insurance_id || null,
            card_number: cardNumber || 'NAO_INFORMADO',
            card_validity: patientRecord?.health_insurance_validity || null,
            status: isActive ? 'ELIGIBLE' : 'INELIGIBLE',
            provider_response: {
                verification_method: 'INTERNAL_CHECK',
                insurance_company: insuranceName || null,
                plan_name: planName,
                coverage_details: coverageDetails,
                message,
                response_time_ms: responseTime,
                checked_at: now,
            },
            checked_by: context.userId,
        });

    if (historyErr) {
        console.warn('[EligibilityService] Falha ao gravar histórico em tiss_eligibility_checks:', historyErr.message);
    }

    return {
        is_active: isActive,
        plan_name: planName,
        coverage_details: coverageDetails,
        verification_method: 'INTERNAL_CHECK',
        message,
        checked_by: context.fullName,
        checked_at: now,
    };
}
