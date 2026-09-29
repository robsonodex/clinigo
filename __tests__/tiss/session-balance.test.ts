/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as postGuideFromAppt } from '@/app/api/tiss/guides/from-appointment/route';
import { DELETE as deleteGuide } from '@/app/api/tiss/guides/[id]/route';

// Mocks do Supabase
jest.mock('@/lib/supabase/server', () => {
    return {
        createClient: jest.fn(),
        createServiceRoleClient: jest.fn(),
    };
});

const { createClient } = require('@/lib/supabase/server');

describe('Controle e Devolução do Saldo de Sessões (item 4.2.A)', () => {
    const adminSession = {
        id: 'admin-uuid-1',
        email: 'admin@clinica.com.br',
    };

    const adminProfile = {
        id: 'admin-uuid-1',
        clinic_id: 'clinic-uuid-1',
        role: 'CLINIC_ADMIN',
        full_name: 'Administrador da Clínica',
    };

    const sampleAuth = {
        id: 'auth-record-uuid',
        clinic_id: 'clinic-uuid-1',
        authorization_number: 'AUTH-99999',
        sessions_authorized: 10,
        sessions_used: 4,
    };

    const sampleAppointment = {
        id: '11111111-1111-1111-1111-111111111111',
        clinic_id: 'clinic-uuid-1',
        patient_id: 'patient-uuid-1',
        doctor_id: 'doctor-uuid-1',
        appointment_date: '2026-09-29',
        appointment_time: '14:00',
        payment_method: 'CONVENIO',
        health_insurance_id: 'insurance-uuid-1',
        authorization_number: 'AUTH-99999',
        patient: {
            full_name: 'Paciente Teste',
            cpf: '12345678901',
            health_insurance_card: '123456789',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('1. Incrementa sessions_used ao criar guia a partir de agendamento com autorização', async () => {
        let authUpdatedSessions: number | null = null;

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: adminSession },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                const chain: any = {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    not: jest.fn().mockReturnThis(),
                    gte: jest.fn().mockResolvedValue({ count: 5 }),
                    single: jest.fn(),
                    maybeSingle: jest.fn(),
                    insert: jest.fn(),
                    update: jest.fn(),
                    delete: jest.fn(),
                };

                if (table === 'users') {
                    chain.single.mockResolvedValue({ data: adminProfile, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: adminProfile, error: null });
                } else if (table === 'appointments') {
                    chain.single.mockResolvedValue({ data: sampleAppointment, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: sampleAppointment, error: null });
                } else if (table === 'tiss_authorization_requests') {
                    chain.maybeSingle.mockResolvedValue({ data: { ...sampleAuth }, error: null });
                    chain.single.mockResolvedValue({ data: { ...sampleAuth }, error: null });
                    chain.update.mockImplementation((vals: any) => {
                        authUpdatedSessions = vals.sessions_used;
                        return { eq: jest.fn().mockResolvedValue({ error: null }) };
                    });
                } else if (table === 'tiss_guides') {
                    // Check anti-duplicidade retorna nulo (sem duplicata)
                    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
                    chain.insert.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { id: 'new-guide-uuid', guide_number: '2026000006' },
                                error: null,
                            }),
                        }),
                    });
                } else {
                    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
                    chain.single.mockResolvedValue({ data: null, error: null });
                    chain.insert.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                        }),
                    });
                }

                return chain;
            }),
        };

        createClient.mockResolvedValue(mockClient);

        const req = new NextRequest(new URL('http://localhost:3000/api/tiss/guides/from-appointment'), {
            method: 'POST',
            headers: {
                'x-user-id': adminSession.id,
                'x-user-role': 'CLINIC_ADMIN',
                'x-clinic-id': adminProfile.clinic_id,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                appointment_id: sampleAppointment.id,
                authorization_number: 'AUTH-99999',
            }),
        });

        const res = await postGuideFromAppt(req);
        expect(res.status).toBe(201);
        // sessions_used era 4, deve ter sido incrementado para 5
        expect(authUpdatedSessions).toBe(5);
    });

    it('2. Devolve (decrementa) sessions_used ao deletar uma guia pendente com autorização', async () => {
        let authDecrementedSessions: number | null = null;

        const mockGuideInDb = {
            id: 'guide-uuid-to-delete',
            clinic_id: 'clinic-uuid-1',
            status: 'PENDING',
            authorization_code: 'AUTH-99999',
        };

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: adminSession },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                const chain: any = {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    not: jest.fn().mockReturnThis(),
                    single: jest.fn(),
                    maybeSingle: jest.fn(),
                    delete: jest.fn().mockReturnThis(),
                    update: jest.fn(),
                };

                if (table === 'users') {
                    chain.single.mockResolvedValue({ data: adminProfile, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: adminProfile, error: null });
                } else if (table === 'tiss_guides') {
                    chain.single.mockResolvedValue({ data: mockGuideInDb, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: mockGuideInDb, error: null });
                    chain.delete.mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    });
                } else if (table === 'tiss_authorization_requests') {
                    chain.maybeSingle.mockResolvedValue({
                        data: { id: 'auth-record-uuid', sessions_used: 5 },
                        error: null,
                    });
                    chain.update.mockImplementation((vals: any) => {
                        authDecrementedSessions = vals.sessions_used;
                        return { eq: jest.fn().mockResolvedValue({ error: null }) };
                    });
                } else {
                    chain.single.mockResolvedValue({ data: null, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
                }

                return chain;
            }),
        };

        createClient.mockResolvedValue(mockClient);

        const req = new NextRequest(new URL('http://localhost:3000/api/tiss/guides/guide-uuid-to-delete'), {
            method: 'DELETE',
            headers: {
                'x-user-id': adminSession.id,
                'x-user-role': 'CLINIC_ADMIN',
                'x-clinic-id': adminProfile.clinic_id,
            },
        });

        const res = await deleteGuide(req, { params: Promise.resolve({ id: 'guide-uuid-to-delete' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        // sessions_used era 5, deve ter sido decrementado para 4
        expect(authDecrementedSessions).toBe(4);
    });

    it('3. Alerta de saldo esgotado quando sessions_used >= sessions_authorized', async () => {
        const exhaustedAuth = {
            id: 'auth-exhausted',
            clinic_id: 'clinic-uuid-1',
            authorization_number: 'AUTH-EXHAUSTED',
            sessions_authorized: 5,
            sessions_used: 5,
        };

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: adminSession },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                const chain: any = {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    not: jest.fn().mockReturnThis(),
                    gte: jest.fn().mockResolvedValue({ count: 1 }),
                    single: jest.fn(),
                    maybeSingle: jest.fn(),
                    insert: jest.fn(),
                    update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
                };

                if (table === 'users') {
                    chain.single.mockResolvedValue({ data: adminProfile, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: adminProfile, error: null });
                } else if (table === 'appointments') {
                    chain.single.mockResolvedValue({ data: sampleAppointment, error: null });
                    chain.maybeSingle.mockResolvedValue({ data: sampleAppointment, error: null });
                } else if (table === 'tiss_authorization_requests') {
                    chain.maybeSingle.mockResolvedValue({ data: exhaustedAuth, error: null });
                    chain.single.mockResolvedValue({ data: exhaustedAuth, error: null });
                } else if (table === 'tiss_guides') {
                    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
                    chain.insert.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { id: 'new-guide-exhausted', guide_number: '2026000007', validation_status: 'WARNING' },
                                error: null,
                            }),
                        }),
                    });
                } else {
                    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
                    chain.single.mockResolvedValue({ data: null, error: null });
                    chain.insert.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                        }),
                    });
                }

                return chain;
            }),
        };

        createClient.mockResolvedValue(mockClient);

        const req = new NextRequest(new URL('http://localhost:3000/api/tiss/guides/from-appointment'), {
            method: 'POST',
            headers: {
                'x-user-id': adminSession.id,
                'x-user-role': 'CLINIC_ADMIN',
                'x-clinic-id': adminProfile.clinic_id,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                appointment_id: sampleAppointment.id,
                authorization_number: 'AUTH-EXHAUSTED',
                force_creation: true,
            }),
        });

        const res = await postGuideFromAppt(req);
        const data = await res.json();
        expect(res.status).toBe(201);
        expect(data.guide.validation_status).toBe('WARNING');
        expect(data.warnings).toEqual(expect.arrayContaining([
            expect.stringContaining('com saldo de sessões esgotado'),
        ]));
    });
});
