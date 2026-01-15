import { generatePatientTemplate, generateDoctorTemplate, generateInsuranceTemplate, generateFinancialTemplate } from '@/lib/services/import/template-generator';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ type: string }> } // In Next.js 15+ params is async promise ? No, in 13/14 it's object. But user said Next 16.
    // In Next 15/16 params might be a Promise in some contexts, but usually { params: { type: string } } works or Promise.
    // Let's assume params is standard object for now or match user example. 
    // User example: { params }: { params: { type: string } }
    // Wait, Next 15 made params async in layouts/pages, but route handlers?
    // Let's stick to user example first.
) {
    // If params is awaitable, we must await it.
    // Safe way:
    const resolvedParams = await (params as any);
    const type = resolvedParams?.type || (params as any).type;

    let buffer: Buffer;
    let filename: string;

    switch (type) {
        case 'patients':
            buffer = await generatePatientTemplate();
            filename = 'Importacao_Pacientes_CliniGo.xlsx';
            break;
        case 'doctors':
            buffer = await generateDoctorTemplate();
            filename = 'Importacao_Medicos_CliniGo.xlsx';
            break;
        case 'insurances':
            buffer = await generateInsuranceTemplate();
            filename = 'Importacao_Convenios_CliniGo.xlsx';
            break;
        case 'financial':
            buffer = await generateFinancialTemplate();
            filename = 'Importacao_Financeiro_CliniGo.xlsx';
            break;
        default:
            return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`
        }
    });
}
