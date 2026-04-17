/** @jest-environment node */
import { GET, POST } from '@/app/api/financial/insurance-payments/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock dependências
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('Financial API - Insurance Payments', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'admin-id-123' } },
                    error: null,
                }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('POST /api/financial/insurance-payments', () => {
        it('should correctly calculate net_amount and save payment', async () => {
            // Mock RBAC: is CLINIC_ADMIN
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'CLINIC_ADMIN' },
                error: null,
            });

            // Mock DB insert return
            mockSupabase.single.mockResolvedValueOnce({
                data: {
                    id: 'payment-123',
                    gross_amount: 10000,
                    discounts_irrf: 150,
                    discounts_iss: 500,
                    discounts_other: 50,
                    accepted_glosas: 300,
                    net_amount: 9000,
                    status: 'PENDING'
                },
                error: null,
            });

            const body = {
                health_insurance_id: '123e4567-e89b-12d3-a456-426614174000',
                tiss_batch_id: null,
                competence_month: 4,
                competence_year: 2026,
                credit_date: '2026-04-15',
                gross_amount: 10000,
                discounts_irrf: 150,
                discounts_iss: 500,
                discounts_other: 50,
                accepted_glosas: 300,
            };

            const request = new NextRequest('http://localhost/api/financial/insurance-payments', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            
            // Check if correct calculation was inserted
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    gross_amount: 10000,
                    discounts_irrf: 150,
                    discounts_iss: 500,
                    discounts_other: 50,
                    accepted_glosas: 300,
                    net_amount: 9000 // 10000 - 150 - 500 - 50 - 300 = 9000
                })
            );
        });

        it('should forbid RECEPTIONIST from creating a payment', async () => {
            // Mock RBAC: is RECEPTIONIST
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'RECEPTIONIST' },
                error: null,
            });

            const body = {
                health_insurance_id: '123e4567-e89b-12d3-a456-426614174000',
                competence_month: 4,
                competence_year: 2026,
                credit_date: '2026-04-15',
                gross_amount: 1000,
            };

            const request = new NextRequest('http://localhost/api/financial/insurance-payments', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toMatch(/Sem permissão/);
            expect(mockSupabase.insert).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/financial/insurance-payments', () => {
        it('should correctly fetch payments if CLINIC_ADMIN', async () => {
            // Mock RBAC
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'CLINIC_ADMIN' },
                error: null,
            });

            // Mock list result
            mockSupabase.order.mockResolvedValueOnce({
                data: [{ id: 'p1' }, { id: 'p2' }],
                error: null,
            });

            const request = new NextRequest('http://localhost/api/financial/insurance-payments');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.data.length).toBe(2);
        });

        it('should forbid RECEPTIONIST from listing payments', async () => {
            // Mock RBAC
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'RECEPTIONIST' },
                error: null,
            });

            const request = new NextRequest('http://localhost/api/financial/insurance-payments');
            const response = await GET(request);
            
            expect(response.status).toBe(403);
            const data = await response.json();
            expect(data.error).toBe('Acesso negado');
        });
    });
});
