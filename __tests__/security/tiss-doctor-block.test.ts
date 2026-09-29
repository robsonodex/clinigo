/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as postEligibility } from '@/app/api/insurance/check-eligibility/route';
import { GET as getBatches, POST as postBatch } from '@/app/api/tiss/batches/route';
import { POST as postGenerateXml } from '@/app/api/tiss/batches/[id]/generate-xml/route';
import { POST as postSubmitBatch } from '@/app/api/tiss/batches/[id]/submit/route';
import { POST as postUndoReturn } from '@/app/api/tiss/returns/[id]/undo/route';
import { POST as postParseReturn } from '@/app/api/tiss/returns/[id]/parse/route';
import { POST as postValidateXsd, GET as getValidateXsd } from '@/app/api/tiss/validate-xsd/route';
import { GET as getGlosaReasons } from '@/app/api/tiss/glosas/reasons/route';
import { GET as getGuide, PUT as putGuide, DELETE as deleteGuide } from '@/app/api/tiss/guides/[id]/route';
import { POST as postGuideFromAppt } from '@/app/api/tiss/guides/from-appointment/route';

// Mocks do Supabase
jest.mock('@/lib/supabase/server', () => {
    return {
        createClient: jest.fn(),
        createServiceRoleClient: jest.fn(),
    };
});

const { createClient } = require('@/lib/supabase/server');

describe('Defesa em Profundidade: Bloqueio Estrito ao Perfil DOCTOR nos Handlers Reais', () => {
    const doctorSession = {
        id: 'doctor-user-uuid-1',
        email: 'medico@clinica.com.br',
    };

    const doctorProfile = {
        id: 'doctor-user-uuid-1',
        clinic_id: 'clinic-uuid-1',
        role: 'DOCTOR',
        full_name: 'Dr. Roberto Medico',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: doctorSession },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: doctorProfile, error: null }),
                        maybeSingle: jest.fn().mockResolvedValue({ data: doctorProfile, error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                };
            }),
        };

        createClient.mockResolvedValue(mockClient);
    });

    const createDoctorRequest = (url: string, method = 'POST', body?: any) => {
        return new NextRequest(new URL(url, 'http://localhost:3000'), {
            method,
            headers: {
                'x-user-id': doctorSession.id,
                'x-user-role': 'DOCTOR',
                'x-clinic-id': doctorProfile.clinic_id,
                'content-type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    };

    it('1. Bloqueia DOCTOR em POST /api/insurance/check-eligibility com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/insurance/check-eligibility', 'POST', {
            insurance_company: 'Unimed',
            card_number: '1234567890',
            patient_cpf: '12345678901',
            patient_name: 'Paciente Teste',
        });
        const res = await postEligibility(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error.code).toBe('FORBIDDEN');
    });

    it('2. Bloqueia DOCTOR em GET /api/tiss/batches com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/batches', 'GET');
        const res = await getBatches(req);
        expect(res.status).toBe(403);
    });

    it('3. Bloqueia DOCTOR em POST /api/tiss/batches com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/batches', 'POST', {
            insurance_company_id: '11111111-1111-1111-1111-111111111111',
            reference_month: 9,
            reference_year: 2026,
        });
        const res = await postBatch(req);
        expect(res.status).toBe(403);
    });

    it('4. Bloqueia DOCTOR em POST /api/tiss/batches/[id]/generate-xml com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/batches/b1/generate-xml', 'POST');
        const res = await postGenerateXml(req, { params: Promise.resolve({ id: 'b1' }) });
        expect(res.status).toBe(403);
    });

    it('5. Bloqueia DOCTOR em POST /api/tiss/batches/[id]/submit com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/batches/b1/submit', 'POST', {
            protocol_number: 'PROT-123',
        });
        const res = await postSubmitBatch(req, { params: Promise.resolve({ id: 'b1' }) });
        expect(res.status).toBe(403);
    });

    it('6. Bloqueia DOCTOR em POST /api/tiss/returns/[id]/undo com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/returns/r1/undo', 'POST');
        const res = await postUndoReturn(req, { params: Promise.resolve({ id: 'r1' }) });
        expect(res.status).toBe(403);
    });

    it('7. Bloqueia DOCTOR em POST /api/tiss/returns/[id]/parse com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/returns/r1/parse', 'POST');
        const res = await postParseReturn(req, { params: Promise.resolve({ id: 'r1' }) });
        expect(res.status).toBe(403);
    });

    it('8. Bloqueia DOCTOR em POST e GET /api/tiss/validate-xsd com 403', async () => {
        const reqPost = createDoctorRequest('http://localhost:3000/api/tiss/validate-xsd', 'POST', { batch_id: 'b1' });
        const resPost = await postValidateXsd(reqPost);
        expect(resPost.status).toBe(403);

        const reqGet = createDoctorRequest('http://localhost:3000/api/tiss/validate-xsd', 'GET');
        const resGet = await getValidateXsd(reqGet);
        expect(resGet.status).toBe(403);
    });

    it('9. Bloqueia DOCTOR em GET /api/tiss/glosas/reasons com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/glosas/reasons', 'GET');
        const res = await getGlosaReasons(req);
        expect(res.status).toBe(403);
    });

    it('10. Bloqueia DOCTOR em GET, PUT e DELETE /api/tiss/guides/[id] com 403', async () => {
        const reqGet = createDoctorRequest('http://localhost:3000/api/tiss/guides/g1', 'GET');
        const resGet = await getGuide(reqGet, { params: Promise.resolve({ id: 'g1' }) });
        expect(resGet.status).toBe(403);

        const reqPut = createDoctorRequest('http://localhost:3000/api/tiss/guides/g1', 'PUT', { procedure_code: '10101012' });
        const resPut = await putGuide(reqPut, { params: Promise.resolve({ id: 'g1' }) });
        expect(resPut.status).toBe(403);

        const reqDel = createDoctorRequest('http://localhost:3000/api/tiss/guides/g1', 'DELETE');
        const resDel = await deleteGuide(reqDel, { params: Promise.resolve({ id: 'g1' }) });
        expect(resDel.status).toBe(403);
    });

    it('11. Bloqueia DOCTOR em POST /api/tiss/guides/from-appointment com 403', async () => {
        const req = createDoctorRequest('http://localhost:3000/api/tiss/guides/from-appointment', 'POST', {
            appointment_id: '11111111-1111-1111-1111-111111111111',
        });
        const res = await postGuideFromAppt(req);
        expect(res.status).toBe(403);
    });
});
