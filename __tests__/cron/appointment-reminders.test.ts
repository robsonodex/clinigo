import { GET } from '@/api/cron/appointment-reminders/route';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsApp, sendEmail } from '@/lib/notifications';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}));

jest.mock('@/lib/notifications', () => ({
    sendWhatsApp: jest.fn(),
    sendEmail: jest.fn()
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({ body, init }))
    }
}));

// Setup ENV
process.env.CRON_SECRET_KEY = 'test-secret';

describe('Appointment Reminders Cron', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Supabase Chain
        const mockSelect = jest.fn();
        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        const mockEq = jest.fn();
        const mockGte = jest.fn();
        const mockLt = jest.fn();
        const mockSingle = jest.fn();

        // Setup basic query chain
        mockSupabase = {
            from: jest.fn(() => ({
                select: mockSelect,
                insert: mockInsert
            }))
        };

        // Chain implementations
        mockSelect.mockReturnValue({
            eq: mockEq
        });

        mockEq.mockReturnValue({
            gte: mockGte,
            eq: mockEq, // recursive for existing log check
            single: mockSingle
        });

        mockGte.mockReturnValue({
            lt: mockLt
        });

        mockLt.mockResolvedValue({
            data: [], // Default empty
            error: null
        });

        (createClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    it('should return 401 if unauthorized', async () => {
        const req = new Request('http://localhost/api/cron', {
            headers: { 'Authorization': 'Bearer wrong-key' }
        });
        const res = await GET(req);
        expect(res.init.status).toBe(401);
    });

    it('should send reminders for scheduled appointments', async () => {
        // Mock Appointments Data
        const mockAppointments = [
            {
                id: 'apt-1',
                scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24h
                patients: { id: 'p1', full_name: 'John Doe', phone: '5511999999999', email: 'john@example.com' },
                doctors: { id: 'd1', full_name: 'Dr. House', specialty: 'Diagnóstico' },
                clinics: { id: 'c1', name: 'Clinica Teste', plan_type: 'ENTERPRISE' }
            }
        ];

        // Mock the query chain response for appointments
        // We need to be careful because the code calls DB multiple times in a loop (24h, 2h, 15min)
        // For simplicity, we make the first call return our mock data, others empty
        const mockLt = jest.fn()
            .mockResolvedValueOnce({ data: mockAppointments, error: null }) // 24h window
            .mockResolvedValue({ data: [], error: null }); // others

        mockSupabase.from().select().eq().gte.mockReturnValue({ lt: mockLt });

        // Mock "existing log" check to return null (not sent yet)
        // The code does: .from('notification_logs').select().eq().eq().single()
        // We need to ensure the chain handles this structure.
        // Re-mocking specific chain for notification_logs
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'appointments') {
                return {
                    select: () => ({
                        eq: () => ({
                            gte: () => ({
                                lt: mockLt
                            })
                        })
                    })
                };
            }
            if (table === 'notification_logs') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: jest.fn().mockResolvedValue({ data: null }) // No existing log
                            })
                        })
                    }),
                    insert: jest.fn().mockResolvedValue({ error: null })
                };
            }
            return {};
        });

        const req = new Request('http://localhost/api/cron', {
            headers: { 'Authorization': 'Bearer test-secret' }
        });

        await GET(req);

        // Assertions
        expect(sendWhatsApp).toHaveBeenCalledWith(
            '5511999999999',
            expect.objectContaining({
                patient: expect.objectContaining({ full_name: 'John Doe' })
            }),
            'REMINDER_24H'
        );

        // Should log success
        expect(mockSupabase.from).toHaveBeenCalledWith('notification_logs');
    });
});
