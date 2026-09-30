/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

// Mocks globais do Supabase
jest.mock('@/lib/supabase/server', () => {
    return {
        createClient: jest.fn(),
        createServiceRoleClient: jest.fn(),
    };
});

const { createClient, createServiceRoleClient } = require('@/lib/supabase/server');

jest.mock('@/lib/services/tiss/tiss-xml-generator-v2', () => ({
    createTissGenerator: jest.fn(() => ({
        generateBatchXML: jest.fn().mockResolvedValue('<xml>lote</xml>'),
        getVersion: jest.fn().mockReturnValue('4.01.00'),
    })),
}));

jest.mock('@/lib/services/tiss/tiss-xsd-validator', () => ({
    getTISSXSDValidator: jest.fn(() => ({
        validateXML: jest.fn().mockResolvedValue({
            valid: true,
            errors: [],
            warnings: [],
            validationMode: 'XSD_PARCIAL',
        }),
        isSchemaCached: jest.fn().mockReturnValue(false),
    })),
}));

jest.mock('@/lib/services/tiss/tiss-xsd-adapter', () => ({
    getTissXsdAdapter: jest.fn(() => ({
        hasOfficialSchemas: jest.fn().mockReturnValue(false),
        hasXsdSchemas: jest.fn().mockReturnValue(false),
        getAvailableXsdFiles: jest.fn().mockReturnValue([]),
        validate: jest.fn().mockResolvedValue({
            valid: true,
            errors: [],
            schemaVersion: '4.01.00',
            validatedAt: new Date().toISOString(),
            validation_mode: 'ESTRUTURAL',
            disclaimer: 'Modo estrutural de homologação interna',
        }),
    })),
}));


function getRouteFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getRouteFiles(fullPath));
        } else if (file === 'route.ts') {
            results.push(fullPath);
        }
    });
    return results;
}

describe('RBAC Matriz Real: Verificacao Estrita de Menor Privilegio por Acao (B0.1 / Seção 5)', () => {
    const workspaceRoot = process.cwd();
    const tissRoutesDir = path.join(workspaceRoot, 'app/api/tiss');
    const insuranceRoutesDir = path.join(workspaceRoot, 'app/api/insurance');

    const routeFiles = [
        ...getRouteFiles(tissRoutesDir),
        ...getRouteFiles(insuranceRoutesDir),
    ];

    const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    // Perfis do sistema
    const PROFILES = {
        DOCTOR: {
            id: 'doctor-user-uuid-1',
            clinic_id: 'clinic-uuid-1',
            role: 'DOCTOR',
            full_name: 'Dr. Roberto Medico',
        },
        READONLY: {
            id: 'readonly-user-uuid-1',
            clinic_id: 'clinic-uuid-1',
            role: 'READONLY',
            full_name: 'Auditor Apenas Leitura',
        },
        RECEPTIONIST: {
            id: 'receptionist-user-uuid-1',
            clinic_id: 'clinic-uuid-1',
            role: 'RECEPTIONIST',
            full_name: 'Recepcionista Carla',
        },
        FINANCIAL: {
            id: 'financial-user-uuid-1',
            clinic_id: 'clinic-uuid-1',
            role: 'FINANCIAL',
            full_name: 'Financeiro Andre',
        },
        CLINIC_ADMIN: {
            id: 'admin-user-uuid-1',
            clinic_id: 'clinic-uuid-1',
            role: 'CLINIC_ADMIN',
            full_name: 'Administradora Maria',
        },
    };

    /**
     * Matriz de Menor Privilégio da Seção 5:
     * - RECEPTIONIST PODE:
     *   * Ver guias (GET /api/tiss/guides, GET /api/tiss/guides/[id])
     *   * Criar, salvar, validar, duplicar guia (POST /api/tiss/guides, POST /api/tiss/guides/from-appointment, POST /api/tiss/guides/validate, PUT /api/tiss/guides/[id])
     *   * Excluir rascunho próprio (DELETE /api/tiss/guides/[id])
     *   * Ver operadoras e carteirinhas (GET /api/tiss/operators, GET /api/tiss/patient-insurance, POST /api/tiss/patient-insurance, DELETE /api/tiss/patient-insurance)
     *   * Elegibilidade interna e autorização (POST /api/insurance/check-eligibility, POST /api/tiss/eligibility, GET/POST /api/tiss/autorizacao)
     *   * Ver catálogo TUSS (GET /api/tiss/tuss)
     *   * Visualização de lotes/erros/glosas (GET /api/tiss/batches, GET /api/tiss/batches/[id], GET /api/tiss/batches/[id]/errors, GET /api/tiss/glosas, GET /api/tiss/glosas/reasons, GET /api/tiss/glosas/metrics)
     * 
     * - RECEPTIONIST NÃO PODE (DEVE RECEBER 403):
     *   * Criar/fechar/editar/excluir lote (POST/PUT/DELETE /api/tiss/batches, /api/tiss/batches/[id])
     *   * Gerar XML de lote (POST /api/tiss/batches/[id]/generate-xml)
     *   * Assinar ou Enviar lote (POST /api/tiss/batches/[id]/sign, POST /api/tiss/batches/[id]/submit)
     *   * Processamento em massa de lote (POST /api/tiss/batch-process, POST /api/tiss/guides/batch-generate)
     *   * Upload/Parse/Undo de retorno (POST /api/tiss/returns/*)
     *   * Contestar glosa (POST /api/tiss/glosas/[id]/contest)
     *   * Configuração de preços e TUSS (POST/DELETE /api/tiss/pricing, POST /api/tiss/tuss)
     */
    const isReceptionistForbidden = (relPath: string, method: string) => {
        const p = relPath.replace(/\\/g, '/');

        // Lotes: Criar, Editar, Deletar, Assinar, Transmitir
        if (p === 'app/api/tiss/batches/route.ts' && method === 'POST') return true;
        if (p === 'app/api/tiss/batches/[id]/route.ts' && ['PUT', 'DELETE'].includes(method)) return true;
        if (p.includes('batches/[id]/generate-xml')) return true;
        if (p.includes('batches/[id]/submit')) return true;
        if (p.includes('batches/[id]/sign')) return true;
        if (p.includes('batches/[id]/errors') && method === 'PATCH') return true;
        if (p.includes('batch-process')) return true;
        if (p.includes('guides/batch-generate')) return true;

        // Guias: Deletar guia em lote exige perfil financeiro (guia.cancelar)
        if (p.includes('guides/[id]') && method === 'DELETE') return true;

        // Importação em massa: Recepção não pode (C3)
        if (p.includes('import') && method === 'POST') return true;

        // Retornos: Upload, Parse, URL, Notificar, Undo
        if (p.includes('returns/upload')) return true;
        if (p.includes('returns/generate-upload-url')) return true;
        if (p.includes('returns/notify-upload-complete')) return true;
        if (p.includes('returns/[id]/parse')) return true;
        if (p.includes('returns/[id]/undo')) return true;

        // Glosas: Contestar, Análise de risco de glosa
        if (p.includes('glosas/[id]/contest') && ['POST', 'PUT'].includes(method)) return true;
        if (p.includes('analyze-glosa-risk')) return true;

        // Pricing, TUSS e Configurações: Recepção não gerencia tabelas contratuais
        if (p.includes('pricing')) return true;
        if (p.includes('tuss') && method === 'POST') return true;
        if (p.includes('operators') && method === 'POST') return true;
        if (p.includes('settings')) return true;
        if (p.includes('audit')) return true;
        if (p.includes('reports/loss-analysis')) return true;
        if (p.includes('validate-xsd') && method === 'POST') return true;

        return false;
    };

    /**
     * Matriz de Menor Privilégio para READONLY (Seção 5):
     * Leitura e impressão permitida; mutações e configurações sensíveis proibidas (403).
     */
    const isReadOnlyForbidden = (relPath: string, method: string) => {
        const p = relPath.replace(/\\/g, '/');
        if (p.includes('guides/[id]/xml') && method === 'POST') return false; // Impressão de espelho
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return true;
        if (p.includes('batches/[id]/generate-xml')) return true;
        if (p.includes('batches/[id]/sign')) return true;
        if (p.includes('pricing') || p.includes('settings') || p.includes('audit') || p.includes('reports/loss-analysis')) return true;
        return false;
    };

    /**
     * Operações exclusivas de Administrador (CLINIC_ADMIN / SUPER_ADMIN):
     * - Desfazer retorno financeiro (POST /api/tiss/returns/[id]/undo)
     * - Configuração/cadastro de operadora no CNES (POST /api/tiss/operators)
     * - Exclusão de regra de preço (DELETE /api/tiss/pricing)
     * - Importação de catálogo TUSS (POST /api/tiss/tuss)
     * - Ativação/configuração de feature flag (POST /api/tiss/settings/*)
     */
    const isAdminOnlyRoute = (relPath: string, method: string) => {
        const p = relPath.replace(/\\/g, '/');
        if (p.includes('returns/[id]/undo')) return true;
        if (p.includes('operators') && method === 'POST') return true;
        // C3: escrita em pricing e tuss restrita a ADMIN (FINANCIAL só leitura)
        if (p.includes('pricing') && ['POST', 'DELETE'].includes(method)) return true;
        if (p.includes('tuss') && method === 'POST') return true;
        if (p.includes('settings') && method === 'POST') return true;
        return false;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const setupMockSupabase = (profile: { id: string; clinic_id: string; role: string; full_name: string }) => {
        const dummyRecord = {
            id: 'dummy-id-123',
            clinic_id: profile.clinic_id,
            role: profile.role,
            full_name: profile.full_name,
            status: 'active',
            code: '001',
            name: 'Convenio Teste',
            batch_id: 'dummy-id-123',
            hash_algorithm: 'SHA-256',
            hash_value: 'abc123',
            patient_id: 'patient-uuid-1',
            doctor_id: 'doctor-uuid-1',
            health_insurance_id: 'insurance-uuid-1',
            clinical_indication: 'Indicacao clinica',
            total_glosas: 10,
            total_recovered: 5000,
            pending_contestations: 2,
            recovery_rate: 50,
            clinics: {
                id: profile.clinic_id,
                plan_type: 'ENTERPRISE',
                is_active: true,
                approval_status: 'active',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const createQueryChain = () => {
            const chain: any = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                neq: jest.fn().mockReturnThis(),
                gt: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lt: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                is: jest.fn().mockReturnThis(),
                not: jest.fn().mockReturnThis(),
                or: jest.fn().mockReturnThis(),
                ilike: jest.fn().mockReturnThis(),
                contains: jest.fn().mockReturnThis(),
                overlaps: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: dummyRecord, error: null }),
                maybeSingle: jest.fn().mockResolvedValue({ data: dummyRecord, error: null }),
                insert: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
                delete: jest.fn().mockReturnThis(),
                upsert: jest.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ data: [dummyRecord], error: null }),
            };
            return chain;
        };

        const mockClient = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: profile.id, email: 'teste@clinigo.com' } },
                    error: null,
                }),
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { user: { id: profile.id, email: 'teste@clinigo.com' } } },
                    error: null,
                }),
            },
            from: jest.fn(() => createQueryChain()),
            storage: {
                from: jest.fn(() => ({
                    download: jest.fn().mockResolvedValue({
                        data: { text: async () => 'numero_guia;status;valor_apresentado;valor_pago;valor_glosado\nG123;APPROVED;150;150;0' },
                        error: null,
                    }),
                    upload: jest.fn().mockResolvedValue({ data: { path: 'dummy-path' }, error: null }),
                    createSignedUploadUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'http://signed-url' }, error: null }),
                    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.clinigo.com/tiss/xml.xml' } }),
                    list: jest.fn().mockResolvedValue({ data: [{ name: 'dummy-file' }], error: null }),
                })),
            },
            rpc: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
        };

        (createClient as jest.Mock).mockResolvedValue(mockClient);
        (createServiceRoleClient as jest.Mock).mockReturnValue(mockClient);
        return mockClient;
    };

    const createRequest = (url: string, method: string, role: string, userId: string, relPath: string) => {
        let body: any = null;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (relPath.includes('batches/[id]/submit')) {
                body = JSON.stringify({ protocol_number: 'PROT-123' });
            } else if (relPath.includes('batches/[id]/generate-xml')) {
                body = JSON.stringify({});
            } else if (relPath.includes('batches') && method === 'POST') {
                body = JSON.stringify({
                    insurance_company_id: '11111111-1111-1111-1111-111111111111',
                    reference_month: 9,
                    reference_year: 2026,
                });
            } else if (relPath.includes('returns/generate-upload-url')) {
                body = JSON.stringify({
                    batch_id: '11111111-1111-1111-1111-111111111111',
                    file_name: 'retorno.xml',
                    file_type: 'XML',
                    file_size: 1024,
                });
            } else if (relPath.includes('returns/upload')) {
                body = JSON.stringify({
                    batch_id: '11111111-1111-1111-1111-111111111111',
                    file_name: 'retorno.xml',
                    file_type: 'XML',
                    file_content: Buffer.from('<xml></xml>').toString('base64'),
                });
            } else if (relPath.includes('glosas/[id]/contest')) {
                body = JSON.stringify({ contest_reason: 'Justificativa clinica com mais de 10 caracteres' });
            } else if (relPath.includes('pricing') && method === 'POST') {
                body = JSON.stringify({
                    health_insurance_id: '11111111-1111-1111-1111-111111111111',
                    tuss_code: '10101012',
                    procedure_name: 'Consulta Medica',
                    price: 150.0,
                });
            } else if (relPath.includes('tuss') && method === 'POST') {
                body = JSON.stringify({
                    code: '10101012',
                    description: 'Consulta Medica Geral',
                    category: 'CONSULTA',
                });
            } else if (relPath.includes('insurance/check-eligibility')) {
                body = JSON.stringify({
                    patient_id: '11111111-1111-1111-1111-111111111111',
                    health_insurance_id: '22222222-2222-2222-2222-222222222222',
                    card_number: '1234567890',
                });
            } else if (relPath.includes('settings/premium')) {
                body = JSON.stringify({ enabled: true });
            } else {
                body = JSON.stringify({
                    patient_id: '11111111-1111-1111-1111-111111111111',
                    patient_insurance_id: '22222222-2222-2222-2222-222222222222',
                    guide_type: 'CONSULTA',
                    start_date: '2026-09-01',
                    end_date: '2026-09-29',
                });
            }
        }

        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'x-user-role': role,
            'x-user-id': userId,
            'x-clinic-id': 'clinic-uuid-1',
        };

        const init: any = { method, headers };
        if (body) init.body = body;

        const req = new NextRequest(new URL(url, 'http://localhost:3000'), init);

        if (relPath.includes('import')) {
            const mockFile = {
                name: 'teste.csv',
                type: 'text/csv',
                arrayBuffer: async () => Buffer.from('numero_guia,paciente_nome\nG1,Paciente Teste'),
            };
            const mockFormData = {
                get: (key: string) => (key === 'file' ? mockFile : null),
            };
            (req as any).formData = jest.fn().mockResolvedValue(mockFormData);
        }

        return req;
    };

    const roleStats: Record<string, { total: number; passed: number }> = {
        DOCTOR: { total: 0, passed: 0 },
        READONLY: { total: 0, passed: 0 },
        RECEPTIONIST: { total: 0, passed: 0 },
        FINANCIAL: { total: 0, passed: 0 },
        CLINIC_ADMIN: { total: 0, passed: 0 },
    };

    afterAll(() => {
        console.log('\n=== RESUMO DE AUDITORIA RBAC MULTI-PERFIL (MENOR PRIVILÉGIO) ===');
        for (const [r, stat] of Object.entries(roleStats)) {
            console.log(`Perfil: ${r.padEnd(14)} | Total de Testes: ${String(stat.total).padEnd(4)} | Aprovados: ${stat.passed}`);
        }
        console.log('==================================================================\n');
    });

    routeFiles.forEach((filePath) => {
        const relPath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
        const routeModule = require(filePath);

        describe(`Rota: ${relPath}`, () => {
            HTTP_METHODS.forEach((method) => {
                if (typeof routeModule[method] === 'function') {
                    const handler = routeModule[method];
                    const recForbidden = isReceptionistForbidden(relPath, method);
                    const roForbidden = isReadOnlyForbidden(relPath, method);
                    const adminOnly = isAdminOnlyRoute(relPath, method);

                    // 1. DOCTOR: Sempre Proibido -> 403 estrito
                    it(`[${method}] DOCTOR -> status 403 Forbidden`, async () => {
                        roleStats.DOCTOR.total++;
                        setupMockSupabase(PROFILES.DOCTOR);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'DOCTOR', PROFILES.DOCTOR.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        expect(res.status).toBe(403);
                        const data = await res.json();
                        expect(data.code || data.error?.code).toBe('FORBIDDEN');
                        roleStats.DOCTOR.passed++;
                    });

                    // 2. READONLY: Leitura e impressao apenas; mutações e configurações sensíveis -> 403
                    it(`[${method}] READONLY -> ${roForbidden ? '403 Forbidden' : 'autorizado (2xx/4xx)'}`, async () => {
                        roleStats.READONLY.total++;
                        setupMockSupabase(PROFILES.READONLY);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'READONLY', PROFILES.READONLY.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        if (roForbidden) {
                            expect(res.status).toBe(403);
                            const data = await res.json();
                            expect(data.code || data.error?.code).toBe('FORBIDDEN');
                        } else {
                            expect(res.status).not.toBe(401);
                            expect(res.status).not.toBe(403);
                            expect(res.status).toBeLessThan(500);
                        }
                        roleStats.READONLY.passed++;
                    });

                    // 3. RECEPTIONIST: Menor Privilégio estrito (403 em lotes/xml/retorno/recurso/pricing/tuss)
                    it(`[${method}] RECEPTIONIST -> ${recForbidden ? '403 Forbidden (fora do escopo da recepção)' : 'autorizado (2xx/4xx)'}`, async () => {
                        roleStats.RECEPTIONIST.total++;
                        setupMockSupabase(PROFILES.RECEPTIONIST);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'RECEPTIONIST', PROFILES.RECEPTIONIST.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        if (recForbidden) {
                            expect(res.status).toBe(403);
                        } else {
                            expect(res.status).not.toBe(401);
                            expect(res.status).not.toBe(403);
                            expect(res.status).toBeLessThan(500);
                        }
                        roleStats.RECEPTIONIST.passed++;
                    });

                    // 4. FINANCIAL: Acesso ao faturamento e 403 em rotas críticas de admin
                    it(`[${method}] FINANCIAL -> ${adminOnly ? '403 Forbidden (operacao administrativa restrita)' : 'autorizado (2xx/4xx)'}`, async () => {
                        roleStats.FINANCIAL.total++;
                        setupMockSupabase(PROFILES.FINANCIAL);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'FINANCIAL', PROFILES.FINANCIAL.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        if (adminOnly) {
                            expect(res.status).toBe(403);
                        } else {
                            expect(res.status).not.toBe(401);
                            expect(res.status).not.toBe(403);
                            expect(res.status).toBeLessThan(500);
                        }
                        roleStats.FINANCIAL.passed++;
                    });

                    // 5. CLINIC_ADMIN: Sempre Permitido
                    it(`[${method}] CLINIC_ADMIN -> autorizado (status 2xx/4xx, nao 401/403/5xx)`, async () => {
                        roleStats.CLINIC_ADMIN.total++;
                        setupMockSupabase(PROFILES.CLINIC_ADMIN);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'CLINIC_ADMIN', PROFILES.CLINIC_ADMIN.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        expect(res.status).not.toBe(401);
                        expect(res.status).not.toBe(403);
                        expect(res.status).toBeLessThan(500);
                        roleStats.CLINIC_ADMIN.passed++;
                    });
                }
            });
        });
    });
});
