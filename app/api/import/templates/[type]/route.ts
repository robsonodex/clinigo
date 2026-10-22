import { withAxiom, AxiomRequest } from 'next-axiom'
import { generatePatientTemplate, generateDoctorTemplate, generateInsuranceTemplate, generateFinancialTemplate } from '@/lib/services/import/template-generator';

export const GET = withAxiom(async (
    request: AxiomRequest,
    { params }: { params: Promise<{ type: string }> }
) => {
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
})
