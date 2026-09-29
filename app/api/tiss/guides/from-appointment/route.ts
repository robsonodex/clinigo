import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';

const fromAppointmentSchema = z.object({
    appointment_id: z.string().uuid('ID do agendamento inválido'),
    tuss_code: z.string().optional().nullable().or(z.literal('')).transform(v => v || '10101012'), // 10101012 = Consulta em consultório padrão
    authorization_number: z.string().optional().nullable().or(z.literal('')).transform(v => v || null),
    guide_type: z.enum(['CONSULTATION', 'SPSADT']).optional().default('CONSULTATION'),
    force_creation: z.boolean().optional().default(false), // Criação mesmo com avisos
});

/**
 * POST /api/tiss/guides/from-appointment
 * Gera cirurgicamente uma guia TISS a partir de um atendimento realizado,
 * com pré-preenchimento completo, consulta à tabela de preços e proteção contra duplicidade.
 */
export async function POST(request: NextRequest) {
    try {
        const guard = await enforceTissAdministrativeGuard(request);
        if (!guard.authorized) {
            return guard.response;
        }

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

        // Restrição RBAC: Apenas Administrador, Faturamento ou Recepção podem emitir guias
        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'FINANCIAL' && profile.role !== 'RECEPTIONIST') {
            return NextResponse.json({ success: false, error: 'Acesso negado: sem permissão para gerar guias TISS' }, { status: 403 });
        }

        const body = await request.json();
        const validated = fromAppointmentSchema.parse(body);

        // 1. Buscar dados do agendamento
        const { data: appt, error: apptErr } = await supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                payment_type,
                health_insurance_id,
                health_insurance_plan_id,
                health_insurance:health_insurances(id, name, code, ans_code),
                patient_id,
                patient:patients(
                    id,
                    full_name,
                    cpf,
                    date_of_birth,
                    health_insurance_card,
                    health_insurance_validity,
                    health_insurance_id
                ),
                doctor_id,
                doctor:doctors(
                    id,
                    crm,
                    cbo_code,
                    specialty,
                    council_name,
                    user:users(full_name)
                )
            `)
            .eq('id', validated.appointment_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (apptErr || !appt) {
            return NextResponse.json({ success: false, error: 'Atendimento não encontrado nesta clínica' }, { status: 404 });
        }

        // 2. Proteção contra duplicidade: Verificar se já existe guia ativa para este atendimento e procedimento
        const targetTuss = validated.tuss_code || '10101012';
        const { data: existingGuide } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, status, created_at')
            .eq('clinic_id', profile.clinic_id)
            .eq('appointment_id', appt.id)
            .eq('procedure_code', targetTuss)
            .not('status', 'eq', 'DENIED')
            .maybeSingle();

        if (existingGuide) {
            return NextResponse.json({
                success: false,
                code: 'GUIDE_ALREADY_EXISTS',
                error: `Já existe uma guia TISS emitida para este atendimento (Guia nº ${existingGuide.guide_number}). Operação cancelada para evitar duplicidade.`,
                existing_guide_id: existingGuide.id,
            }, { status: 409 });
        }

        // 3. Validação do Convênio do Atendimento
        const insuranceId = appt.health_insurance_id || appt.patient?.health_insurance_id;
        if (!insuranceId) {
            return NextResponse.json({
                success: false,
                error: 'Este atendimento não está associado a uma operadora de convênio.',
            }, { status: 400 });
        }

        // 4. Checklist Anti-Glosa pré-envio
        const warnings: string[] = [];
        const cardNumber = appt.patient?.health_insurance_card?.trim() || '';
        const validityStr = appt.patient?.health_insurance_validity;

        if (!cardNumber) {
            warnings.push('Número da carteirinha do beneficiário não está preenchido no cadastro do paciente.');
        }

        if (validityStr) {
            const cardDate = new Date(validityStr);
            const apptDate = new Date(appt.appointment_date);
            if (cardDate < apptDate) {
                warnings.push(`Carteirinha estava VENCIDA na data do atendimento (${new Date(validityStr).toLocaleDateString('pt-BR')}). Risco de glosa por motivo 1001/1002.`);
            }
        }

        // 5. Consulta à Tabela de Preços Contratada
        let procedurePrice = 0;
        let procedureName = 'Consulta Médica';
        let requiresAuth = false;

        const { data: priceRecord } = await supabase
            .from('health_insurance_price_tables')
            .select('*')
            .eq('clinic_id', profile.clinic_id)
            .eq('health_insurance_id', insuranceId)
            .eq('tuss_code', targetTuss)
            .eq('is_active', true)
            .maybeSingle();

        if (priceRecord) {
            procedurePrice = Number(priceRecord.price) || 0;
            procedureName = priceRecord.procedure_name || procedureName;
            requiresAuth = priceRecord.requires_authorization || false;
        } else {
            // Fallback para descrição oficial TUSS
            const { data: tussRecord } = await supabase
                .from('tuss_procedures')
                .select('description')
                .eq('code', targetTuss)
                .maybeSingle();

            if (tussRecord) {
                procedureName = tussRecord.description;
            }
            warnings.push(`Procedimento TUSS ${targetTuss} não possui preço cadastrado na tabela do convênio. Valor atribuído R$ 0,00.`);
        }

        // Validação de dados profissionais do executante
        const doctorData = appt.doctor as any;
        const doctorName = doctorData?.user?.full_name || 'Profissional Executante';
        const doctorCbo = doctorData?.cbo_code?.trim() || '';
        const doctorCouncil = doctorData?.crm?.trim() || '';

        if (!doctorCbo) {
            warnings.push('Profissional executante não possui Código Brasileiro de Ocupações (CBO) cadastrado. Risco crítico de glosa na ANS.');
        }
        if (!doctorCouncil) {
            warnings.push('Profissional executante não possui registro de conselho de classe (CRM/CRP/CREFITO/CRFa) cadastrado.');
        }

        // Checar autorização obrigatória e saldo de sessões
        const finalAuthNumber = validated.authorization_number || null;
        if (requiresAuth && !finalAuthNumber) {
            warnings.push('Este procedimento exige autorização prévia da operadora e nenhuma senha/código foi informada.');
        }

        if (finalAuthNumber) {
            const { data: authRecord } = await supabase
                .from('tiss_authorization_requests')
                .select('id, sessions_used, sessions_authorized')
                .eq('clinic_id', profile.clinic_id)
                .eq('authorization_number', finalAuthNumber)
                .maybeSingle();

            if (authRecord) {
                const authorized = authRecord.sessions_authorized || 1;
                const used = authRecord.sessions_used || 0;
                const remaining = authorized - used;
                if (remaining <= 0) {
                    warnings.push(`Autorização ${finalAuthNumber} com saldo de sessões esgotado (${used}/${authorized} utilizadas). Risco crítico de glosa.`);
                } else if (remaining === 1) {
                    warnings.push(`Aviso de saldo: Última sessão restante na autorização ${finalAuthNumber} (1 de ${authorized}).`);
                }
            }
        }

        // Inferência inteligente de tipo de guia (Consulta vs SP/SADT)
        // Procedimentos de terapias multidisciplinares (Rol 22 grupo 2, ex: 20104049 psicoterapia, 20104081 fono, 20104090 TO)
        // ou exames e procedimentos (grupos 3 e 4) usam obrigatoriamente Guia SP/SADT no padrão ANS.
        let resolvedGuideType = validated.guide_type;
        if (targetTuss.startsWith('2') || targetTuss.startsWith('3') || targetTuss.startsWith('4') || targetTuss.startsWith('5')) {
            resolvedGuideType = 'SPSADT';
        } else if (targetTuss.startsWith('10101')) {
            resolvedGuideType = 'CONSULTATION';
        }

        // Se houver avisos impeditivos e não estiver forçado
        if (warnings.length > 0 && !validated.force_creation && (!cardNumber || (requiresAuth && !finalAuthNumber))) {
            return NextResponse.json({
                success: false,
                code: 'PRE_CHECK_WARNINGS',
                error: 'Foram detectadas pendências anti-glosa na emissão da guia.',
                warnings,
                can_force: true,
            }, { status: 422 });
        }

        // 6. Gerar Número Sequencial da Guia
        const year = new Date().getFullYear();
        const { count: guideCount } = await supabase
            .from('tiss_guides')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', profile.clinic_id)
            .gte('created_at', `${year}-01-01`);

        const nextNum = (guideCount || 0) + 1;
        const guideNumber = `${year}${String(nextNum).padStart(6, '0')}`;

        // 8. Inserir Guia TISS
        const { data: newGuide, error: insertError } = await supabase
            .from('tiss_guides')
            .insert({
                clinic_id: profile.clinic_id,
                appointment_id: appt.id,
                patient_id: appt.patient_id,
                doctor_id: appt.doctor_id,
                guide_number: guideNumber,
                guide_type: resolvedGuideType,
                patient_name: appt.patient?.full_name || 'Paciente',
                patient_cpf: appt.patient?.cpf || null,
                patient_card_number: cardNumber,
                patient_card_validity: validityStr || null,
                procedure_code: targetTuss,
                procedure_name: procedureName,
                procedure_quantity: 1,
                unit_value: procedurePrice,
                total_value: procedurePrice,
                execution_date: appt.appointment_date,
                authorization_code: finalAuthNumber,
                status: 'PENDING',
                validation_status: warnings.length === 0 ? 'VALID' : 'WARNING',
                created_at: new Date().toISOString(),
                status_history: [
                    {
                        status: 'PENDING',
                        timestamp: new Date().toISOString(),
                        updated_by: profile.full_name,
                        notes: 'Guia gerada automaticamente a partir do atendimento',
                    }
                ],
            })
            .select()
            .single();

        if (insertError) {
            console.error('[TISS] Erro ao criar guia a partir do agendamento:', insertError);
            return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        // 9. Inserir procedimento detalhado
        await supabase
            .from('tiss_guide_procedures')
            .insert({
                guide_id: newGuide.id,
                procedure_code: targetTuss,
                procedure_name: procedureName,
                quantity: 1,
                unit_value: procedurePrice,
                execution_date: appt.appointment_date,
            })
            .select()
            .maybeSingle();

        // 10. Se houver número de autorização vinculado, abater do saldo de sessões
        if (finalAuthNumber) {
            const { data: authRecord } = await supabase
                .from('tiss_authorization_requests')
                .select('id, sessions_used, sessions_authorized')
                .eq('clinic_id', profile.clinic_id)
                .eq('authorization_number', finalAuthNumber)
                .maybeSingle();

            if (authRecord) {
                await supabase
                    .from('tiss_authorization_requests')
                    .update({ sessions_used: (authRecord.sessions_used || 0) + 1 })
                    .eq('id', authRecord.id);
            }
        }

        // 11. Auditoria
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_GUIDE_GENERATED_FROM_APPOINTMENT',
            entity_type: 'tiss_guide',
            entity_id: newGuide.id,
            metadata: {
                appointment_id: appt.id,
                guide_number: guideNumber,
                procedure_code: targetTuss,
                total_value: procedurePrice,
                warnings_count: warnings.length,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Guia TISS nº ${guideNumber} gerada com sucesso a partir do atendimento`,
            guide: newGuide,
            warnings: warnings.length > 0 ? warnings : undefined,
        }, { status: 201 });

    } catch (err: any) {
        console.error('[TISS] Exceção ao gerar guia:', err);
        if (err instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
