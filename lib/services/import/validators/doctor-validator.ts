import { z } from 'zod';

export const DoctorRowSchema = z.object({
    full_name: z.string().min(3).max(255),
    crm: z.string().min(1),
    crm_state: z.string().length(2),
    specialty: z.string().min(1),
    consultation_price: z.string().or(z.number()).optional(),
    bio: z.string().optional()
});

export async function validateDoctorRow(
    row: any,
    rowNumber: number,
    existingCRMs: Set<string>,
    supabase: any,
    clinicId: string
) {
    const errors: any[] = [];

    const result = DoctorRowSchema.safeParse(row);
    if (!result.success) {
        result.error.issues.forEach(issue => errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            severity: 'CRITICAL'
        }));
    }

    if (row.crm && row.crm_state) {
        const uniqueKey = `${row.crm}-${row.crm_state}`;
        if (existingCRMs.has(uniqueKey)) {
            errors.push({ field: 'crm', message: 'CRM+UF duplicado no arquivo', severity: 'CRITICAL' });
        } else {
            existingCRMs.add(uniqueKey);
        }

        const { data } = await supabase.from('doctors')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('crm', row.crm)
            .eq('crm_state', row.crm_state)
            .single();

        if (data) {
            errors.push({ field: 'crm', message: 'Médico já existe', severity: 'WARNING' });
        }
    }

    return { isValid: !errors.some(e => e.severity === 'CRITICAL'), errors };
}
