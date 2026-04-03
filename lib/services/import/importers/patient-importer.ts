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

            const cleanCpf = row.cpf ? String(row.cpf).replace(/\D/g, '') : '';
            
            let rawEmail = row.email?.trim() || '';
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (rawEmail && !emailRegex.test(rawEmail)) {
                rawEmail = ''; 
            }
            const finalEmail = rawEmail || `paciente_${cleanCpf || Date.now()}@clinigo.app`;

            const patientData = {
                clinic_id: clinicId,
                full_name: row.full_name?.trim() || '',
                cpf: cleanCpf,
                date_of_birth: row.date_of_birth ? convertToISODate(row.date_of_birth) : null,
                phone: row.phone ? String(row.phone).replace(/\D/g, '') : '',
                email: finalEmail,
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
                health_insurance: (insuranceId || row.insurance_name || row.insurance_card) ? {
                    id: insuranceId,
                    name: row.insurance_name?.trim() || null,
                    card_number: row.insurance_card?.trim() || null
                } : null,
                insurance_holder_name: row.insurance_holder_name?.trim() || null,
                insurance_holder_cpf: row.insurance_holder_cpf ? String(row.insurance_holder_cpf).replace(/\D/g, '') : null
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
                // If it's an update, don't overwrite the email if it wasn't provided in the spreadsheet
                const updatePayload = { ...patientData };
                if (!rawEmail) {
                    delete (updatePayload as any).email;
                }
                
                const { data, error } = await supabase
                    .from('patients')
                    .update(updatePayload)
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
