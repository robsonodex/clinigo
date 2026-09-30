/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tiss/guides/[id]/duplicate/route';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('B2.1 / G5 - Duplicação de Guia para Múltiplas Sessões', () => {
    const clinicId = '11111111-1111-4111-8111-111111111111';
    const userId = 'user-fin-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockSupabase = (sourceGuide: any, authRecord: any) => {
        return {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: userId, email: 'financeiro@clinigo.com' } },
                    error: null,
                }),
            },
            rpc: jest.fn().mockImplementation((fn: string) => {
                if (fn === 'generate_tiss_guide_number') {
                    return Promise.resolve({ data: '2026000099', error: null });
                }
                return Promise.resolve({ data: null, error: null });
            }),
            from: jest.fn().mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { id: userId, clinic_id: clinicId, role: 'FINANCIAL' },
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
                                        data: sourceGuide,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockImplementation((data: any) => {
                                    return Promise.resolve({
                                        data: { id: 'new-guide-id', ...sourceGuide, guide_number: '2026000099' },
                                        error: null,
                                    });
                                }),
                            }),
                        }),
                    };
                }
                if (table === 'tiss_authorization_requests') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    maybeSingle: jest.fn().mockResolvedValue({
                                        data: authRecord,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
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

    it('Duplica com sucesso para N datas e respeita saldo de autorização', async () => {
        const sourceGuide = {
            id: 'guide-source-1',
            guide_number: '2026000010',
            guide_type: 'consulta',
            patient_id: 'pat-1',
            patient_name: 'Maria Oliveira',
            procedure_code: '10101012',
            procedure_name: 'Consulta Médica',
            procedure_quantity: 1,
            unit_value: 150.0,
            total_value: 150.0,
            authorization_code: 'AUTH-123',
            status: 'PENDING',
        };

        // Saldo de apenas 2 sessões restantes
        const authRecord = {
            id: 'auth-1',
            total_sessions: 5,
            sessions_used: 3, // restam 2
        };

        const mockSupabase = createMockSupabase(sourceGuide, authRecord);
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        // Pedir 3 datas
        const request = new NextRequest('http://localhost:3000/api/tiss/guides/guide-source-1/duplicate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-role': 'FINANCIAL',
                'x-user-id': userId,
                'x-clinic-id': clinicId,
            },
            body: JSON.stringify({
                dates: ['2026-10-01', '2026-10-08', '2026-10-15'],
            }),
        });

        const res = await POST(request, { params: Promise.resolve({ id: 'guide-source-1' }) });
        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.summary.requested_sessions).toBe(3);
        expect(json.summary.created_count).toBe(2);
        expect(json.summary.rejected_count).toBe(1);
        expect(json.rejected_items[0].reason).toMatch(/Saldo de sessões da autorização/);
    });
});
