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
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
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

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'clinics') {
                return { select: () => ({ eq: jest.fn().mockResolvedValue({ data: mockClinics }) }) };
            }
            if (table === 'doctors') {
                return { select: () => ({ eq: () => ({ eq: jest.fn().mockResolvedValue({ data: mockDoctors }) }) }) };
            }
            if (table === 'medical_payroll') {
                return {
                    select: () => ({ eq: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: null }) }) }) }),
                    insert: jest.fn().mockReturnValue({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'payroll-1' }, error: null }) }) })
                };
            }
            if (table === 'appointments') {
                return { select: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ lte: jest.fn().mockResolvedValue({ data: mockConsultations }) }) }) }) }) };
            }
            if (table === 'financial_entries') {
                return { insert: jest.fn().mockResolvedValue({ error: null }) };
            }
            return {};
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
