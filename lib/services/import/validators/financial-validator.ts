import { z } from 'zod';

export const FinancialRowSchema = z.object({
    date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
    type: z.enum(['RECEITA', 'DESPESA', 'INCOME', 'EXPENSE']),
    category: z.string().min(1),
    amount: z.string().or(z.number()),
    description: z.string().optional(),
    payment_method: z.string().optional(),
    status: z.string().optional()
});

export async function validateFinancialRow(
    row: any
) {
    const errors: any[] = [];
    const result = FinancialRowSchema.safeParse(row);

    if (!result.success) {
        result.error.issues.forEach(issue => errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            severity: 'CRITICAL'
        }));
    }

    if (row.amount) {
        const val = parseFloat(String(row.amount).replace(',', '.'));
        if (isNaN(val) || val <= 0) {
            errors.push({ field: 'amount', message: 'Valor deve ser positivo', severity: 'CRITICAL' });
        }
    }

    return { isValid: !errors.some(e => e.severity === 'CRITICAL'), errors };
}
