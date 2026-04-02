import { z } from 'zod';

// Normalize type value to uppercase to accept case-insensitive input (e.g. 'Receita' -> 'RECEITA')
function normalizeFinancialType(value: string): string {
    if (!value) return value;
    const upper = String(value).trim().toUpperCase();
    // Map common variations
    const typeMap: Record<string, string> = {
        'RECEITA': 'RECEITA',
        'DESPESA': 'DESPESA',
        'INCOME': 'INCOME',
        'EXPENSE': 'EXPENSE',
        'ENTRADA': 'RECEITA',
        'SAIDA': 'DESPESA',
        'SAÍDA': 'DESPESA',
    };
    return typeMap[upper] || upper;
}

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

    // Normalize type before validation (case-insensitive)
    if (row.type) {
        row.type = normalizeFinancialType(row.type);
    }

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
        // Accept negative values (expenses may come as negative) — only reject NaN or zero
        if (isNaN(val) || val === 0) {
            errors.push({ field: 'amount', message: 'Valor não pode ser zero ou inválido', severity: 'CRITICAL' });
        }
    }

    return { isValid: !errors.some(e => e.severity === 'CRITICAL'), errors };
}
