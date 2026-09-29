/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
    createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        audit: jest.fn(),
    },
}));

const { createClient, createServiceRoleClient } = require('@/lib/supabase/server');

describe('D4.3: Agendamento com Verificação de Elegibilidade de Convênio por Perfil', () => {
    const checkAvailabilityRoute = require('@/app/api/appointments/check-availability/route');

    const testDoctorId = 'd0000000-0000-0000-0000-000000000001';
    const testPatientId = 'a0000000-0000-0000-0000-000000000002';
    const testClinicId = 'c0000000-0000-0000-0000-000000000003';
    const futureSlot = new Date(Date.now() + 86400000 * 3).toISOString();

    const mockPatient = {
        id: testPatientId,
        full_name: 'Maria Paciente Silva',
        cpf: '12345678901',
        health_insurance_id: 'a0000000-0000-0000-0000-000000000004',
        health_insurance_card: '9876543210001',
        health_insurance_validity: '2028-12-31',
        health_insurance: {
            id: 'a0000000-0000-0000-0000-000000000004',
            name: 'Unimed',
            status: 'ACTIVE',
        },
        health_insurance_plan: {
            id: 'plan-001',
            name: 'Unimed Especial',
        },
    };

    const mockDoctor = {
        id: testDoctorId,
        clinic_id: testClinicId,
        name: 'Dr. Lucas Medico',
    };

    const createMockSupabase = (userProfile: { id: string; role: string }) => {
        const queryChain: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
                return Promise.resolve({
                    data: {
                        id: userProfile.id,
                        role: userProfile.role,
                        clinic_id: testClinicId,
                        full_name: `Usuario ${userProfile.role}`,
                    },
                    error: null,
                });
            }),
            maybeSingle: jest.fn().mockImplementation(() => {
                return Promise.resolve({
                    data: mockPatient,
                    error: null,
                });
            }),
            insert: jest.fn().mockReturnThis(),
        };

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: userProfile.id, email: `${userProfile.role.toLowerCase()}@clinigo.com` } },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'doctors') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: mockDoctor, error: null }),
                    };
                }
                if (table === 'patients') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        maybeSingle: jest.fn().mockResolvedValue({ data: mockPatient, error: null }),
                    };
                }
                if (table === 'clinics') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: testClinicId, plan_type: 'ENTERPRISE', plan_limits: {} }, error: null }),
                    };
                }
                return queryChain;
            }),
            rpc: jest.fn((procName: string) => {
                if (procName === 'acquire_slot_lock' || procName === 'acquire_appointment_lock') {
                    return Promise.resolve({
                        data: [{
                            acquired: true,
                            lock_id: 'lock-12345',
                            expires_at: new Date(Date.now() + 30000).toISOString(),
                            message: 'Slot bloqueado com sucesso',
                        }],
                        error: null,
                    });
                }
                return Promise.resolve({ data: null, error: null });
            }),
        };

        createClient.mockResolvedValue(mockClient);
        createServiceRoleClient.mockReturnValue(mockClient);
        return mockClient;
    };

    const makeRequest = (userRole: string, userId: string) => {
        return new NextRequest(new URL('http://localhost:3000/api/appointments/check-availability'), {
            method: 'POST',
            headers: {
                'x-user-id': userId,
                'x-user-role': userRole,
                'x-clinic-id': testClinicId,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                doctor_id: testDoctorId,
                slot_datetime: futureSlot,
                patient_id: testPatientId,
                duration: 30,
            }),
        });
    };

    it('1. Deve permitir RECEPTIONIST verificar disponibilidade e elegibilidade de convênio sem erro HTTP', async () => {
        createMockSupabase({ id: 'u-receptionist-1', role: 'RECEPTIONIST' });
        const req = makeRequest('RECEPTIONIST', 'u-receptionist-1');

        const res = await checkAvailabilityRoute.POST(req);
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.available).toBe(true);
        expect(data.lock_id).toBe('lock-12345');
    });

    it('2. Deve permitir CLINIC_ADMIN verificar disponibilidade e elegibilidade de convênio sem erro HTTP', async () => {
        createMockSupabase({ id: 'u-admin-1', role: 'CLINIC_ADMIN' });
        const req = makeRequest('CLINIC_ADMIN', 'u-admin-1');

        const res = await checkAvailabilityRoute.POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.available).toBe(true);
        expect(data.lock_id).toBe('lock-12345');
    });

    it('3. Deve permitir DOCTOR verificar disponibilidade e elegibilidade de convênio em memória SEM bloqueio 403 do guard TISS', async () => {
        createMockSupabase({ id: 'u-doctor-1', role: 'DOCTOR' });
        const req = makeRequest('DOCTOR', 'u-doctor-1');

        const res = await checkAvailabilityRoute.POST(req);
        // O médico agendando consulta NUNCA deve receber 403 nem falhar por causa do guard de faturamento
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.available).toBe(true);
        expect(data.lock_id).toBe('lock-12345');
    });
});
