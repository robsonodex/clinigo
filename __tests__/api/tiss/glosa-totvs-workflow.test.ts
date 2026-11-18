/**
 * Suíte E2E / Unitária do Fluxo TISS CliniGo + Controle de Glosas (Padrão TOTVS RM Saúde)
 * Zero criação de registros reais em banco; 100% determinística via mocks.
 */

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => (req: any, ctx: any) => {
        req.log = mockLogger;
        return handler(req, ctx);
    },
    AxiomRequest: class {},
}));

jest.mock('next/server', () => {
    class MockNextRequest {
        url: string;
        method: string;
        private _bodyRaw: string;
        private _headers: Map<string, string>;
        nextUrl: URL;

        constructor(url: string, init?: any) {
            this.url = url;
            this.method = init?.method || 'GET';
            this._bodyRaw = typeof init?.body === 'string' ? init.body : JSON.stringify(init?.body || {});
            this._headers = new Map();
            this.nextUrl = new URL(url);
            if (init?.headers) {
                Object.entries(init.headers).forEach(([k, v]) => this._headers.set(k.toLowerCase(), String(v)));
            }
        }

        async json() {
            return this._bodyRaw ? JSON.parse(this._bodyRaw) : {};
        }

        clone() {
            return new MockNextRequest(this.url, {
                method: this.method,
                body: this._bodyRaw,
                headers: Object.fromEntries(this._headers.entries()),
            });
        }

        get headers() {
            return {
                get: (name: string) => this._headers.get(name.toLowerCase()) || null,
            };
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: jest.fn().mockImplementation((body, init) => ({
                status: init?.status || 200,
                json: async () => body,
            })),
        },
    };
});

const mockUserClient = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
};

const mockAdminDb = {
    from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockUserClient)),
    createServiceRoleClient: jest.fn(() => mockAdminDb),
}));

jest.mock('@/lib/tiss/audit', () => ({
    writeTissAudit: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('@/lib/auth/tiss-role-guard', () => ({
    requireTissAction: jest.fn((request: any, action: string) => {
        const role = request.headers.get('x-mock-role') || 'FINANCIAL';
        if (role === 'DOCTOR' || role === 'READONLY') {
            return Promise.resolve({
                authorized: false,
                response: {
                    status: 403,
                    json: async () => ({ success: false, error: 'Acesso negado ao módulo TISS' }),
                },
            });
        }
        if (role === 'RECEPTIONIST' && (action.startsWith('conta.') || action.startsWith('glosa.') || action.startsWith('recurso.'))) {
            return Promise.resolve({
                authorized: false,
                response: {
                    status: 403,
                    json: async () => ({ success: false, error: 'Acesso exclusivo do financeiro/administrador' }),
                },
            });
        }
        return Promise.resolve({
            authorized: true,
            session: {
                userId: request.headers.get('x-mock-user-id') || 'usr-1',
                clinicId: 'cli-1',
                role,
            },
        });
    }),
}));

import { calculateGuideGlosaSummary } from '@/lib/services/tiss/glosa-reconciliation';
import { syncAppointmentToTissAccount } from '@/lib/services/tiss/auto-billing-bridge';
import { computeAdvancedRepasse } from '@/lib/services/repasse-calculator';
import { POST as switchCategoryPost } from '@/app/api/appointments/[id]/switch-category/route';
import { POST as releaseAccountPost } from '@/app/api/tiss/accounts/[id]/release/route';
import { POST as level3GlosaPost } from '@/app/api/tiss/glosas/accounts/[guideId]/route';
import { POST as createAppealPost } from '@/app/api/tiss/appeals/route';
import { NextRequest } from 'next/server';

function makeChain(result: { data?: any; error?: any; count?: number | null }) {
    let pendingPayload: any = null;
    const resolveResult = () => {
        if (pendingPayload && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
            return { data: { ...result.data, ...pendingPayload }, error: result.error, count: result.count };
        }
        return result;
    };
    const chain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn((p: any) => {
            pendingPayload = Array.isArray(p) ? null : p;
            return chain;
        }),
        update: jest.fn((p: any) => {
            pendingPayload = p;
            return chain;
        }),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve(resolveResult())),
        maybeSingle: jest.fn(() => Promise.resolve(resolveResult())),
        then: (resolve: any) => Promise.resolve(resolveResult()).then(resolve),
    };
    return chain;
}

describe('Fluxo Completo Convênios, TISS, Glosas 3 Níveis e Repasse', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserClient.auth.getUser.mockResolvedValue({
            data: { user: { id: 'usr-1', email: 'fin@clinica.test' } },
            error: null,
        });
    });

    describe('1. Reconciliação e Batimento Contábil (glosa-reconciliation)', () => {
        it('deve calcular resumo por 4 grupos, diferença de batimento e pagamento a maior', () => {
            const summary = calculateGuideGlosaSummary({
                guide: {
                    id: 'g-1',
                    guide_number: '2026110001',
                    patient_name: 'Paciente Modelo',
                    total_value: 300,
                    glosa_value: 50,
                    paid_value: 250,
                },
                procedures: [
                    { id: 'p-1', item_group: 'HONORARIOS', total_value: 200, status: 'ACTIVE' },
                    { id: 'p-2', item_group: 'TAXAS', total_value: 60, status: 'ACTIVE' },
                    { id: 'p-3', item_group: 'MATERIAIS', total_value: 40, status: 'ACTIVE' },
                ],
                glosas: [
                    { id: 'gl-1', item_group: 'TAXAS', glosa_value: 30, is_irrecoverable: true, irrecoverable_value: 30, status: 'OPEN' },
                    { id: 'gl-2', item_group: 'HONORARIOS', glosa_value: 20, is_irrecoverable: false, status: 'OPEN' },
                ],
            });

            expect(summary.billed_total).toBe(300);
            expect(summary.entered_glosa_total).toBe(50);
            expect(summary.expected_glosa_total).toBe(50);
            expect(summary.difference).toBe(0);
            expect(summary.irrecoverable_total).toBe(30);
            expect(summary.approved_total).toBe(250);
            expect(summary.overpayment_received).toBe(0);
            expect(summary.by_group.find((g) => g.group === 'TAXAS')).toEqual({
                group: 'TAXAS',
                label: 'Taxas e Serviços',
                billed: 60,
                approved: 30,
                glosa: 30,
                irrecoverable: 30,
            });
            expect(summary.by_group.find((g) => g.group === 'DIAGNOSE')?.billed).toBe(0);

            const overpaid = calculateGuideGlosaSummary({
                guide: { id: 'g-2', guide_number: 'G2', patient_name: 'P2', total_value: 100, paid_value: 120 },
                procedures: [{ id: 'p-1', item_group: 'HONORARIOS', total_value: 100, status: 'ACTIVE' }],
                glosas: [],
            });
            expect(overpaid.overpayment_received).toBe(20);
        });
    });

    describe('2. Repasse Médico Integrado com Glosas Irrecuperáveis', () => {
        it('deve liberar repasse para guias PAID e descontar imediatamente glosa marcada como isIrrecoverableGlosa', () => {
            const resPaid = computeAdvancedRepasse({
                appointmentValue: 200,
                doctorFallbackPercentage: 50,
                isInsurance: true,
                regime: 'RECEBIMENTO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: {
                    guideStatus: 'PAID',
                    guideTotalValue: 200,
                    guidePaidValue: 200,
                    glosaValue: 0,
                    glosaMaintained: false,
                    isIrrecoverableGlosa: false,
                },
            });

            expect(resPaid.isEligibleForPayment).toBe(true);
            expect(resPaid.amount).toBe(100);
            expect(resPaid.discountAmount).toBe(0);

            const resIrrec = computeAdvancedRepasse({
                appointmentValue: 200,
                doctorFallbackPercentage: 50,
                isInsurance: true,
                regime: 'RECEBIMENTO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: {
                    guideStatus: 'PARTIALLY_GLOSED',
                    guideTotalValue: 200,
                    guidePaidValue: 100,
                    glosaValue: 100,
                    glosaMaintained: false,
                    isIrrecoverableGlosa: true,
                },
            });

            expect(resIrrec.isEligibleForPayment).toBe(true);
            expect(resIrrec.amount).toBe(50);
            expect(resIrrec.discountAmount).toBe(50);
            expect(resIrrec.discountReason).toContain('irrecuper');
        });
    });

    describe('3. Ponte Automática Recepção -> Conta Médica em Elaboração', () => {
        it('deve ignorar atendimento particular e atendimento não finalizado', async () => {
            const dbParticular = {
                from: jest.fn(() =>
                    makeChain({
                        data: { id: 'a-1', clinic_id: 'cli-1', payment_type: 'PARTICULAR', status: 'COMPLETED' },
                        error: null,
                    })
                ),
            };
            const resPart = await syncAppointmentToTissAccount({
                supabaseAdmin: dbParticular,
                clinicId: 'cli-1',
                appointmentId: 'a-1',
            });
            expect(resPart.skipped).toBe(true);
            expect(resPart.created).toBe(false);

            const dbPending = {
                from: jest.fn(() =>
                    makeChain({
                        data: { id: 'a-2', clinic_id: 'cli-1', payment_type: 'CONVENIO', status: 'CONFIRMED', session_status: null },
                        error: null,
                    })
                ),
            };
            const resPending = await syncAppointmentToTissAccount({
                supabaseAdmin: dbPending,
                clinicId: 'cli-1',
                appointmentId: 'a-2',
            });
            expect(resPending.skipped).toBe(true);
        });

        it('deve gerar conta TISS em billing_stage=ELABORACAO puxando preço contratado e alertas quando COMPLETED Convênio', async () => {
            const insertedGuides: any[] = [];
            const insertedItems: any[] = [];
            const db: any = {
                from: jest.fn((table: string) => {
                    if (table === 'appointments') {
                        return makeChain({
                            data: {
                                id: 'appt-10',
                                clinic_id: 'cli-1',
                                patient_id: 'pat-10',
                                doctor_id: 'doc-10',
                                appointment_date: '2026-11-18',
                                appointment_time: '09:00',
                                status: 'COMPLETED',
                                session_status: 'Presente',
                                payment_type: 'CONVENIO',
                                health_insurance_plan_id: 'plan-10',
                                insurance_card_number: '123456',
                                insurance_card_validity: '2025-01-01', // vencida para testar alerta
                                checkin_confirmed_at: '2026-11-18T09:02:00Z',
                            },
                            error: null,
                        });
                    }
                    if (table === 'tiss_guides') {
                        return {
                            ...makeChain({ data: null, error: null }),
                            insert: jest.fn((payload: any) => {
                                insertedGuides.push(payload);
                                return makeChain({
                                    data: { id: 'guide-created-1', guide_number: payload.guide_number },
                                    error: null,
                                });
                            }),
                        };
                    }
                    if (table === 'tiss_guide_procedures') {
                        return {
                            ...makeChain({ data: null, error: null }),
                            insert: jest.fn((payload: any) => {
                                insertedItems.push(payload);
                                return makeChain({ data: payload, error: null });
                            }),
                        };
                    }
                    if (table === 'patients') {
                        return makeChain({
                            data: { id: 'pat-10', full_name: 'Paciente Teste', cpf: '000', insurance_card_number: '123456', insurance_validity: '2025-01-01', health_insurance_id: 'ins-10' },
                            error: null,
                        });
                    }
                    if (table === 'health_insurance_plans') {
                        return makeChain({
                            data: { id: 'plan-10', name: 'Plano Basico', code: 'PB1', health_insurance_id: 'ins-10', coverage_percentage: 100 },
                            error: null,
                        });
                    }
                    if (table === 'health_insurances') {
                        return makeChain({ data: { id: 'ins-10', name: 'Operadora Modelo', ans_code: '123456' }, error: null });
                    }
                    if (table === 'doctors') {
                        return makeChain({ data: { id: 'doc-10', specialty: 'Fisioterapia', user: { full_name: 'Dra. Silva' } }, error: null });
                    }
                    if (table === 'medical_records') {
                        return makeChain({ data: { id: 'mr-1', signed_at: '2026-11-18T09:40:00Z', signature_hash: 'abc' }, error: null });
                    }
                    if (table === 'tiss_authorization_requests') {
                        return makeChain({ data: null, error: null });
                    }
                    if (table === 'health_insurance_price_tables') {
                        return makeChain({
                            data: [{ health_insurance_plan_id: 'plan-10', tuss_code: '20103662', procedure_name: 'Sessão de Terapia', price: 185.5, is_active: true }],
                            error: null,
                        });
                    }
                    return makeChain({ data: null, error: null });
                }),
            };

            const result = await syncAppointmentToTissAccount({
                supabaseAdmin: db,
                clinicId: 'cli-1',
                appointmentId: 'appt-10',
                triggeredByUserId: 'usr-1',
            });

            expect(result.created).toBe(true);
            expect(result.guideId).toBe('guide-created-1');
            expect(insertedGuides[0].billing_stage).toBe('ELABORACAO');
            expect(insertedGuides[0].total_value).toBe(185.5);
            expect(insertedGuides[0].procedure_code).toBe('20103662');
            expect(insertedItems[0].item_group).toBe('HONORARIOS');
            expect(result.warnings.some((w) => w.toLowerCase().includes('vencid'))).toBe(true);
        });
    });

    describe('4. Balcão: Alternar Categoria (Particular / Convênio)', () => {
        it('deve bloquear DOCTOR/READONLY (403) e permitir RECEPTIONIST alternar na própria clínica', async () => {
            mockAdminDb.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return makeChain({ data: { id: 'usr-doc', role: 'DOCTOR', clinic_id: 'cli-1' }, error: null });
                }
                return makeChain({ data: null, error: null });
            });

            const reqDenied = new NextRequest('http://localhost:3000/api/appointments/appt-1/switch-category', {
                method: 'POST',
                body: JSON.stringify({ payment_type: 'CONVENIO' }),
            });
            const resDenied = await switchCategoryPost(reqDenied as any, { params: Promise.resolve({ id: 'appt-1' }) });
            expect(resDenied.status).toBe(403);

            mockAdminDb.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return makeChain({ data: { id: 'usr-rec', role: 'RECEPTIONIST', clinic_id: 'cli-1' }, error: null });
                }
                if (table === 'appointments') {
                    return makeChain({
                        data: {
                            id: 'appt-1',
                            clinic_id: 'cli-1',
                            patient_id: 'pat-1',
                            payment_type: 'PARTICULAR',
                            health_insurance_plan_id: null,
                            insurance_card_number: '998877',
                            insurance_card_validity: '2027-12-31',
                        },
                        error: null,
                    });
                }
                if (table === 'patients') {
                    return makeChain({
                        data: { id: 'pat-1', health_insurance_id: 'ins-1', insurance_card_number: '998877', insurance_validity: '2027-12-31' },
                        error: null,
                    });
                }
                return makeChain({ data: null, error: null });
            });

            const reqRec = new NextRequest('http://localhost:3000/api/appointments/appt-1/switch-category', {
                method: 'POST',
                body: JSON.stringify({
                    payment_type: 'CONVENIO',
                    health_insurance_plan_id: '11111111-1111-1111-1111-111111111111',
                }),
            });
            const resRec = await switchCategoryPost(reqRec as any, { params: Promise.resolve({ id: 'appt-1' }) });
            expect(resRec.status).toBe(200);
            const body = await resRec.json();
            expect(body.success).toBe(true);
            expect(body.data.payment_type).toBe('CONVENIO');
        });
    });

    describe('5. Elaboração e Liberação de Contas (Ctrl+L)', () => {
        it('deve impedir liberação se Escudo Anti-Glosa apontar pendência e liberar quando válida', async () => {
            const updatePayloads: any[] = [];
            mockAdminDb.from.mockImplementation((table: string) => {
                if (table === 'users') return makeChain({ data: { clinic_id: 'cli-1' }, error: null });
                if (table === 'tiss_guides') {
                    return {
                        ...makeChain({
                            data: {
                                id: 'g-10',
                                clinic_id: 'cli-1',
                                billing_stage: 'ELABORACAO',
                                status: 'DRAFT',
                                appointment_id: null,
                                patient_id: 'pat-10',
                                total_value: 200,
                                batch_id: null,
                                health_insurance_id: 'ins-10',
                                procedure_code: '10101012',
                            },
                            error: null,
                        }),
                        update: jest.fn((p: any) => {
                            updatePayloads.push(p);
                            return makeChain({ data: { id: 'g-10', ...p }, error: null });
                        }),
                    };
                }
                if (table === 'patients') {
                    return makeChain({ data: { id: 'pat-10', insurance_card_number: null, insurance_validity: null }, error: null });
                }
                if (table === 'tiss_guide_procedures') {
                    return makeChain({ data: [{ id: 'p-1', total_value: 200, status: 'ACTIVE' }], error: null });
                }
                return makeChain({ data: null, error: null });
            });

            const reqBlock = new NextRequest('http://localhost:3000/api/tiss/accounts/g-10/release', {
                method: 'POST',
                headers: { 'x-mock-role': 'FINANCIAL' },
                body: JSON.stringify({ action: 'release', force: false }),
            });
            const resBlock = await releaseAccountPost(reqBlock as any, { params: Promise.resolve({ id: 'g-10' }) });
            expect(resBlock.status).toBe(422);

            const reqForce = new NextRequest('http://localhost:3000/api/tiss/accounts/g-10/release', {
                method: 'POST',
                headers: { 'x-mock-role': 'FINANCIAL' },
                body: JSON.stringify({ action: 'release', force: true }),
            });
            const resForce = await releaseAccountPost(reqForce as any, { params: Promise.resolve({ id: 'g-10' }) });
            expect(resForce.status).toBe(200);
            expect(updatePayloads.some((p) => p.billing_stage === 'LIBERADA')).toBe(true);
        });
    });

    describe('6. Nível 3 Controle de Glosas (Batimento Contábil e Glosa Irrecuperável)', () => {
        it('deve validar batimento antes de concluir conta (422 quando houver diferença sem force_batimento)', async () => {
            mockAdminDb.from.mockImplementation((table: string) => {
                if (table === 'users') return makeChain({ data: { clinic_id: 'cli-1' }, error: null });
                if (table === 'tiss_guides') {
                    return makeChain({
                        data: {
                            id: 'g-30',
                            clinic_id: 'cli-1',
                            guide_number: 'G30',
                            patient_name: 'Paciente 30',
                            total_value: 200,
                            paid_value: 150,
                            glosa_value: 50,
                            batch_id: 'b-30',
                        },
                        error: null,
                    });
                }
                if (table === 'tiss_guide_procedures') {
                    return makeChain({ data: [{ id: 'p-30', item_group: 'HONORARIOS', total_value: 200, status: 'ACTIVE' }], error: null });
                }
                if (table === 'tiss_glosas') {
                    return makeChain({ data: [], error: null });
                }
                return makeChain({ data: null, error: null });
            });

            const reqMismatch = new NextRequest('http://localhost:3000/api/tiss/glosas/accounts/g-30', {
                method: 'POST',
                headers: { 'x-mock-role': 'FINANCIAL' },
                body: JSON.stringify({
                    action: 'complete_account_review',
                    force_batimento: false,
                }),
            });
            const resMismatch = await level3GlosaPost(reqMismatch as any, { params: Promise.resolve({ guideId: 'g-30' }) });
            expect(resMismatch.status).toBe(422);
            const dataMismatch = await resMismatch.json();
            expect(dataMismatch.code).toBe('BATIMENTO_DIVERGENCE');
        });
    });

    describe('7. Bloqueio de Recurso em Glosas Irrecuperáveis', () => {
        it('deve retornar 422 IRRECOVERABLE_GLOSA_BLOCKED ao tentar criar lote C1 com glosa marcada como irrecuperável', async () => {
            const validInsuranceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
            const validGlosaId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

            mockUserClient.from.mockImplementation((table: string) => {
                if (table === 'users') return makeChain({ data: { clinic_id: 'cli-1' }, error: null });
                if (table === 'health_insurances') {
                    return makeChain({ data: { id: validInsuranceId, name: 'Operadora Modelo', appeal_deadline_days: 30 }, error: null });
                }
                if (table === 'tiss_glosas') {
                    return makeChain({
                        data: [
                            {
                                id: validGlosaId,
                                clinic_id: 'cli-1',
                                glosa_value: 120,
                                status: 'OPEN',
                                can_appeal: true,
                                is_irrecoverable: true,
                            },
                        ],
                        error: null,
                    });
                }
                return makeChain({ data: null, error: null });
            });

            const reqAppeal = new NextRequest('http://localhost:3000/api/tiss/appeals', {
                method: 'POST',
                headers: { 'x-mock-role': 'FINANCIAL' },
                body: JSON.stringify({
                    health_insurance_id: validInsuranceId,
                    general_reason: 'Contestação de cobrança com documentação clínica anexada',
                    items: [{ glosa_id: validGlosaId, contested_value: 120 }],
                }),
            });
            const resAppeal = await createAppealPost(reqAppeal as any, {});
            expect(resAppeal.status).toBe(422);
            const body = await resAppeal.json();
            expect(body.code).toBe('IRRECOVERABLE_GLOSA_BLOCKED');
        });
    });
});
