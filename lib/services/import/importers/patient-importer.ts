export async function importPatients(
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
            // Mapping for insurance
            let insuranceId = null;
            if (row.insurance_name && fieldMapping[row.insurance_name]) {
                insuranceId = fieldMapping[row.insurance_name];
            } else if (row.insurance_name) {
                // If mapping not found but name exists, maybe try to find by name or ignore?
                // For now, ignore if not mapped or try to find
                const { data: ins } = await supabase.from('health_insurances')
                    .select('id').eq('clinic_id', clinicId).ilike('name', row.insurance_name).single();
                if (ins) insuranceId = ins.id;
            }

            const patientData = {
                clinic_id: clinicId,
                full_name: row.full_name?.trim(),
                cpf: row.cpf ? String(row.cpf).replace(/\D/g, '') : null,
                date_of_birth: row.date_of_birth ? convertToISODate(row.date_of_birth) : null,
                phone: row.phone?.replace(/\D/g, ''),
                email: row.email || null,
                gender: row.gender || null, // Should normalize 'M'/'F' if needed or match DB constraints
                address: {
                    street: row.street || '',
                    number: row.number || '',
                    complement: row.complement || '',
                    neighborhood: row.neighborhood || '',
                    city: row.city || '',
                    state: row.state || '',
                    zip_code: row.cep?.replace(/\D/g, '') || ''
                },
                insurance_company_id: insuranceId,
                insurance_card_number: row.insurance_card || null
            };

            // Check existence
            const { data: existing } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('cpf', patientData.cpf)
                .single();

            let entityId;

            if (existing) {
                const { data, error } = await supabase
                    .from('patients')
                    .update(patientData)
                    .eq('id', existing.id)
                    .select('id')
                    .single();
                if (error) throw error;
                entityId = data.id;
            } else {
                const { data, error } = await supabase
                    .from('patients')
                    .insert(patientData)
                    .select('id')
                    .single();
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
        } catch (error: any) {
            await supabase.from('import_logs').insert({
                import_job_id: jobId,
                row_number: processedCount + 2,
                action: 'failed',
                error_message: error.message,
                row_data: row
            });
            failedCount++;
        }

        processedCount++;

        // Update progress periodically
        if (processedCount % 10 === 0) {
            await supabase.from('import_jobs').update({
                processed_rows: processedCount,
                successful_rows: successCount,
                failed_rows: failedCount
            }).eq('id', jobId);
        }
    }

    // Final update
    await supabase.from('import_jobs').update({
        status: failedCount === 0 ? 'completed' : 'partial',
        processed_rows: processedCount,
        successful_rows: successCount,
        failed_rows: failedCount,
        completed_at: new Date().toISOString()
    }).eq('id', jobId);
}

function convertToISODate(dateStr: string): string | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
