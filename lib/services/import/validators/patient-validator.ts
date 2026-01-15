import { z } from 'zod';

export const PatientRowSchema = z.object({
    full_name: z.string().min(3, 'Nome muito curto').max(255),
    cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}\-?\d{2}$/, 'CPF inválido').or(z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')),
    date_of_birth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data deve ser DD/MM/AAAA'),
    phone: z.string().min(10, 'Telefone inválido'),
    email: z.string().email('Email inválido').optional().or(z.literal('')).or(z.null()),
    gender: z.enum(['M', 'F', 'Outro', '', 'Masculino', 'Feminino']).optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
    insurance_name: z.string().optional(),
    insurance_card: z.string().optional(),
    cep: z.string().optional(),
});

export interface ValidationResult {
    isValid: boolean;
    errors: Array<{
        field: string;
        message: string;
        severity: 'CRITICAL' | 'WARNING';
    }>;
}

export async function validatePatientRow(
    row: any,
    rowNumber: number,
    existingCPFs: Set<string>,
    supabase: any,
    clinicId: string
): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];

    // 1. Schema Validation
    const result = PatientRowSchema.safeParse(row);
    if (!result.success) {
        result.error.issues.forEach(issue => {
            errors.push({
                field: issue.path.join('.'),
                message: issue.message,
                severity: 'CRITICAL'
            });
        });
    }

    // 2. Custom Validations
    if (row.cpf) {
        const cleanCPF = String(row.cpf).replace(/\D/g, '');

        // Check duplication in file
        if (existingCPFs.has(cleanCPF)) {
            errors.push({
                field: 'cpf',
                message: 'CPF duplicado neste arquivo',
                severity: 'CRITICAL'
            });
        } else {
            existingCPFs.add(cleanCPF);
        }

        // Check duplication in DB
        // Optimization: This might be slow row-by-row. Ideally we verify in batch or cache.
        // For MVP, row-by-row is acceptable but we should consider caching existing CPFs if list is huge.
        // Or we just check.
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('cpf', cleanCPF)
            .single();

        if (existingPatient) {
            errors.push({
                field: 'cpf',
                message: 'CPF já cadastrado no sistema (será atualizado)',
                severity: 'WARNING'
            });
        }
    }

    // Date Future check
    if (row.date_of_birth) {
        const parts = row.date_of_birth.split('/');
        if (parts.length === 3) {
            const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (birthDate > new Date()) {
                errors.push({
                    field: 'date_of_birth',
                    message: 'Data de nascimento não pode ser futura',
                    severity: 'CRITICAL'
                });
            }
        }
    }

    return {
        isValid: !errors.some(e => e.severity === 'CRITICAL'),
        errors
    };
}
