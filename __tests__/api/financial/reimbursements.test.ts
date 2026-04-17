/** @jest-environment node */
import { GET, POST } from '@/app/api/financial/reimbursements/route';
import { POST as POSTApprove } from '@/app/api/financial/reimbursements/[id]/approve/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('Financial API - Reimbursements', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'user-123' } },
                    error: null,
                }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('POST /api/financial/reimbursements', () => {
        it('should allow RECEPTIONIST to create a reimbursement', async () => {
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'RECEPTIONIST' },
                error: null,
            });

            mockSupabase.single.mockResolvedValueOnce({
                data: { id: 'reimb-123', amount: 50.00, status: 'PENDING' },
                error: null,
            });

            const body = {
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                amount: 50.00,
                reason: 'Consulta cancelada',
                pix_key: '12345678909',
                pix_key_type: 'CPF'
            };

            const request = new NextRequest('http://localhost/api/financial/reimbursements', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 50.00,
                    reason: 'Consulta cancelada',
                    status: 'PENDING'
                })
            );
        });
    });

    describe('POST /api/financial/reimbursements/[id]/approve', () => {
        it('should forbid RECEPTIONIST from approving a reimbursement', async () => {
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'RECEPTIONIST' },
                error: null,
            });

            const request = new NextRequest('http://localhost/api/financial/reimbursements/reimb-123/approve', { method: 'POST' });
            // Workaround Next.js context mock for Next 13+
            const context = { params: Promise.resolve({ id: 'reimb-123' }) };

            const response = await POSTApprove(request, context as any);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Sem permissão para aprovar reembolsos');
        });

        it('should allow CLINIC_ADMIN to approve and simulate PIX', async () => {
            // Mock permissions
            mockSupabase.single.mockResolvedValueOnce({
                data: { clinic_id: 'clinic-123', role: 'CLINIC_ADMIN' },
                error: null,
            });

            // Mock fetch reimbursement query
            mockSupabase.single.mockResolvedValueOnce({
                data: { id: 'reimb-123', status: 'PENDING', amount: 100, patient_id: 'patient-1' },
                error: null, // no error
            });

            const request = new NextRequest('http://localhost/api/financial/reimbursements/reimb-123/approve', { method: 'POST' });
            const context = { params: Promise.resolve({ id: 'reimb-123' }) };

            const response = await POSTApprove(request, context as any);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            // Verify update to COMPLETED
            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'COMPLETED' })
            );
            // Verify insert into financial_entries
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ entry_type: 'EXPENSE', category: 'REEMBOLSO_PACIENTE' })
            );
        });
    });
});
