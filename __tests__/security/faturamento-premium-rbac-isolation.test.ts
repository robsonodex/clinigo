/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mocks do Supabase
jest.mock('@/lib/supabase/server', () => {
    return {
        createClient: jest.fn(),
        createServiceRoleClient: jest.fn(),
    };
});
jest.mock('@/lib/supabase/service-role', () => {
    return {
        createServiceRoleClient: jest.fn(),
    };
});

const { createClient, createServiceRoleClient } = require('@/lib/supabase/server');
const serviceRoleModule = require('@/lib/supabase/service-role');

describe('RBAC e Isolamento Multi-Clínica: Faturamento TISS Premium', () => {
    const CLINIC_A = '11111111-1111-1111-1111-111111111111';
    const CLINIC_B = '22222222-2222-2222-2222-222222222222';

    // Estado simulado do banco de dados de clínicas
    let mockClinicsDb: Record<string, any> = {};
    let mockAuditLogs: any[] = [];

    const resetDb = () => {
        mockClinicsDb = {
            [CLINIC_A]: {
                id: CLINIC_A,
                name: 'Clínica A (Piloto)',
                addons: { existing_feature: 'custom_val', telemedicina: true },
            },
            [CLINIC_B]: {
                id: CLINIC_B,
                name: 'Clínica B (Padrão)',
                addons: { existing_feature: 'other_val', faturamento_premium: false },
            },
        };
        mockAuditLogs = [];
    };

    const setupMocksForUser = (user: { id: string; role: string; clinic_id?: string; email?: string }) => {
        const mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: user.id, email: user.email || 'user@clinigo.app' } },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: {
                                        id: user.id,
                                        role: user.role,
                                        clinic_id: user.clinic_id || null,
                                        email: user.email || 'user@clinigo.app',
                                    },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === 'clinics') {
                    return {
                        select: jest.fn((fields: string) => ({
                            eq: jest.fn((field: string, val: string) => ({
                                single: jest.fn().mockImplementation(() => {
                                    const clinic = mockClinicsDb[val];
                                    if (!clinic) return Promise.resolve({ data: null, error: { message: 'Not found' } });
                                    return Promise.resolve({ data: { ...clinic }, error: null });
                                }),
                            })),
                        })),
                        update: jest.fn((updates: any) => ({
                            eq: jest.fn((field: string, val: string) => {
                                if (mockClinicsDb[val]) {
                                    mockClinicsDb[val] = {
                                        ...mockClinicsDb[val],
                                        ...updates,
                                    };
                                }
                                return Promise.resolve({ data: mockClinicsDb[val], error: null });
                            }),
                        })),
                    };
                }

                if (table === 'audit_logs') {
                    return {
                        insert: jest.fn((log: any) => {
                            mockAuditLogs.push(log);
                            return Promise.resolve({ data: log, error: null });
                        }),
                    };
                }

                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
                };
            }),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
        (createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase);
        (serviceRoleModule.createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resetDb();
    });

    describe('1. RBAC de Escrita (POST /api/tiss/settings/premium)', () => {
        const createPostRequest = (role: string, userId: string, clinicId?: string, targetClinicId?: string) => {
            const body = JSON.stringify({
                enabled: true,
                ...(targetClinicId ? { clinic_id: targetClinicId } : {}),
            });
            return new NextRequest('http://localhost:3000/api/tiss/settings/premium', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-user-role': role,
                    'x-user-id': userId,
                    ...(clinicId ? { 'x-clinic-id': clinicId } : {}),
                },
                body,
            });
        };

        it('SUPER_ADMIN recebe 200, ativa flag e preserva chaves de addons preexistentes', async () => {
            setupMocksForUser({ id: 'super-admin-1', role: 'SUPER_ADMIN', clinic_id: CLINIC_A });
            const { POST } = await import('@/app/api/tiss/settings/premium/route');

            const req = createPostRequest('SUPER_ADMIN', 'super-admin-1', CLINIC_A, CLINIC_A);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.data.faturamento_premium).toBe(true);

            // Confere se addons foi atualizado sem apagar as outras chaves
            const clinicA = mockClinicsDb[CLINIC_A];
            expect(clinicA.addons.faturamento_premium).toBe(true);
            expect(clinicA.addons.existing_feature).toBe('custom_val');
            expect(clinicA.addons.telemedicina).toBe(true);

            // Confere log de auditoria
            expect(mockAuditLogs.length).toBeGreaterThanOrEqual(1);
            expect(mockAuditLogs[0].action).toBe('FEATURE_FLAG_FATURAMENTO_PREMIUM_ENABLED');
            expect(mockAuditLogs[0].entity_id).toBe(CLINIC_A);
        });

        it('CLINIC_ADMIN recebe 403 Forbidden (somente leitura, não pode mais gravar)', async () => {
            setupMocksForUser({ id: 'clinic-admin-1', role: 'CLINIC_ADMIN', clinic_id: CLINIC_A });
            const { POST } = await import('@/app/api/tiss/settings/premium/route');

            const req = createPostRequest('CLINIC_ADMIN', 'clinic-admin-1', CLINIC_A);
            const res = await POST(req);

            expect(res.status).toBe(403);
            expect(mockClinicsDb[CLINIC_A].addons.faturamento_premium).toBeUndefined();
        });

        it('FINANCIAL recebe 403 Forbidden', async () => {
            setupMocksForUser({ id: 'financial-1', role: 'FINANCIAL', clinic_id: CLINIC_A });
            const { POST } = await import('@/app/api/tiss/settings/premium/route');

            const req = createPostRequest('FINANCIAL', 'financial-1', CLINIC_A);
            const res = await POST(req);

            expect(res.status).toBe(403);
        });

        it('RECEPTIONIST recebe 403 Forbidden', async () => {
            setupMocksForUser({ id: 'receptionist-1', role: 'RECEPTIONIST', clinic_id: CLINIC_A });
            const { POST } = await import('@/app/api/tiss/settings/premium/route');

            const req = createPostRequest('RECEPTIONIST', 'receptionist-1', CLINIC_A);
            const res = await POST(req);

            expect(res.status).toBe(403);
        });

        it('READONLY recebe 403 Forbidden', async () => {
            setupMocksForUser({ id: 'readonly-1', role: 'READONLY', clinic_id: CLINIC_A });
            const { POST } = await import('@/app/api/tiss/settings/premium/route');

            const req = createPostRequest('READONLY', 'readonly-1', CLINIC_A);
            const res = await POST(req);

            expect(res.status).toBe(403);
        });

        it('DOCTOR recebe 403 Forbidden', async () => {
            setupMocksForUser({ id: 'doctor-1', role: 'DOCTOR', clinic_id: CLINIC_A });
            const { POST } = await import('@/app/api/tiss/settings/premium/route');

            const req = createPostRequest('DOCTOR', 'doctor-1', CLINIC_A);
            const res = await POST(req);

            expect(res.status).toBe(403);
        });
    });

    describe('2. RBAC de Leitura (GET /api/tiss/settings/premium)', () => {
        const createGetRequest = (role: string, userId: string, clinicId: string) => {
            return new NextRequest('http://localhost:3000/api/tiss/settings/premium', {
                method: 'GET',
                headers: {
                    'content-type': 'application/json',
                    'x-user-role': role,
                    'x-user-id': userId,
                    'x-clinic-id': clinicId,
                },
            });
        };

        it('RECEPTIONIST da clínica A recebe 200 com status da sua clínica', async () => {
            mockClinicsDb[CLINIC_A].addons.faturamento_premium = true;
            setupMocksForUser({ id: 'receptionist-1', role: 'RECEPTIONIST', clinic_id: CLINIC_A });
            const { GET } = await import('@/app/api/tiss/settings/premium/route');

            const req = createGetRequest('RECEPTIONIST', 'receptionist-1', CLINIC_A);
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.data.clinic_id).toBe(CLINIC_A);
            expect(json.data.faturamento_premium).toBe(true);
        });

        it('FINANCIAL recebe 200 com status da sua clínica', async () => {
            mockClinicsDb[CLINIC_A].addons.faturamento_premium = false;
            setupMocksForUser({ id: 'financial-1', role: 'FINANCIAL', clinic_id: CLINIC_A });
            const { GET } = await import('@/app/api/tiss/settings/premium/route');

            const req = createGetRequest('FINANCIAL', 'financial-1', CLINIC_A);
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.data.faturamento_premium).toBe(false);
        });

        it('CLINIC_ADMIN recebe 200 com status da sua clínica', async () => {
            mockClinicsDb[CLINIC_A].addons.faturamento_premium = true;
            setupMocksForUser({ id: 'admin-1', role: 'CLINIC_ADMIN', clinic_id: CLINIC_A });
            const { GET } = await import('@/app/api/tiss/settings/premium/route');

            const req = createGetRequest('CLINIC_ADMIN', 'admin-1', CLINIC_A);
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.data.faturamento_premium).toBe(true);
        });

        it('READONLY e DOCTOR recebem 403 Forbidden', async () => {
            const { GET } = await import('@/app/api/tiss/settings/premium/route');

            // READONLY
            setupMocksForUser({ id: 'readonly-1', role: 'READONLY', clinic_id: CLINIC_A });
            const reqReadonly = createGetRequest('READONLY', 'readonly-1', CLINIC_A);
            const resReadonly = await GET(reqReadonly);
            expect(resReadonly.status).toBe(403);

            // DOCTOR
            setupMocksForUser({ id: 'doctor-1', role: 'DOCTOR', clinic_id: CLINIC_A });
            const reqDoctor = createGetRequest('DOCTOR', 'doctor-1', CLINIC_A);
            const resDoctor = await GET(reqDoctor);
            expect(resDoctor.status).toBe(403);
        });
    });

    describe('3. Isolamento entre Clínicas (Multi-Tenant)', () => {
        it('Clínica A com flag ligada e Clínica B com flag desligada: isolamento estrito', async () => {
            mockClinicsDb[CLINIC_A].addons.faturamento_premium = true;
            mockClinicsDb[CLINIC_B].addons.faturamento_premium = false;

            const { GET } = await import('@/app/api/tiss/settings/premium/route');

            // Usuário da Clínica A
            setupMocksForUser({ id: 'user-a', role: 'RECEPTIONIST', clinic_id: CLINIC_A });
            const reqA = new NextRequest('http://localhost:3000/api/tiss/settings/premium', {
                method: 'GET',
                headers: { 'x-user-role': 'RECEPTIONIST', 'x-user-id': 'user-a', 'x-clinic-id': CLINIC_A },
            });
            const resA = await GET(reqA);
            const jsonA = await resA.json();
            expect(jsonA.data.clinic_id).toBe(CLINIC_A);
            expect(jsonA.data.faturamento_premium).toBe(true);

            // Usuário da Clínica B
            setupMocksForUser({ id: 'user-b', role: 'RECEPTIONIST', clinic_id: CLINIC_B });
            const reqB = new NextRequest('http://localhost:3000/api/tiss/settings/premium', {
                method: 'GET',
                headers: { 'x-user-role': 'RECEPTIONIST', 'x-user-id': 'user-b', 'x-clinic-id': CLINIC_B },
            });
            const resB = await GET(reqB);
            const jsonB = await resB.json();
            expect(jsonB.data.clinic_id).toBe(CLINIC_B);
            expect(jsonB.data.faturamento_premium).toBe(false);
        });
    });

    describe('4. Ciclo Completo: Painel Super Admin -> Clínica -> Desligamento', () => {
        it('Super admin liga no painel, clínica lê true, super admin desliga, clínica lê false', async () => {
            const { PATCH } = await import('@/app/api/super-admin/clinics/[id]/route');
            const { GET } = await import('@/app/api/tiss/settings/premium/route');

            // 1. Super Admin ativa para Clínica A
            setupMocksForUser({ id: 'super-1', role: 'SUPER_ADMIN' });
            const reqActivate = new NextRequest(`http://localhost:3000/api/super-admin/clinics/${CLINIC_A}`, {
                method: 'PATCH',
                headers: { 'x-user-role': 'SUPER_ADMIN', 'x-user-id': 'super-1', 'content-type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_faturamento_premium', enabled: true }),
            });
            const resActivate = await PATCH(reqActivate, { params: Promise.resolve({ id: CLINIC_A }) });
            expect(resActivate.status).toBe(200);
            expect(mockClinicsDb[CLINIC_A].addons.faturamento_premium).toBe(true);
            expect(mockClinicsDb[CLINIC_A].addons.telemedicina).toBe(true); // preservou

            // 2. Recepcionista da Clínica A lê estado -> TRUE
            setupMocksForUser({ id: 'recep-1', role: 'RECEPTIONIST', clinic_id: CLINIC_A });
            const reqRecep1 = new NextRequest('http://localhost:3000/api/tiss/settings/premium', {
                method: 'GET',
                headers: { 'x-user-role': 'RECEPTIONIST', 'x-user-id': 'recep-1', 'x-clinic-id': CLINIC_A },
            });
            const resRecep1 = await GET(reqRecep1);
            const jsonRecep1 = await resRecep1.json();
            expect(jsonRecep1.data.faturamento_premium).toBe(true);

            // 3. Super Admin desativa para Clínica A
            setupMocksForUser({ id: 'super-1', role: 'SUPER_ADMIN' });
            const reqDeactivate = new NextRequest(`http://localhost:3000/api/super-admin/clinics/${CLINIC_A}`, {
                method: 'PATCH',
                headers: { 'x-user-role': 'SUPER_ADMIN', 'x-user-id': 'super-1', 'content-type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_faturamento_premium', enabled: false }),
            });
            const resDeactivate = await PATCH(reqDeactivate, { params: Promise.resolve({ id: CLINIC_A }) });
            expect(resDeactivate.status).toBe(200);
            expect(mockClinicsDb[CLINIC_A].addons.faturamento_premium).toBe(false);
            expect(mockClinicsDb[CLINIC_A].addons.telemedicina).toBe(true); // preservou

            // 4. Recepcionista da Clínica A lê estado -> FALSE
            setupMocksForUser({ id: 'recep-1', role: 'RECEPTIONIST', clinic_id: CLINIC_A });
            const reqRecep2 = new NextRequest('http://localhost:3000/api/tiss/settings/premium', {
                method: 'GET',
                headers: { 'x-user-role': 'RECEPTIONIST', 'x-user-id': 'recep-1', 'x-clinic-id': CLINIC_A },
            });
            const resRecep2 = await GET(reqRecep2);
            const jsonRecep2 = await resRecep2.json();
            expect(jsonRecep2.data.faturamento_premium).toBe(false);
        });
    });
});
