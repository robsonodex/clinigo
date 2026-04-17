/** @jest-environment node */
import { GET, POST } from '@/app/api/financial/glosas/route';
import { PUT } from '@/app/api/financial/glosas/[glosaId]/appeal/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('Financial API - Glosas & Appeals', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'admin-1' } },
                    error: null,
                }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('POST /api/financial/glosas', () => {
        it('should successfully create a new glosa appeal if one does not exist', async () => {
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' },
                error: null,
            });

            // Mock no existing glosa
            mockSupabase.maybeSingle.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            // Mock successful insert
            mockSupabase.single.mockResolvedValueOnce({
                data: { id: 'new-glosa-id', guide_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', status: 'PENDING_APPEAL' },
                error: null,
            });

            const body = {
                guide_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                glosa_type: 'TOTAL',
                glosa_code: '1234',
                glosa_description: 'Sem assinatura médica',
                glosa_value: 150.00,
                original_value: 150.00,
                approved_value: 0
            };

            const request = new NextRequest('http://localhost/api/financial/glosas', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    guide_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    glosa_type: 'TOTAL',
                    can_appeal: true,
                    appeal_status: 'PENDING_APPEAL'
                })
            );
        });

        it('should block creation if a glosa already exists for this guide', async () => {
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-1', role: 'SUPER_ADMIN' },
                error: null,
            });

            // Mock an existing glosa
            mockSupabase.maybeSingle.mockResolvedValueOnce({
                data: { id: 'old-glosa' },
                error: null,
            });

            const body = {
                guide_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                glosa_type: 'PARTIAL',
                glosa_description: 'Valor diferente do acordado',
                glosa_value: 50.00,
                original_value: 150.00,
                approved_value: 100
            };

            const request = new NextRequest('http://localhost/api/financial/glosas', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toMatch(/já possui um registro/);
        });
    });

    describe('PUT /api/financial/glosas/[glosaId]/appeal', () => {
        it('should update appeal_status to APPEAL_APPROVED and update parent guide to PAID', async () => {
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' },
                error: null,
            });

            mockSupabase.single.mockResolvedValueOnce({
                data: { id: 'glosa-99', guide_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
                error: null,
            });

            const body = {
                action: 'MARK_APPROVED',
                appeal_response_value: 150.00,
                notes: 'Operadora acatou nosso recurso.'
            };

            const request = new NextRequest('http://localhost/api/financial/glosas/glosa-99/appeal', {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            const response = await PUT(request, { params: Promise.resolve({ glosaId: 'glosa-99' }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    appeal_status: 'APPEAL_APPROVED',
                    appeal_response_value: 150.00,
                    notes: 'Operadora acatou nosso recurso.'
                })
            );

            // Verify secondary call to tiss_guides
            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'PAID'
                })
            );
        });
    });
});
