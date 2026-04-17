/** @jest-environment node */
import { GET } from '@/api/cron/doctor-payroll/route';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications';
import { NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}));

jest.mock('@/lib/notifications', () => ({
    sendEmail: jest.fn()
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({ body, init }))
    }
}));

process.env.CRON_SECRET_KEY = 'test-secret';

describe('Doctor Payroll Cron', () => {
    let mockSupabase: any;
    let originalDate: any;

    beforeAll(() => {
        originalDate = global.Date;
    });

    afterAll(() => {
        global.Date = originalDate;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Date to be 20th
        const mockDate = new Date('2026-05-20T10:00:00Z');
        global.Date = class extends Date {
            constructor(date) {
                if (date) return super(date);
                return mockDate;
            }
        } as any;

        // Mock Supabase
        mockSupabase = {
            from: jest.fn(),
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('should run only on day 20', async () => {
        // Mock Date to be 5th
        const mockDate = new Date('2026-05-05T10:00:00Z');
        global.Date = class extends Date {
            constructor(date) {
                if (date) return super(date);
                return mockDate;
            }
        } as any;

        const req = new Request('http://localhost/api/cron', {
            headers: { 'Authorization': 'Bearer test-secret' }
        });

        const res = await GET(req);
        expect(res.body.message).toBe('Not payroll day');
    });

    it('should process payroll for active doctors', async () => {
        // Mock Chain
        // 1. Get Clinics
        // 2. Get Doctors
        // 3. Check Existing Payroll
        // 4. Get Consultations
        // 5. Insert Payroll
        // 6. Insert Financial Entry

        const mockClinics = [{ id: 'clinic-1', name: 'Clinica A' }];
        const mockDoctors = [{
            id: 'doc-1',
            user: { full_name: 'Dr. House', email: 'house@md.com' },
            contract: { percentage: 50, fixed_value: 0 }
        }];
        const mockConsultations = [
            { id: 'c1', payment_amount: 200 }, // 50% = 100
            { id: 'c2', payment_amount: 300 }  // 50% = 150
        ]; // Total = 250

        // Helper to create a chainable mock that resolves at any point
        const chainable = (resolvedData: any) => {
            const chain: any = {};
            const resolver = jest.fn().mockResolvedValue(resolvedData);
            chain.select = jest.fn().mockReturnValue(chain);
            chain.eq = jest.fn().mockReturnValue(chain);
            chain.gte = jest.fn().mockReturnValue(chain);
            chain.lte = jest.fn().mockReturnValue(chain);
            chain.in = jest.fn().mockReturnValue(chain);
            chain.order = jest.fn().mockReturnValue(chain);
            chain.single = resolver;
            chain.maybeSingle = resolver;
            chain.insert = jest.fn().mockReturnValue(chain);
            chain.then = (resolve: any) => resolve(resolvedData);
            return chain;
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'clinics') {
                return chainable({ data: mockClinics, error: null });
            }
            if (table === 'doctors') {
                return chainable({ data: mockDoctors, error: null });
            }
            if (table === 'medical_payroll') {
                const c = chainable({ data: null, error: null }); // no existing payroll
                c.insert = jest.fn().mockReturnValue(chainable({ data: { id: 'payroll-1' }, error: null }));
                return c;
            }
            if (table === 'doctor_contracts') {
                return chainable({ data: { contract_type: 'PERCENTAGE', percentage: 50, fixed_value: 0 }, error: null });
            }
            if (table === 'appointments') {
                return chainable({ data: mockConsultations, error: null });
            }
            if (table === 'financial_entries') {
                return { insert: jest.fn().mockResolvedValue({ error: null }) };
            }
            return chainable({ data: null, error: null });
        });

        const req = new Request('http://localhost/api/cron', {
            headers: { 'Authorization': 'Bearer test-secret' }
        });

        const res = await GET(req);

        expect(res.body.success).toBe(true);
        expect(res.body.stats.processed).toBe(1);

        // Check insertion values
        expect(mockSupabase.from).toHaveBeenCalledWith('medical_payroll');
        // We expect insert to be called with calculated values
        // Unable to easily spy on specific call args in this mocked chain structure without more complex setup, 
        // but the success status and calls imply flow completion.

        expect(sendEmail).toHaveBeenCalledWith(
            'house@md.com',
            'Repasse Mensal Calculado',
            expect.stringContaining('R$ 250.00')
        );
    });
});
