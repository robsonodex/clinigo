/** @jest-environment node */
import { GET } from '@/api/cron/appointment-reminders/route';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsApp, sendEmail } from '@/lib/notifications';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/notifications', () => ({
    sendWhatsApp: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/automation-config', () => ({
    getClinicAutomationConfig: jest.fn().mockResolvedValue({
        reminder_24h: true,
        reminder_2h: false,
        reminder_15min: false,
        channels: ['WHATSAPP', 'EMAIL'],
    }),
}));

describe('Cron: Appointment Reminders', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CRON_SECRET_KEY = 'test-secret';

        // Chainable mock helper
        const makeChain = (resolvedData: any) => {
            const chain: any = {};
            chain.select = jest.fn().mockReturnValue(chain);
            chain.eq = jest.fn().mockReturnValue(chain);
            chain.gte = jest.fn().mockReturnValue(chain);
            chain.lt = jest.fn().mockReturnValue(chain);
            chain.lte = jest.fn().mockReturnValue(chain);
            chain.order = jest.fn().mockReturnValue(chain);
            chain.single = jest.fn().mockResolvedValue(resolvedData);
            chain.insert = jest.fn().mockResolvedValue({ error: null });
            chain.then = (resolve: any) => resolve(resolvedData);
            return chain;
        };

        const mockAppointments = [
            {
                id: 'apt-1',
                scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                patients: { id: 'p1', full_name: 'John Doe', phone: '5511999999999', email: 'john@example.com' },
                doctors: { id: 'd1', full_name: 'Dr. House', specialty: 'Diagnóstico' },
            }
        ];

        mockSupabase = {
            from: jest.fn((table: string) => {
                if (table === 'clinics') {
                    return makeChain({ data: [{ id: 'c1', name: 'Clinica Teste', plan_type: 'ENTERPRISE' }], error: null });
                }
                if (table === 'appointments') {
                    return makeChain({ data: mockAppointments, error: null });
                }
                if (table === 'notification_logs') {
                    const c = makeChain({ data: null, error: null }); // No existing log
                    c.insert = jest.fn().mockResolvedValue({ error: null });
                    return c;
                }
                return makeChain({ data: null, error: null });
            }),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('should return 401 if unauthorized', async () => {
        const req = new Request('http://localhost/api/cron', {
            headers: { 'Authorization': 'Bearer wrong-key' }
        });
        const res = await GET(req);
        const body = await res.json();
        expect(res.status).toBe(401);
    });

    it('should send reminders for scheduled appointments', async () => {
        const req = new Request('http://localhost/api/cron', {
            headers: { 'Authorization': 'Bearer test-secret' }
        });

        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);

        // Should have called sendWhatsApp with patient data
        expect(sendWhatsApp).toHaveBeenCalledWith(
            '5511999999999',
            expect.objectContaining({
                patient: expect.objectContaining({ full_name: 'John Doe' })
            }),
            'REMINDER_24H'
        );

        // Should log to notification_logs
        expect(mockSupabase.from).toHaveBeenCalledWith('notification_logs');
    });
});
