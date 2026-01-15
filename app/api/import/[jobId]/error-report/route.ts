import { createClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const resolvedParams = await (params as any);
    const jobId = resolvedParams?.jobId || (params as any).jobId;

    const supabase = await createClient();

    const { data: job } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    if (!job) {
        return new Response('Job not found', { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Erros');

    sheet.columns = [
        { header: 'Linha', key: 'row', width: 10 },
        { header: 'Campo', key: 'field', width: 20 },
        { header: 'Erro', key: 'error', width: 50 },
        { header: 'Valor Original', key: 'value', width: 30 }
    ];

    // Validation errors is JSONB: [{ row: 2, data: {}, errors: [{field, message}] }]
    if (Array.isArray(job.validation_errors)) {
        job.validation_errors.forEach((err: any) => {
            err.errors.forEach((e: any) => {
                sheet.addRow({
                    row: err.row,
                    field: e.field,
                    error: e.message,
                    value: err.data[e.field] || ''
                });
            });
        });
    }

    const buffer = await (workbook.xlsx.writeBuffer() as Promise<Buffer>); // Cast needed for exceljs types sometimes

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Erros_Importacao_${jobId}.xlsx"`
        }
    });
}
