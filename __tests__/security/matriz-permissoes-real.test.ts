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
        }),
    })),
}));

jest.mock('@/lib/services/tiss/autorizacao-service', () => ({
    AutorizacaoService: jest.fn().mockImplementation(() => ({
        sendToOperator: jest.fn().mockResolvedValue({ id: 'dummy-id-123', status: 'SENT' }),
    })),
}));

interface RouteExecutionResult {
    route: string;
    method: string;
    doctorStatus: number;
    readonlyStatus: number;
    receptionistStatus: number;
    financialStatus: number;
    adminStatus: number;
    divergences: string[];
}

describe('B2.0 - Matriz Real de Permissoes RBAC por Execucao Direta de Handlers', () => {
    const workspaceRoot = process.cwd();
    const tissRoutesDir = path.join(workspaceRoot, 'app/api/tiss');
    const insuranceRoutesDir = path.join(workspaceRoot, 'app/api/insurance');

    const getRouteFiles = (dir: string): string[] => {
        let results: string[] = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getRouteFiles(fullPath));
            } else if (file === 'route.ts' || file === 'route.js') {
                results.push(fullPath);
            }
        });
        return results;
    };

    const routeFiles = [
        ...getRouteFiles(tissRoutesDir),
        ...getRouteFiles(insuranceRoutesDir),
    ];

    const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

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
     * Matriz de Menor Privilégio escrita a mão estritamente conforme Seção 5 do Prompt B.
     * Retorna se a role DEVE receber 403 (true) ou se tem acesso autorizado (false).
     */
    const expectedForbidden = (relPath: string, method: string, role: string): boolean => {
        const p = relPath.replace(/\\/g, '/');

        // DOCTOR: 100% proibido em todas as rotas TISS
        if (role === 'DOCTOR') return true;

        // READONLY: Proibido em todas as mutações/escrita (403 estrito) e configurações sensíveis
        if (role === 'READONLY') {
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return true;
            // Rotas de leitura restritas a Financeiro e Admin
            if (p.includes('batches/[id]/generate-xml')) return true; // lote.baixar_xml
            if (p.includes('batches/[id]/sign')) return true; // lote.assinar
            if ((p.includes('pricing') && !p.includes('pricing/lookup')) || p.includes('settings') || p.includes('audit') || p.includes('reports/loss-analysis')) return true;
            return false;
        }

        // CLINIC_ADMIN: Pleno acesso a todas as rotas, EXCETO config.premium.editar (exclusivo SUPER_ADMIN)
        if (role === 'CLINIC_ADMIN') {
            if (p.includes('settings/premium') && method === 'POST') return true;
            return false;
        }

        // FINANCIAL: Acesso ao faturamento, bloqueado apenas em ações exclusivas de admin
        if (role === 'FINANCIAL') {
            if (p.includes('returns/[id]/undo')) return true; // Desfazer retorno é exclusivo ADMIN
            if (p.includes('operators') && method === 'POST') return true; // Adicionar operadora é exclusivo ADMIN
            if (p.includes('pricing') && ['POST', 'DELETE'].includes(method)) return true; // Configurar preço é ADMIN
            if (p.includes('tuss') && method === 'POST') return true; // Importar TUSS é ADMIN
            if (p.includes('settings') && method === 'POST') return true; // Configurações gerais é ADMIN
            return false;
        }

        // RECEPTIONIST: Menor Privilégio estrito conforme Seção 5
        if (role === 'RECEPTIONIST') {
            // Lotes: Criar, Editar, Deletar, Assinar, Transmitir, Gerar XML, Baixar XML, Processar Lote
            if (p.includes('batches') && ['POST', 'PUT', 'DELETE'].includes(method)) return true;
            if (p.includes('batches/[id]/generate-xml')) return true;
            if (p.includes('batches/[id]/submit')) return true;
            if (p.includes('batches/[id]/sign')) return true;
            if (p.includes('batches/[id]/errors') && method === 'PATCH') return true;
            if (p.includes('batch-process')) return true;
            if (p.includes('guides/batch-generate')) return true;
            if (p.includes('guides/[id]') && method === 'DELETE') return true; // DELETE de guia validada ou em lote exige financeiro
            if (p.includes('import') && method === 'POST') return true;

            // Retornos: Upload, Parse, URL, Notificar, Desfazer
            if (p.includes('returns/upload')) return true;
            if (p.includes('returns/generate-upload-url')) return true;
            if (p.includes('returns/notify-upload-complete')) return true;
            if (p.includes('returns/[id]/parse')) return true;
            if (p.includes('returns/[id]/undo')) return true;

            // Glosas: Contestar (POST/PUT), Análise de risco de glosa
            if (p.includes('glosas/[id]/contest') && ['POST', 'PUT'].includes(method)) return true;
            if (p.includes('analyze-glosa-risk')) return true;

            // Configurações e Relatórios Financeiros
            if (p.includes('pricing') && !p.includes('pricing/lookup')) return true;
            if (p.includes('tuss') && method === 'POST') return true;
            if (p.includes('operators') && method === 'POST') return true;
            if (p.includes('settings/premium') && method === 'GET') {
                // RECEPTIONIST tem permissão de leitura para verificar se faturamento premium está ativo na sua clínica
            } else if (p.includes('settings')) {
                return true;
            }
            if (p.includes('audit')) return true;
            if (p.includes('reports/loss-analysis')) return true;
            if (p.includes('validate-xsd') && method === 'POST') return true;

            return false;
        }

        return false;
    };

    const setupMockSupabase = (profile: { id: string; clinic_id: string; role: string; full_name: string }) => {
        const dummyRecord = {
            id: 'dummy-id-123',
            clinic_id: profile.clinic_id,
            role: profile.role,
            full_name: profile.full_name,
            status: 'PENDING',
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
            } else if (relPath.includes('returns/notify-upload-complete')) {
                body = JSON.stringify({
                    return_id: '11111111-1111-1111-1111-111111111111',
                    storage_path: 'tiss/retorno.xml',
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
            } else if (relPath.includes('operators') && method === 'POST') {
                body = JSON.stringify({
                    operator_id: '11111111-1111-1111-1111-111111111111',
                    cnes_code: '1234567',
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

    const executionResults: RouteExecutionResult[] = [];

    afterAll(() => {
        // Grava matriz REAL de status em docs/evidencias/matriz-permissoes-real.md
        const evidenciasDir = path.join(workspaceRoot, 'docs/evidencias');
        if (!fs.existsSync(evidenciasDir)) {
            fs.mkdirSync(evidenciasDir, { recursive: true });
        }

        let totalTests = 0;
        let totalDivergences = 0;
        const allDivergences: string[] = [];

        let mdContent = `# Matriz Real de Permissoes RBAC - Execucao Direta de Handlers (B2.0)
**Data de Geracao:** ${new Date().toISOString()}  
**Metodologia:** Execucao real de cada handler exportado com sessao simulada para os 5 perfis de usuario (DOCTOR, READONLY, RECEPTIONIST, FINANCIAL, CLINIC_ADMIN).  
**Fonte da Verdade:** Retorno HTTP real da execucao do handler (2xx/4xx vs 403 Forbidden).

---

## 1. Tabela de Execucao Real por Rota e Metodo

| # | Rota | Metodo | DOCTOR | READONLY | RECEPTIONIST | FINANCIAL | CLINIC_ADMIN | Status Real | Divergencias |
|---|---|---|---|---|---|---|---|---|---|
`;

        executionResults.forEach((r, idx) => {
            totalTests += 5;
            const hasDiv = r.divergences.length > 0;
            if (hasDiv) {
                totalDivergences += r.divergences.length;
                allDivergences.push(...r.divergences);
            }

            const docFmt = r.doctorStatus === 403 ? '403 (OK)' : `${r.doctorStatus} (FALHA)`;
            const roFmt = r.readonlyStatus === 403 ? '403' : `${r.readonlyStatus}`;
            const recFmt = r.receptionistStatus === 403 ? '403' : `${r.receptionistStatus}`;
            const finFmt = r.financialStatus === 403 ? '403' : `${r.financialStatus}`;
            const admFmt = r.adminStatus === 403 ? '403 (FALHA)' : `${r.adminStatus}`;

            const statusSummary = hasDiv ? 'DIVERGENTE' : 'CONFORME';
            const divText = hasDiv ? r.divergences.join('; ') : 'Nenhuma';

            mdContent += `| ${idx + 1} | \`${r.route}\` | \`${r.method}\` | ${docFmt} | ${roFmt} | ${recFmt} | ${finFmt} | ${admFmt} | **${statusSummary}** | ${divText} |\n`;
        });

        mdContent += `\n---

## 2. Resumo Quantitativo de Execucao

- **Total de Rotas Auditadas:** ${new Set(executionResults.map(x => x.route)).size}
- **Total de Metodos HTTP Exportados:** ${executionResults.length}
- **Total de Execucoes Reais:** ${totalTests} (5 perfis por metodo)
- **Total de Divergencias Encontradas:** ${totalDivergences}

## 3. Lista Detalhada de Divergencias (Secao 5 vs Real)

`;

        if (allDivergences.length === 0) {
            mdContent += `> Nenhuma divergencia detectada. 100% dos handlers executaram em estrita conformidade com a Secao 5 do Prompt B.\n`;
        } else {
            mdContent += `| # | Rota | Metodo | Perfil | Esperado | Real | Causa Raiz |\n`;
            mdContent += `|---|---|---|---|---|---|---|\n`;
            allDivergences.forEach((div, i) => {
                mdContent += `| ${i + 1} | ${div} |\n`;
            });
        }

        fs.writeFileSync(path.join(evidenciasDir, 'matriz-permissoes-real.md'), mdContent, 'utf8');
        console.log(`\n[B2.0] Matriz real gravada com sucesso em docs/evidencias/matriz-permissoes-real.md (${executionResults.length} metodos, ${totalDivergences} divergencias).`);
    });

    routeFiles.forEach((filePath) => {
        const relPath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
        const routeModule = require(filePath);

        describe(`Rota Real: ${relPath}`, () => {
            HTTP_METHODS.forEach((method) => {
                if (typeof routeModule[method] === 'function') {
                    const handler = routeModule[method];

                    it(`[${method}] Execucao Real Multi-Perfil`, async () => {
                        const divergences: string[] = [];

                        // 1. DOCTOR
                        setupMockSupabase(PROFILES.DOCTOR);
                        const reqDoc = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'DOCTOR', PROFILES.DOCTOR.id, relPath);
                        const resDoc = await handler(reqDoc, { params: Promise.resolve({ id: 'dummy-id-123' }) });
                        const docStatus = resDoc.status;
                        if (docStatus !== 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | DOCTOR | 403 | ${docStatus} | Handler nao bloqueou DOCTOR`);
                        }

                        // 2. READONLY
                        setupMockSupabase(PROFILES.READONLY);
                        const reqRo = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'READONLY', PROFILES.READONLY.id, relPath);
                        const resRo = await handler(reqRo, { params: Promise.resolve({ id: 'dummy-id-123' }) });
                        const roStatus = resRo.status;
                        const roExp403 = expectedForbidden(relPath, method, 'READONLY');
                        if (roExp403 && roStatus !== 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | READONLY | 403 | ${roStatus} | Handler permitiu escrita a READONLY`);
                        } else if (!roExp403 && roStatus === 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | READONLY | 200/OK | 403 | Handler bloqueou leitura de READONLY`);
                        }

                        // 3. RECEPTIONIST
                        setupMockSupabase(PROFILES.RECEPTIONIST);
                        const reqRec = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'RECEPTIONIST', PROFILES.RECEPTIONIST.id, relPath);
                        const resRec = await handler(reqRec, { params: Promise.resolve({ id: 'dummy-id-123' }) });
                        const recStatus = resRec.status;
                        const recExp403 = expectedForbidden(relPath, method, 'RECEPTIONIST');
                        if (recExp403 && recStatus !== 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | RECEPTIONIST | 403 | ${recStatus} | Guarda administrativa afrouxada permitiu RECEPTIONIST`);
                        } else if (!recExp403 && recStatus === 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | RECEPTIONIST | 2xx/4xx | 403 | Handler bloqueou acao autorizada de RECEPTIONIST`);
                        }

                        // 4. FINANCIAL
                        setupMockSupabase(PROFILES.FINANCIAL);
                        const reqFin = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'FINANCIAL', PROFILES.FINANCIAL.id, relPath);
                        const resFin = await handler(reqFin, { params: Promise.resolve({ id: 'dummy-id-123' }) });
                        const finStatus = resFin.status;
                        const finExp403 = expectedForbidden(relPath, method, 'FINANCIAL');
                        if (finExp403 && finStatus !== 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | FINANCIAL | 403 | ${finStatus} | Acao restrita de admin permitida a FINANCIAL`);
                        } else if (!finExp403 && finStatus === 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | FINANCIAL | 2xx/4xx | 403 | Handler bloqueou faturamento a FINANCIAL`);
                        }

                        // 5. CLINIC_ADMIN
                        setupMockSupabase(PROFILES.CLINIC_ADMIN);
                        const reqAdm = createRequest(`http://localhost:3000/${relPath.replace('/route.ts', '')}`, method, 'CLINIC_ADMIN', PROFILES.CLINIC_ADMIN.id, relPath);
                        const resAdm = await handler(reqAdm, { params: Promise.resolve({ id: 'dummy-id-123' }) });
                        const admStatus = resAdm.status;
                        if (admStatus === 401 || admStatus === 403) {
                            divergences.push(`\`${relPath}\` | \`${method}\` | CLINIC_ADMIN | 2xx/4xx | ${admStatus} | Handler bloqueou CLINIC_ADMIN`);
                        }

                        executionResults.push({
                            route: relPath,
                            method,
                            doctorStatus: docStatus,
                            readonlyStatus: roStatus,
                            receptionistStatus: recStatus,
                            financialStatus: finStatus,
                            adminStatus: admStatus,
                            divergences,
                        });

                        // Note: we record divergences to document before/after
                    });
                }
            });
        });
    });
});
