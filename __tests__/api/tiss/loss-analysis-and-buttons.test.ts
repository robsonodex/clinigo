/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => (req: any, ctx: any) => handler(req, ctx),
    AxiomRequest: class {},
}));

jest.mock('@/lib/auth/tiss-role-guard', () => ({
    requireTissAction: jest.fn(async () => ({
        authorized: true,
        session: { clinicId: 'cli-test-1', role: 'CLINIC_ADMIN', userId: 'usr-1' },
    })),
}));

const mockAdminFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(async () => ({
        auth: {
            getUser: jest.fn(async () => ({ data: { user: { id: 'usr-1' } }, error: null })),
        },
    })),
    createServiceRoleClient: jest.fn(() => ({
        from: mockAdminFrom,
    })),
}));

import { GET as lossAnalysisGet } from '@/app/api/tiss/reports/loss-analysis/route';

function makeQueryChain(result: { data?: any; error?: any }) {
    const chain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(result),
        maybeSingle: jest.fn().mockResolvedValue(result),
        then: (resolve: any) => Promise.resolve(result).then(resolve),
    };
    return chain;
}

describe('BI de Perdas TISS e Padrão Global de Botões CliniGo (8px / rounded-md)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /api/tiss/reports/loss-analysis retorna top_glosas, top_glosed_procedures, top_reasons, by_insurance e summary.received_value sem undefined', async () => {
        mockAdminFrom.mockImplementation((table: string) => {
            if (table === 'users') {
                return makeQueryChain({ data: { clinic_id: 'cli-test-1' }, error: null });
            }
            if (table === 'tiss_guides') {
                return makeQueryChain({
                    data: [
                        {
                            id: 'g-1',
                            guide_number: '2026000001',
                            procedure_code: '10101012',
                            procedure_name: 'Consulta em Consultório',
                            total_value: 250,
                            paid_value: 200,
                            glosa_value: 50,
                            status: 'PARTIALLY_GLOSED',
                            execution_date: '2026-11-10',
                            health_insurance_id: 'ins-1',
                            batch: { id: 'b-1', batch_number: 'L001', insurance_company_id: 'ins-1', insurance_company_name: 'Unimed' },
                            health_insurance: { id: 'ins-1', name: 'Unimed', code: '301949' },
                        },
                    ],
                    error: null,
                });
            }
            if (table === 'tiss_glosas') {
                return makeQueryChain({
                    data: [
                        {
                            id: 'gl-1',
                            guide_id: 'g-1',
                            glosa_code: '1701',
                            glosa_description: 'Cobrança fora do prazo',
                            glosa_value: 50,
                            is_irrecoverable: false,
                            can_appeal: true,
                            status: 'OPEN',
                            created_at: '2026-11-11T10:00:00Z',
                        },
                    ],
                    error: null,
                });
            }
            if (table === 'health_insurances') {
                return makeQueryChain({
                    data: [{ id: 'ins-1', name: 'Unimed', code: '301949' }],
                    error: null,
                });
            }
            return makeQueryChain({ data: [], error: null });
        });

        const req: any = {
            url: 'https://clinigo.app/api/tiss/reports/loss-analysis?start_date=2026-11-01&end_date=2026-11-18',
            headers: new Headers(),
            log: { error: jest.fn(), info: jest.fn() },
        };

        const res = await lossAnalysisGet(req, {});
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.summary.billed_value).toBe(250);
        expect(json.data.summary.received_value).toBe(200);
        expect(json.data.summary.glosa_value).toBe(50);
        expect(json.data.summary.glosa_rate).toBe(20);
        expect(json.data.summary.appealable_value).toBe(50);
        expect(Array.isArray(json.data.by_insurance)).toBe(true);
        expect(Array.isArray(json.data.top_glosas)).toBe(true);
        expect(Array.isArray(json.data.top_glosed_procedures)).toBe(true);
        expect(Array.isArray(json.data.top_reasons)).toBe(true);
        expect(json.data.top_glosas[0].procedure).toBe('Consulta em Consultório');
        expect(json.data.top_reasons[0].code).toBe('1701');
    });

    it('Padrão global de arredondamento de botões (8px / rounded-md) deve estar ativo em globals.css e button.tsx', () => {
        const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
        expect(css).toContain('border-radius: 8px !important');

        const btn = fs.readFileSync(path.join(process.cwd(), 'components/ui/button.tsx'), 'utf8');
        expect(btn).toContain('rounded-md');
        expect(btn).not.toContain('rounded-xs');

        const consultasSrc = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/(clinic)/consultas/page.tsx'), 'utf8');
        expect(consultasSrc).not.toContain('Gerar Guias TISS do Período');
        expect(consultasSrc).not.toContain('Gerar Guia TISS');

        const sidebarSrc = fs.readFileSync(path.join(process.cwd(), 'components/layout/sidebar.tsx'), 'utf8');
        expect(sidebarSrc).not.toContain("href: '/dashboard/consultas'");
    });
});

