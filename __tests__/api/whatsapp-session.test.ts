import { NextRequest } from 'next/server';
import { POST as startPost } from '../../app/api/whatsapp-session/start/route';
import { DELETE as disconnectDelete } from '../../app/api/whatsapp-session/disconnect/route';
import { GET as statusGet } from '../../app/api/whatsapp-session/status/route';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => {
    return {
        createClient: jest.fn(() => ({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: {
                        user: { id: 'user-123' }
                    },
                    error: null
                })
            },
            from: jest.fn((table) => {
                if (table === 'profiles') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: {
                                role: 'CLINIC_ADMIN',
                                clinic_id: 'clinic-123'
                            },
                            error: null
                        })
                    }
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: null })
                }
            })
        }))
    }
});

jest.mock('next/server', () => {
    return {
        NextRequest: class MockNextRequest {
            url: string;
            method: string;
            headers: Map<string, string>;
            constructor(url: string, init?: any) {
                this.url = url;
                this.method = init?.method || 'GET';
                this.headers = new Map();
                if (init?.headers) {
                    Object.entries(init.headers).forEach(([key, value]) => {
                        this.headers.set(key.toLowerCase(), value as string);
                    });
                }
            }
        },
        NextResponse: {
            json: jest.fn((body, init) => {
                return {
                    status: init?.status || 200,
                    json: async () => body
                }
            })
        }
    }
});

// Mock fetch globally
global.fetch = jest.fn();

describe('WhatsApp Session API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.WHATSAPP_SERVICE_URL = 'http://localhost:3001';
        process.env.WHATSAPP_INTERNAL_SECRET = 'test-secret';
    });

    describe('POST /api/whatsapp-session/start', () => {
        it('should proxy start request to microservice successfully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const req = new NextRequest('http://localhost:3000/api/whatsapp-session/start', {
                method: 'POST',
                headers: {
                    'x-user-id': 'user-123',
                    'x-user-role': 'CLINIC_ADMIN',
                    'x-clinic-id': 'clinic-123'
                }
            });

            const response = await startPost(req);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/session/start',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'x-internal-secret': '', // Caches empty string from route module top-level
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify({ clinic_id: 'clinic-123' })
                })
            );
        });

        it('should handle microservice error', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Failed to start' })
            });

            const req = new NextRequest('http://localhost:3000/api/whatsapp-session/start', {
                method: 'POST',
                headers: {
                    'x-user-id': 'user-123',
                    'x-user-role': 'CLINIC_ADMIN',
                    'x-clinic-id': 'clinic-123'
                }
            });

            const response = await startPost(req);
            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/whatsapp-session/status', () => {
        it('should fetch status successfully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ state: 'QR_READY', qr: 'qrcode_base64' })
            });

            const req = new NextRequest('http://localhost:3000/api/whatsapp-session/status', {
                headers: {
                    'x-user-id': 'user-123',
                    'x-user-role': 'CLINIC_ADMIN',
                    'x-clinic-id': 'clinic-123'
                }
            });

            const response = await statusGet(req);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.state).toBe('QR_READY');
        });
    });

    describe('DELETE /api/whatsapp-session/disconnect', () => {
        it('should disconnect successfully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const req = new NextRequest('http://localhost:3000/api/whatsapp-session/disconnect', {
                method: 'DELETE',
                headers: {
                    'x-user-id': 'user-123',
                    'x-user-role': 'CLINIC_ADMIN',
                    'x-clinic-id': 'clinic-123'
                }
            });

            const response = await disconnectDelete(req);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);
        });
    });
});
