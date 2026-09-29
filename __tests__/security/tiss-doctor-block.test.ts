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

describe('RBAC Matriz Real: Verificacao Estrita de Perfis Permitidos e Proibidos', () => {
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

    // Operações críticas exclusivas de CLINIC_ADMIN/SUPER_ADMIN justificadas por segurança da clínica
    const isStrictAdminOnlyRoute = (relPath: string, method: string) => {
        const p = relPath.replace(/\\/g, '/');
        // 1. Undo de retorno de lote TISS (operação destrutiva crítica)
        if (p.includes('returns/[id]/undo')) return true;
        // 2. Cadastro/contrato de operadora de convênio com CNES na clínica
        if (p.includes('operators') && method === 'POST') return true;
        // 3. Exclusão de tabela de preços de convênios
        if (p.includes('pricing') && method === 'DELETE') return true;
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
            from: jest.fn((_table: string) => createQueryChain()),
            rpc: jest.fn().mockResolvedValue({ data: { success: true, count: 1 }, error: null }),
            storage: {
                from: jest.fn(() => ({
                    upload: jest.fn().mockResolvedValue({ data: { path: 'test.xml' }, error: null }),
                    download: jest.fn().mockResolvedValue({ data: new Blob(['<xml/>']), error: null }),
                    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test/test.xml' } }),
                    createSignedUploadUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://test/upload', token: 'tok' }, error: null }),
                })),
            },
        };

        createClient.mockResolvedValue(mockClient);
        createServiceRoleClient.mockReturnValue(mockClient);
    };

    const createRequest = (url: string, method: string, role: string, userId: string, relPath: string) => {
        const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
        const bodyContent = JSON.stringify({
            name: 'Teste RBAC',
            batchId: 'dummy-id-123',
            guideId: 'dummy-id-123',
            status: 'active',
            convenioId: 'dummy-id-123',
            date: '2026-09-29',
            batch_id: 'a0000000-0000-0000-0000-000000000001',
            file_name: 'retorno.xml',
            file_type: 'XML',
            file_size: 1024,
            patient_id: 'patient-uuid-1',
            doctor_id: 'doctor-uuid-1',
            health_insurance_id: 'insurance-uuid-1',
            clinical_indication: 'Indicacao clinica padrao',
            procedures: [
                { code: '10101012', description: 'Consulta Medica', category: 'CONSULTA', quantity: 1 }
            ],
            notes: 'Observacao de teste',
            justification: 'Justificativa de teste',
            operator_id: 'operator-uuid-1',
        });

        const req = new NextRequest(new URL(url, 'http://localhost:3000'), {
            method,
            headers: {
                'x-user-id': userId,
                'x-user-role': role,
                'x-clinic-id': 'clinic-uuid-1',
                'content-type': 'application/json',
            },
            body: hasBody ? bodyContent : undefined,
        });

        // Suporte a FormData em rotas multipart/excel (ex: import)
        if (relPath.includes('import')) {
            (req as any).formData = async () => {
                const fd = new Map();
                fd.set('file', {
                    name: 'guias.xlsx',
                    arrayBuffer: async () => Buffer.from('mock'),
                });
                return fd;
            };
        }

        return req;
    };

    // Estatisticas de contagem por perfil
    const roleStats: Record<string, { total: number; passed: number }> = {
        DOCTOR: { total: 0, passed: 0 },
        READONLY: { total: 0, passed: 0 },
        RECEPTIONIST: { total: 0, passed: 0 },
        FINANCIAL: { total: 0, passed: 0 },
        CLINIC_ADMIN: { total: 0, passed: 0 },
    };

    afterAll(() => {
        console.log('\n========================================');
        console.log('RBAC MATRIZ REAL - CONTAGEM DE CASOS POR PERFIL:');
        console.log('----------------------------------------');
        for (const [role, stats] of Object.entries(roleStats)) {
            const statusLabel = stats.passed === stats.total ? 'CONFORME' : 'FALHA';
            console.log(`- Perfil ${role.padEnd(12)}: ${stats.passed}/${stats.total} testes executados e aprovados (${statusLabel})`);
        }
        console.log('========================================\n');
    });

    routeFiles.forEach((filePath) => {
        const relPath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
        const routeModule = require(filePath);

        describe(`Rota: ${relPath}`, () => {
            HTTP_METHODS.forEach((method) => {
                if (typeof routeModule[method] === 'function') {
                    const handler = routeModule[method];
                    const adminOnly = isStrictAdminOnlyRoute(relPath, method);

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

                    // 2. READONLY: Sempre Proibido -> 403 estrito
                    it(`[${method}] READONLY -> status 403 Forbidden`, async () => {
                        roleStats.READONLY.total++;
                        setupMockSupabase(PROFILES.READONLY);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'READONLY', PROFILES.READONLY.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        expect(res.status).toBe(403);
                        const data = await res.json();
                        expect(data.code || data.error?.code).toBe('FORBIDDEN');
                        roleStats.READONLY.passed++;
                    });

                    // 3. RECEPTIONIST: Permitido na operacao normal, 403 em operacoes criticas destrutivas
                    it(`[${method}] RECEPTIONIST -> ${adminOnly ? '403 Forbidden (operacao critica)' : 'autorizado (2xx/4xx)'}`, async () => {
                        roleStats.RECEPTIONIST.total++;
                        setupMockSupabase(PROFILES.RECEPTIONIST);
                        const req = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'RECEPTIONIST', PROFILES.RECEPTIONIST.id, relPath);
                        const context = { params: Promise.resolve({ id: 'dummy-id-123' }) };

                        const res = await handler(req, context);
                        if (adminOnly) {
                            expect(res.status).toBe(403);
                        } else {
                            expect(res.status).not.toBe(401);
                            expect(res.status).not.toBe(403);
                            expect(res.status).toBeLessThan(500);
                        }
                        roleStats.RECEPTIONIST.passed++;
                    });

                    // 4. FINANCIAL: Permitido na operacao normal, 403 em operacoes criticas destrutivas
                    it(`[${method}] FINANCIAL -> ${adminOnly ? '403 Forbidden (operacao critica)' : 'autorizado (2xx/4xx)'}`, async () => {
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

                    // 5. CLINIC_ADMIN: Sempre Permitido -> status 2xx ou 4xx esperado, NUNCA 401, 403 nem 5xx
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
