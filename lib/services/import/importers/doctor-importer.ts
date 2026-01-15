export async function importDoctors(
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
            const doctorData = {
                clinic_id: clinicId,
                full_name: row.full_name,
                crm: row.crm,
                crm_state: row.crm_state,
                specialty: row.specialty,
                bio: row.bio,
                consultation_price: row.consultation_price ? parseFloat(row.consultation_price) : null
            };

            const { data: existing } = await supabase.from('doctors')
                .select('id').eq('clinic_id', clinicId).eq('crm', doctorData.crm).eq('crm_state', doctorData.crm_state).single();

            let entityId;
            if (existing) {
                const { data, error } = await supabase.from('doctors').update(doctorData).eq('id', existing.id).select('id').single();
                if (error) throw error;
                entityId = data.id;
            } else {
                const { data, error } = await supabase.from('doctors').insert(doctorData).select('id').single();
                if (error) throw error;
                entityId = data.id;
            }

            await supabase.from('import_logs').insert({
                import_job_id: jobId,
                row_number: processedCount + 2,
                action: existing ? 'updated' : 'imported',
                entity_id: entityId,
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
