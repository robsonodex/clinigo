import { parseCurrencyStr } from '../validators/financial-validator';

export async function importFinancial(
    jobId: string,
    rows: any[],
    fieldMapping: Record<string, string>,
    supabase: any,
    clinicId: string
) {
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const row of rows) {
        try {
            const parts = row.date ? row.date.split('/') : [];
            let date = null;
            if (parts.length === 3) date = `${parts[2]}-${parts[1]}-${parts[0]}`;

            const rawType = (row.type || row.Type || '').trim().toUpperCase();
            const type = (rawType === 'RECEITA' || rawType === 'INCOME') ? 'INCOME' : 'EXPENSE';
            const rawStatus = (row.status || row.Status || '').trim().toLowerCase();
            const status = rawStatus === 'pago' ? 'PAID' : 'PENDING';

            const financialData = {
                clinic_id: clinicId,
                due_date: date,
                payment_date: status === 'PAID' ? date : null,
                entry_type: type,
                category: row.category || '',
                amount: Math.abs(parseCurrencyStr(row.amount)),
                description: row.description || '',
                payment_method: row.payment_method || '',
                status: status
            };

            const { data, error } = await supabase.from('financial_entries').insert(financialData).select('id').single();
            if (error) throw error;

            await supabase.from('import_logs').insert({
                import_job_id: jobId,
                row_number: processedCount + 2,
                action: 'imported',
                entity_id: data.id,
                row_data: row
            });
            successCount++;
        } catch (e: any) {
            await supabase.from('import_logs').insert({
                import_job_id: jobId,
                row_number: processedCount + 2,
                action: 'failed',
                error_message: e.message,
                row_data: row
            });
            failedCount++;
        }
        processedCount++;
        if (processedCount % 10 === 0) {
            await supabase.from('import_jobs').update({
                processed_rows: processedCount,
                successful_rows: successCount,
                failed_rows: failedCount
            }).eq('id', jobId);
        }
    }

    await supabase.from('import_jobs').update({
        status: failedCount === 0 ? 'completed' : 'partial',
        processed_rows: processedCount,
        successful_rows: successCount,
        failed_rows: failedCount,
        completed_at: new Date().toISOString()
    }).eq('id', jobId);
}
