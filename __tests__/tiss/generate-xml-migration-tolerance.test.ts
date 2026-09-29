/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/services/tiss/tiss-xsd-adapter', () => ({
    getTISSXSDValidator: jest.fn(() => ({
        validateXML: jest.fn().mockResolvedValue({
            valid: true,
            errors: [],
            warnings: [],
            validationMode: 'XSD_PARCIAL',
        }),
    })),
}));

const { createClient } = require('@/lib/supabase/server');

describe('D5: Tolerância de Migration na Geração de XML (generate-xml)', () => {
    const generateXmlRoute = require('@/app/api/tiss/batches/[id]/generate-xml/route');

    const testBatchId = 'b0000000-0000-0000-0000-000000000001';
    const testClinicId = 'c0000000-0000-0000-0000-000000000001';

    const mockAdminUser = {
        id: 'u-admin-1',
        clinic_id: testClinicId,
        role: 'CLINIC_ADMIN',
        full_name: 'Admin Faturamento',
    };

    const mockBatch = {
        id: testBatchId,
        clinic_id: testClinicId,
        batch_number: 'LOTE-2026-001',
        insurance_company_id: 'i0000000-0000-0000-0000-000000000001',
        tiss_version: '04.01.00',
    };

    const mockGuides = [
        {
            id: 'g-1',
            guide_number: 'GUIA-001',
            guide_type: 'CONSULTA',
            execution_date: '2026-09-29',
            patient_name: 'Paciente Teste',
            patient_card_number: '123456789',
            total_value: 150.00,
            procedures: [
                {
                    procedure_code: '10101012',
                    procedure_name: 'Consulta em consultorio',
                    quantity: 1,
                    unit_value: 150.00,
                }
            ],
        }
    ];

    const createRequest = () => {
        return new NextRequest(new URL(`http://localhost:3000/api/tiss/batches/${testBatchId}/generate-xml`), {
            method: 'POST',
            headers: {
                'x-user-id': mockAdminUser.id,
                'x-user-role': mockAdminUser.role,
                'x-clinic-id': testClinicId,
                'content-type': 'application/json',
            },
        });
    };

    it('1. Cenário Normal: Migration já aplicada, persiste hash_algorithm e hash_value', async () => {
        let updateCalls: any[] = [];

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: mockAdminUser.id } },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: mockAdminUser, error: null }),
                    };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: mockBatch, error: null }),
                        update: jest.fn((payload: any) => {
                            updateCalls.push(payload);
                            return {
                                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
                            };
                        }),
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({ data: mockGuides, error: null }),
                    };
                }
                if (table === 'clinics') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: {
                                corporate_name: 'Clinica Teste',
                                cnpj: '12345678000199',
                                cnes_code: '1234567',
                                addons: { tiss_hash_algorithm: 'SHA-256' },
                            },
                            error: null,
                        }),
                    };
                }
                if (table === 'health_insurances') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'i-1', name: 'Bradesco Saude', ans_code: '005711' },
                            error: null,
                        }),
                    };
                }
                if (table === 'tiss_validation_errors') {
                    return {
                        delete: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ error: null }),
                        insert: jest.fn().mockResolvedValue({ error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    insert: jest.fn().mockResolvedValue({ error: null }),
                };
            }),
            storage: {
                from: jest.fn(() => ({
                    upload: jest.fn().mockResolvedValue({ data: { path: 'xml.xml' }, error: null }),
                    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage/xml.xml' } }),
                })),
            },
        };

        createClient.mockResolvedValue(mockClient);

        const res = await generateXmlRoute.POST(createRequest(), {
            params: Promise.resolve({ id: testBatchId }),
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.xml_url).toBeDefined();

        // Verificou que o payload completo com colunas de hash foi gravado
        expect(updateCalls.length).toBe(1);
        expect(updateCalls[0].hash_algorithm).toBe('SHA-256');
        expect(updateCalls[0].hash_value).toBeDefined();
        expect(updateCalls[0].xml_generated_at).toBeDefined();
    });

    it('2. Cenário de Resiliência: Colunas novas ainda não existem no banco (42703 column does not exist). Deve aplicar fallback legado e retornar 200 com XML intacto', async () => {
        let updateCalls: any[] = [];
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: mockAdminUser.id } },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: mockAdminUser, error: null }),
                    };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: mockBatch, error: null }),
                        update: jest.fn((payload: any) => {
                            updateCalls.push(payload);
                            // Se for a tentativa com colunas novas, simular erro 42703
                            if (payload.hash_algorithm !== undefined) {
                                return {
                                    eq: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: {
                                            code: '42703',
                                            message: 'column "hash_algorithm" of relation "tiss_batches" does not exist',
                                        },
                                    }),
                                };
                            }
                            // Fallback legado com sucesso
                            return {
                                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
                            };
                        }),
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({ data: mockGuides, error: null }),
                    };
                }
                if (table === 'clinics') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: {
                                corporate_name: 'Clinica Teste',
                                cnpj: '12345678000199',
                                cnes_code: '1234567',
                                addons: { tiss_hash_algorithm: 'SHA-256' },
                            },
                            error: null,
                        }),
                    };
                }
                if (table === 'health_insurances') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { id: 'i-1', name: 'Bradesco Saude', ans_code: '005711' },
                            error: null,
                        }),
                    };
                }
                if (table === 'tiss_validation_errors') {
                    return {
                        delete: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ error: null }),
                        insert: jest.fn().mockResolvedValue({ error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    insert: jest.fn().mockResolvedValue({ error: null }),
                };
            }),
            storage: {
                from: jest.fn(() => ({
                    upload: jest.fn().mockResolvedValue({ data: { path: 'xml.xml' }, error: null }),
                    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage/xml.xml' } }),
                })),
            },
        };

        createClient.mockResolvedValue(mockClient);

        const res = await generateXmlRoute.POST(createRequest(), {
            params: Promise.resolve({ id: testBatchId }),
        });

        // O endpoint NÃO pode quebrar ou retornar 500
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.xml_url).toBeDefined();

        // Verificou que houve a 1ª tentativa e em seguida a 2ª tentativa (fallback legado)
        expect(updateCalls.length).toBe(2);
        // 1ª: continha hash_algorithm
        expect(updateCalls[0].hash_algorithm).toBe('SHA-256');
        // 2ª: payload legado sem colunas novas
        expect(updateCalls[1].hash_algorithm).toBeUndefined();
        expect(updateCalls[1].hash_value).toBeUndefined();
        expect(updateCalls[1].xml_content).toBeDefined();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[TISS WARNING] Colunas de hash ainda não migradas no banco'),
            expect.anything()
        );

        warnSpy.mockRestore();
    });
});
