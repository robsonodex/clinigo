/** @jest-environment node */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/tiss/guides/[id]/route';

// Mock do supabase server
jest.mock('@/lib/supabase/server', () => {
    return {
        createClient: jest.fn(),
    };
});

import { createClient } from '@/lib/supabase/server';

describe('B2.1 - Restrição Estrita de Exclusão vs Cancelamento de Guia TISS', () => {
    const clinicId = '11111111-1111-4111-8111-111111111111';
    const receptionistId = 'recep-user-id';
    const financialId = 'fin-user-id';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockSupabase = (guideData: any, userRole: string, userId: string) => {
        return {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: userId, email: `${userRole.toLowerCase()}@clinigo.com` } },
                    error: null,
                }),
            },
            from: jest.fn().mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { id: userId, clinic_id: clinicId, role: userRole },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: guideData,
                                        error: guideData ? null : { message: 'Not found' },
                                    }),
                                }),
                            }),
                        }),
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockResolvedValue({ error: null }),
                            }),
                        }),
                        delete: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockResolvedValue({ error: null }),
                            }),
                        }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                };
            }),
        };
    };

    it('RECEPTIONIST tentando deletar guia VALIDADA deve receber 403 Forbidden (exige guia.cancelar)', async () => {
        const mockGuide = {
            id: 'guide-valid-1',
            status: 'PENDING',
            validation_status: 'VALID',
            batch_id: null,
            authorization_code: null,
            notes: null,
        };

        const mockSupabase = createMockSupabase(mockGuide, 'RECEPTIONIST', receptionistId);
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        const request = new NextRequest('http://localhost:3000/api/tiss/guides/guide-valid-1', {
            method: 'DELETE',
            headers: {
                'x-user-role': 'RECEPTIONIST',
                'x-user-id': receptionistId,
                'x-clinic-id': clinicId,
            },
        });

        const res = await DELETE(request, { params: Promise.resolve({ id: 'guide-valid-1' }) });
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.code).toBe('FORBIDDEN');
        expect(json.action).toBe('guia.cancelar');
    });

    it('RECEPTIONIST tentando deletar guia VINCULADA A LOTE deve receber 403 Forbidden (exige guia.cancelar)', async () => {
        const mockGuide = {
            id: 'guide-in-batch-1',
            status: 'PENDING',
            validation_status: 'NOT_VALIDATED',
            batch_id: 'batch-uuid-999',
            authorization_code: null,
            notes: null,
        };

        const mockSupabase = createMockSupabase(mockGuide, 'RECEPTIONIST', receptionistId);
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        const request = new NextRequest('http://localhost:3000/api/tiss/guides/guide-in-batch-1', {
            method: 'DELETE',
            headers: {
                'x-user-role': 'RECEPTIONIST',
                'x-user-id': receptionistId,
                'x-clinic-id': clinicId,
            },
        });

        const res = await DELETE(request, { params: Promise.resolve({ id: 'guide-in-batch-1' }) });
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.code).toBe('FORBIDDEN');
        expect(json.action).toBe('guia.cancelar');
    });

    it('RECEPTIONIST deletando RASCUNHO de guia sem lote deve conseguir com sucesso (200)', async () => {
        const mockGuide = {
            id: 'guide-draft-1',
            status: 'PENDING',
            validation_status: 'NOT_VALIDATED',
            batch_id: null,
            authorization_code: null,
            notes: null,
        };

        const mockSupabase = createMockSupabase(mockGuide, 'RECEPTIONIST', receptionistId);
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        const request = new NextRequest('http://localhost:3000/api/tiss/guides/guide-draft-1', {
            method: 'DELETE',
            headers: {
                'x-user-role': 'RECEPTIONIST',
                'x-user-id': receptionistId,
                'x-clinic-id': clinicId,
            },
        });

        const res = await DELETE(request, { params: Promise.resolve({ id: 'guide-draft-1' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toContain('rascunho');
    });

    it('FINANCIAL cancelando guia validada com justificativa deve ter sucesso gravando CANCELLED', async () => {
        const mockGuide = {
            id: 'guide-valid-2',
            status: 'VALIDATED',
            validation_status: 'VALID',
            batch_id: null,
            authorization_code: null,
            notes: 'Guia aprovada em pré-auditoria',
        };

        let updatedPayload: any = null;

        const mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: financialId, email: 'financeiro@clinigo.com' } },
                    error: null,
                }),
            },
            from: jest.fn().mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { id: financialId, clinic_id: clinicId, role: 'FINANCIAL' },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: mockGuide,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                        update: jest.fn().mockImplementation((payload) => {
                            updatedPayload = payload;
                            return {
                                eq: jest.fn().mockReturnValue({
                                    eq: jest.fn().mockResolvedValue({ error: null }),
                                }),
                            };
                        }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                };
            }),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        const request = new NextRequest('http://localhost:3000/api/tiss/guides/guide-valid-2', {
            method: 'DELETE',
            headers: {
                'x-user-role': 'FINANCIAL',
                'x-user-id': financialId,
                'x-clinic-id': clinicId,
            },
            body: JSON.stringify({ reason: 'Procedimento não realizado pelo beneficiário' }),
        });

        const res = await DELETE(request, { params: Promise.resolve({ id: 'guide-valid-2' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(updatedPayload.status).toBe('CANCELLED');
        expect(updatedPayload.status).not.toBe('DENIED');
        expect(updatedPayload.cancellation_reason).toBe('Procedimento não realizado pelo beneficiário');
    });
});
