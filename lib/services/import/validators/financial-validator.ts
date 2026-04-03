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
export function parseCurrencyStr(val: any): number {
    if (val === undefined || val === null || val === '') return NaN;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    str = str.replace(/[^\d.,-]/g, '');
    if (!str) return NaN;

    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    if (lastComma > -1 && lastDot > -1) {
        if (lastComma > lastDot) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (lastComma > -1) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
    
    return parseFloat(str);
}

export const FinancialRowSchema = z.object({
    date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
    type: z.enum(['RECEITA', 'DESPESA', 'INCOME', 'EXPENSE']),
    category: z.string().min(1),
    amount: z.any(),
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

    if (row.amount !== undefined && row.amount !== null) {
        const val = parseCurrencyStr(row.amount);
        if (isNaN(val) || val === 0) {
            errors.push({ field: 'amount', message: 'Valor não pode ser zero ou inválido', severity: 'CRITICAL' });
        }
    } else {
        errors.push({ field: 'amount', message: 'Valor obrigatório', severity: 'CRITICAL' });
    }

    return { isValid: !errors.some(e => e.severity === 'CRITICAL'), errors };
}
