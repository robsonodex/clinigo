import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/accounts
 * Lista contas médicas em Elaboração / Liberadas / Em Lote / Faturadas para a tela Elaboração de Contas,
 * com checklist do Escudo Anti-Glosa em tempo real.
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'conta.ver');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const billingStage = searchParams.get('billing_stage');
        const insuranceId = searchParams.get('health_insurance_id');
        const doctorId = searchParams.get('doctor_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const search = (searchParams.get('search') || '').trim().toLowerCase();

        let query = adminDb
            .from('tiss_guides')
            .select(`
                id,
                clinic_id,
                batch_id,
                appointment_id,
                patient_id,
                doctor_id,
                health_insurance_id,
                authorization_request_id,
                guide_number,
                guide_type,
                patient_name,
                patient_cpf,
                patient_card_number,
                patient_card_validity,
                procedure_code,
                procedure_name,
                procedure_quantity,
                unit_value,
                total_value,
                authorization_code,
                execution_date,
                status,
                validation_status,
                billing_stage,
                released_at,
                released_by,
                account_notes,
                created_at,
                updated_at,
                health_insurance:health_insurances(id, name, code),
                doctor:doctors(id, user:users(full_name)),
                batch:tiss_batches(id, batch_number, status, insurance_company_name)
            `)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .not('status', 'in', '("CANCELLED","CANCELED")')
            .order('execution_date', { ascending: false })
            .limit(250);

        if (billingStage && billingStage !== 'ALL') {
            query = query.eq('billing_stage', billingStage);
        }
        if (insuranceId && insuranceId !== 'ALL') {
            query = query.eq('health_insurance_id', insuranceId);
        }
        if (doctorId && doctorId !== 'ALL') {
            query = query.eq('doctor_id', doctorId);
        }
        if (startDate) {
            query = query.gte('execution_date', startDate);
        }
        if (endDate) {
            query = query.lte('execution_date', endDate);
        }

        const { data: guides, error } = await query;
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const list = guides || [];
        const guideIds = list.map((g: any) => g.id);
        const apptIds = Array.from(new Set(list.map((g: any) => g.appointment_id).filter(Boolean))) as string[];
        const authIds = Array.from(new Set(list.map((g: any) => g.authorization_request_id).filter(Boolean))) as string[];

        const [{ data: procs }, { data: appts }, { data: records }, { data: auths }] = await Promise.all([
            guideIds.length > 0
                ? adminDb
                      .from('tiss_guide_procedures')
                      .select('id, guide_id, item_group, total_value, status')
                      .in('guide_id', guideIds)
                      .neq('status', 'CANCELLED')
                : Promise.resolve({ data: [] }),
            apptIds.length > 0
                ? adminDb
                      .from('appointments')
                      .select('id, checkin_confirmed_at, therapist_start_verified_at, status, session_status')
                      .eq('clinic_id', clinicId)
                      .in('id', apptIds)
                : Promise.resolve({ data: [] }),
            apptIds.length > 0
                ? adminDb
                      .from('medical_records')
                      .select('id, appointment_id, signed_at, signature_hash')
                      .eq('clinic_id', clinicId)
                      .in('appointment_id', apptIds)
                : Promise.resolve({ data: [] }),
            authIds.length > 0
                ? adminDb
                      .from('tiss_authorization_requests')
                      .select('id, authorization_number, expires_at, sessions_authorized, sessions_used, status')
                      .eq('clinic_id', clinicId)
                      .in('id', authIds)
                : Promise.resolve({ data: [] }),
        ]);

        const apptMap = new Map<string, any>((appts || []).map((a: any) => [a.id, a]));
        const recordMap = new Map<string, any>((records || []).map((r: any) => [r.appointment_id, r]));
        const authMap = new Map<string, any>((auths || []).map((au: any) => [au.id, au]));
        const procsByGuide = new Map<string, any[]>();
        for (const p of procs || []) {
            const arr = procsByGuide.get(p.guide_id) || [];
            arr.push(p);
            procsByGuide.set(p.guide_id, arr);
        }

        const todayIso = new Date().toISOString().split('T')[0];

        const enriched = list
            .map((g: any) => {
                const appt = g.appointment_id ? apptMap.get(g.appointment_id) : null;
                const rec = g.appointment_id ? recordMap.get(g.appointment_id) : null;
                const auth = g.authorization_request_id ? authMap.get(g.authorization_request_id) : null;
                const guideProcs = procsByGuide.get(g.id) || [];

                const issues: string[] = [];
                const blockers: string[] = [];

                const cardNumberMissing = !g.patient_card_number || g.patient_card_number === 'PENDENTE';
                const cardExpired = Boolean(g.patient_card_validity && g.patient_card_validity < (g.execution_date || todayIso));
                const priceZero = Number(g.total_value || 0) <= 0;
                const noInsurance = !g.health_insurance_id && !g.batch?.insurance_company_name;
                const biometricOk = Boolean(appt?.checkin_confirmed_at || appt?.therapist_start_verified_at);
                const evolutionOk = Boolean(rec?.id);
                const authExpired = Boolean(auth?.expires_at && String(auth.expires_at).slice(0, 10) < (g.execution_date || todayIso));
                const authExhausted = Boolean(auth && Number(auth.sessions_used || 0) > Number(auth.sessions_authorized || 1));

                if (cardNumberMissing) blockers.push('Carteirinha não informada');
                if (cardExpired) blockers.push('Carteirinha vencida na data do atendimento');
                if (priceZero) blockers.push('Conta com valor zerado');
                if (noInsurance) blockers.push('Operadora não vinculada');
                if (authExpired) issues.push('Senha de autorização vencida');
                if (authExhausted) issues.push('Saldo de sessões autorizadas excedido');
                if (appt && !biometricOk) issues.push('Check-in/biometria pendente');
                if (appt && !evolutionOk) issues.push('Evolução clínica pendente no prontuário');

                const shield_status = blockers.length > 0 ? 'BLOCKED' : issues.length > 0 ? 'WARNING' : 'OK';

                return {
                    ...g,
                    total_value: Number(g.total_value || 0),
                    doctor_name: g.doctor?.user?.full_name || 'Não informado',
                    insurance_name: g.health_insurance?.name || g.batch?.insurance_company_name || 'Sem operadora',
                    items_count: guideProcs.length || 1,
                    shield: {
                        status: shield_status,
                        blockers,
                        warnings: issues,
                        biometric_ok: biometricOk,
                        evolution_ok: evolutionOk,
                        card_ok: !cardNumberMissing && !cardExpired,
                        price_ok: !priceZero,
                    },
                };
            })
            .filter((item: any) => {
                if (!search) return true;
                return (
                    String(item.patient_name || '').toLowerCase().includes(search) ||
                    String(item.guide_number || '').toLowerCase().includes(search) ||
                    String(item.authorization_code || '').toLowerCase().includes(search) ||
                    String(item.procedure_code || '').toLowerCase().includes(search) ||
                    String(item.doctor_name || '').toLowerCase().includes(search)
                );
            });

        const counts = {
            ALL: enriched.length,
            ELABORACAO: enriched.filter((i: any) => i.billing_stage === 'ELABORACAO').length,
            LIBERADA: enriched.filter((i: any) => i.billing_stage === 'LIBERADA').length,
            EM_LOTE: enriched.filter((i: any) => i.billing_stage === 'EM_LOTE').length,
            FATURADA: enriched.filter((i: any) => ['FATURADA', 'EM_REVISAO_GLOSA', 'FINALIZADA'].includes(i.billing_stage)).length,
        };

        return NextResponse.json({
            success: true,
            data: enriched,
            counts,
        });
    } catch (err: any) {
        request.log.error('tiss/accounts GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao carregar contas' }, { status: 500 });
    }
});

