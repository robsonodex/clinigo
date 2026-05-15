// lib/services/financial-backfill.ts
/**
 * Serviço de Backfill Financeiro
 * Recalcula repasses médicos retroativamente para meses sem dados.
 * Respeita o financial_cutoff_day da clínica.
 */

import { createClient } from '@/lib/supabase/server';

interface BackfillResult {
    month: string;
    appointmentsFound: number;
    processed: number;
    errors: string[];
}

/**
 * Calcula o período financeiro com base no dia de corte
 */
function calculatePeriod(month: string, cutoffDay: number): { startDate: string; endDate: string } {
    const [year, monthNum] = month.split('-').map(Number);

    if (cutoffDay === 1) {
        const start = new Date(year, monthNum - 1, 1);
        const end = new Date(year, monthNum, 0);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    }

    const start = new Date(year, monthNum - 2, cutoffDay);
    const end = new Date(year, monthNum - 1, cutoffDay - 1);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
    };
}

/**
 * Gera lista de meses entre start e end no formato YYYY-MM
 */
function generateMonthRange(startMonth: string, endMonth: string): string[] {
    const months: string[] = [];
    const [startYear, startM] = startMonth.split('-').map(Number);
    const [endYear, endM] = endMonth.split('-').map(Number);

    let year = startYear;
    let m = startM;

    while (year < endYear || (year === endYear && m <= endM)) {
        months.push(`${year}-${String(m).padStart(2, '0')}`);
        m++;
        if (m > 12) {
            m = 1;
            year++;
        }
    }

    return months;
}

/**
 * Executa backfill de repasses para um range de meses
 * @param clinicId - ID da clínica
 * @param startMonth - Mês inicial (YYYY-MM)
 * @param endMonth - Mês final (YYYY-MM)
 */
export async function backfillPayrollFromAppointments(
    clinicId: string,
    startMonth: string,
    endMonth: string
): Promise<{ success: boolean; results: BackfillResult[]; summary: { totalProcessed: number; totalErrors: number } }> {
    const supabase = await createClient();

    // Buscar cutoff day da clínica
    const { data: clinic } = await supabase
        .from('clinics')
        .select('financial_cutoff_day')
        .eq('id', clinicId)
        .single();

    const cutoffDay = clinic?.financial_cutoff_day || 1;
    const months = generateMonthRange(startMonth, endMonth);
    const results: BackfillResult[] = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const month of months) {
        const { startDate, endDate } = calculatePeriod(month, cutoffDay);
        const result: BackfillResult = {
            month,
            appointmentsFound: 0,
            processed: 0,
            errors: [],
        };

        try {
            // Buscar appointments COMPLETED sem payroll_item associado
            const { data: appointments } = await supabase
                .from('appointments')
                .select('id, doctor_id')
                .eq('clinic_id', clinicId)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', startDate)
                .lte('appointment_date', endDate);

            result.appointmentsFound = appointments?.length || 0;

            if (!appointments || appointments.length === 0) {
                results.push(result);
                continue;
            }

            // Para cada appointment, verificar se já tem payroll e calcular se não tiver
            for (const apt of appointments) {
                try {
                    // Verificar se já existe payroll_item para este appointment
                    const { data: existingPayroll } = await supabase
                        .from('payroll_items')
                        .select('id')
                        .eq('appointment_id', apt.id)
                        .limit(1);

                    if (existingPayroll && existingPayroll.length > 0) {
                        continue; // Já tem payroll, pular
                    }

                    // Calcular repasse via RPC
                    const { data: rpcResult } = await supabase.rpc('calculate_payroll_item', {
                        p_appointment_id: apt.id,
                    });

                    if (rpcResult?.success) {
                        result.processed++;
                        totalProcessed++;
                    } else {
                        const errMsg = `Apt ${apt.id}: ${rpcResult?.error || 'Erro RPC'}`;
                        result.errors.push(errMsg);
                        totalErrors++;
                    }
                } catch (aptErr: any) {
                    result.errors.push(`Apt ${apt.id}: ${aptErr.message}`);
                    totalErrors++;
                }
            }
        } catch (monthErr: any) {
            result.errors.push(`Erro geral: ${monthErr.message}`);
            totalErrors++;
        }

        results.push(result);
    }

    return {
        success: totalErrors === 0,
        results,
        summary: {
            totalProcessed,
            totalErrors,
        },
    };
}
