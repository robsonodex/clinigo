// app/api/insurance/check-eligibility/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';

export interface EligibilityResult {
    isActive: boolean;
    planName: string | null;
    coverageDetails: Record<string, any>;
    verificationMethod: 'INTERNAL_CHECK' | 'MANUAL_CONFERENCE' | 'OPERATOR_API';
    message: string;
    verifiedAt: string;
    verifiedBy?: string;
}

export interface EligibilityProvider {
    checkOnline(params: {
        operatorCode: string;
        cardNumber: string;
        patientCpf: string;
    }): Promise<EligibilityResult>;
}

const eligibilitySchema = z.object({
    insurance_company: z.string().min(1, 'Operadora obrigatória'),
    card_number: z.string().min(1, 'Número da carteirinha obrigatório'),
    patient_cpf: z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().min(11, 'CPF deve conter 11 dígitos')),
    patient_name: z.string().min(1, 'Nome do paciente obrigatório'),
    patient_birthdate: z.string().optional(),
    patient_id: z.string().uuid().optional(),
    manual_conference_confirmed: z.boolean().optional(),
    manual_conference_notes: z.string().optional(),
});

/**
 * POST /api/insurance/check-eligibility
 * Verifica elegibilidade do paciente no convênio (Validação cadastral interna + Registro de conferência manual)
 */
export async function POST(request: NextRequest) {
    try {
        const guard = await enforceTissAdministrativeGuard(request);
        if (!guard.authorized) {
            return guard.response;
        }

        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, full_name')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const body = await request.json();
        const validated = eligibilitySchema.parse(body);

        const startTime = Date.now();

        // 1. Buscar a operadora na clínica
        const { data: operadora } = await supabase
            .from('health_insurances')
            .select('id, name, status, tiss_version')
            .eq('clinic_id', profile.clinic_id)
            .ilike('name', `%${validated.insurance_company}%`)
            .maybeSingle();

        if (!operadora || operadora.status === 'INACTIVE') {
            return NextResponse.json({
                success: true,
                data: {
                    is_active: false,
                    plan_name: null,
                    coverage_details: {},
                    verification_method: 'INTERNAL_CHECK',
                    message: `Operadora ${validated.insurance_company} está inativa ou não cadastrada na clínica.`,
                    checked_by: profile.full_name,
                    checked_at: new Date().toISOString(),
                }
            });
        }

        // 2. Se for conferência manual confirmada pelo operador no portal da operadora
        if (validated.manual_conference_confirmed) {
            const now = new Date().toISOString();
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'ELIGIBILITY_MANUAL_CONFERENCE',
                entity_type: 'patient_insurance',
                metadata: {
                    patient_cpf: validated.patient_cpf,
                    insurance: validated.insurance_company,
                    card_number: validated.card_number,
                    notes: validated.manual_conference_notes || 'Conferido no portal da operadora',
                }
            });

            return NextResponse.json({
                success: true,
                data: {
                    is_active: true,
                    plan_name: 'Conferido no Portal da Operadora',
                    coverage_details: {
                        conference_type: 'MANUAL',
                        notes: validated.manual_conference_notes || 'Elegibilidade validada manualmente pelo atendente',
                    },
                    verification_method: 'MANUAL_CONFERENCE',
                    message: `Elegibilidade confirmada via portal da operadora por ${profile.full_name} em ${new Date().toLocaleDateString('pt-BR')}`,
                    checked_by: profile.full_name,
                    checked_at: now,
                }
            });
        }

        // 3. Validação cadastral interna (Checar carteirinha do paciente no banco)
        let query = supabase
            .from('patients')
            .select(`
                id,
                full_name,
                cpf,
                health_insurance_id,
                health_insurance_card,
                health_insurance_validity,
                health_insurance_plan:health_insurance_plans(id, name)
            `)
            .eq('clinic_id', profile.clinic_id);

        if (validated.patient_id) {
            query = query.eq('id', validated.patient_id);
        } else {
            query = query.eq('cpf', validated.patient_cpf);
        }

        const { data: patientRecord } = await query.maybeSingle();

        let isActive = false;
        let planName: string | null = null;
        let coverageDetails: Record<string, any> = {};
        let message = '';

        if (!patientRecord) {
            message = 'Paciente não localizado no cadastro interno. Favor validar no portal da operadora.';
        } else {
            const cardInRecord = patientRecord.health_insurance_card?.replace(/\s/g, '');
            const cardProvided = validated.card_number.replace(/\s/g, '');
            const validityStr = patientRecord.health_insurance_validity;

            if (cardInRecord && cardInRecord !== cardProvided) {
                message = 'Número da carteirinha informado difere do cadastro do paciente.';
            } else if (validityStr) {
                const validityDate = new Date(validityStr);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (validityDate < today) {
                    isActive = false;
                    message = `Carteirinha VENCIDA em ${validityDate.toLocaleDateString('pt-BR')}. Risco imediato de glosa.`;
                } else {
                    isActive = true;
                    planName = (patientRecord.health_insurance_plan as any)?.name || 'Plano Cadastrado';
                    message = `Carteirinha VÁLIDA até ${validityDate.toLocaleDateString('pt-BR')}.`;
                    coverageDetails = {
                        valid_until: validityStr,
                        plan_name: planName,
                        procedures_covered: ['Consulta Ambulatorial', 'Sessões Terapêuticas'],
                        copay_value: 0
                    };
                }
            } else {
                // Sem data de validade cadastrada
                isActive = true;
                planName = (patientRecord.health_insurance_plan as any)?.name || 'Plano Cadastrado';
                message = 'Carteirinha cadastrada sem data de expiração. Recomenda-se conferência no portal.';
                coverageDetails = {
                    plan_name: planName,
                    procedures_covered: ['Consulta Ambulatorial', 'Sessões Terapêuticas'],
                    copay_value: 0
                };
            }
        }

        const responseTime = Date.now() - startTime;

        // Registrar no histórico de elegibilidade
        await supabase
            .from('eligibility_checks')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id: validated.patient_id || patientRecord?.id,
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
                error_message: isActive ? null : message,
            })
            .select()
            .maybeSingle();

        return NextResponse.json({
            success: true,
            data: {
                is_active: isActive,
                plan_name: planName,
                coverage_details: coverageDetails,
                verification_method: 'INTERNAL_CHECK',
                message,
                checked_by: profile.full_name,
                checked_at: new Date().toISOString(),
            },
        });

    } catch (error: any) {
        console.error('[ELIGIBILITY] Erro na verificação:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
    }
}
