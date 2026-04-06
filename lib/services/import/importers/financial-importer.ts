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

            const rawType = (row.type || row.Type || row.tipo || row.Tipo || row['Tipo* (RECEITA/DESPESA)'] || row['tipo de lançamento'] || row['natureza'] || '').trim().toUpperCase();
            const type = (rawType === 'RECEITA' || rawType === 'INCOME' || rawType === 'ENTRADA' || rawType === 'VENDAS' || rawType === 'RECEBIMENTO' || rawType === 'CRÉDITO' || rawType === 'CREDITO') ? 'INCOME' : 'EXPENSE';
            const rawStatus = (row.status || row.Status || '').trim().toLowerCase();
            const status = (rawStatus === 'pago' || rawStatus === 'concluído' || rawStatus === 'concluido' || rawStatus === 'paid') ? 'PAID' : 'PENDING';

            let description = '';
            if (fieldMapping && fieldMapping['description'] && row[fieldMapping['description']]) {
                description = String(row[fieldMapping['description']]);
            } else {
                const descKeys = ['description', 'Description', 'descrição', 'Descrição', 'descricao', 'Descricao', 'Descrição*', 'observação', 'Observação', 'historico', 'Histórico', 'Historico', 'histórico'];
                for (const key of descKeys) {
                    if (row[key] !== undefined && row[key] !== null) {
                        description = String(row[key]);
                        break;
                    }
                }
                if (!description) {
                    const keyMatch = Object.keys(row).find(k => k.toLowerCase().includes('descri') || k.toLowerCase().includes('hist'));
                    if (keyMatch) description = String(row[keyMatch]);
                }
            }
            description = description.trim();

            const financialData = {
                clinic_id: clinicId,
                due_date: date,
                payment_date: status === 'PAID' ? date : null,
                entry_type: type,
                category: row.category || row.categoria || row.Categoria || row['Categoria*'] || '',
                amount: Math.abs(parseCurrencyStr(row.amount || row.valor || row.Valor || row['Valor*'])),
                description: description,
                payment_method: row.payment_method || row.metodo_pagamento || row['Método Pagamento'] || '',
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
