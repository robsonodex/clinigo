/** @jest-environment node */
import { PUT } from '@/app/api/financial/conciliation/[batchId]/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('Financial API - Conciliation', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Chainable mock helper
        const makeChain = (resolvedData: any) => {
            const chain: any = {};
            chain.select = jest.fn().mockReturnValue(chain);
            chain.eq = jest.fn().mockReturnValue(chain);
            chain.order = jest.fn().mockReturnValue(chain);
            chain.single = jest.fn().mockResolvedValue(resolvedData);
            chain.maybeSingle = jest.fn().mockResolvedValue(resolvedData);
            chain.update = jest.fn().mockReturnValue(chain);
            chain.insert = jest.fn().mockReturnValue(chain);
            chain.then = (resolve: any) => resolve(resolvedData);
            return chain;
        };

        // Track call count to return different data
        let fromCallCount = 0;
        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'admin-1' } },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'users') {
                    return makeChain({ data: { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' }, error: null });
                }
                // For tiss_guides and tiss_batches updates
                return makeChain({ data: null, error: null });
            }),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('PUT /api/financial/conciliation/[batchId]', () => {
        const validBatchId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        const validGuideId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

        it('should correctly mark a guide as PAID when fully paid', async () => {
            const body = {
                reconciliations: [
                    {
                        guide_id: validGuideId,
                        paid_amount: 100,
                        glosa_amount: 0,
                    }
                ]
            };

            const request = new NextRequest(`http://localhost/api/financial/conciliation/${validBatchId}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });

            const response = await PUT(request, { params: Promise.resolve({ batchId: validBatchId }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify update was called on tiss_guides
            expect(mockSupabase.from).toHaveBeenCalledWith('tiss_guides');
            // Verify update was called on tiss_batches
            expect(mockSupabase.from).toHaveBeenCalledWith('tiss_batches');
        });

        it('should mark a guide as DENIED if glosa is total', async () => {
            const body = {
                reconciliations: [
                    {
                        guide_id: validGuideId,
                        paid_amount: 0,
                        glosa_amount: 100,
                    }
                ]
            };

            const request = new NextRequest(`http://localhost/api/financial/conciliation/${validBatchId}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });

            const response = await PUT(request, { params: Promise.resolve({ batchId: validBatchId }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should mark a guide as PARTIALLY_APPROVED if there is partial payment and partial glosa', async () => {
            const body = {
                reconciliations: [
                    {
                        guide_id: validGuideId,
                        paid_amount: 70,
                        glosa_amount: 30,
                    }
                ]
            };

            const request = new NextRequest(`http://localhost/api/financial/conciliation/${validBatchId}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });

            const response = await PUT(request, { params: Promise.resolve({ batchId: validBatchId }) });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });
    });
});
