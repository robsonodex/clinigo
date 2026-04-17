// app/api/payroll/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/payroll/report
 * Relatório consolidado de repasses médicos.
 * Query params:
 *   - from: YYYY-MM-DD (obrigatório)
 *   - to:   YYYY-MM-DD (obrigatório)
 *   - doctor_id:    UUID (opcional)
 *   - insurance_id: UUID (opcional — filtra por convênio nos itens)
 *   - status:       string (opcional)
 * Role mínima: CLINIC_ADMIN
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const doctorId = searchParams.get('doctor_id');
        const insuranceId = searchParams.get('insurance_id');
        const statusFilter = searchParams.get('status');

        if (!from || !to) {
            return NextResponse.json(
                { success: false, error: 'Parâmetros "from" e "to" são obrigatórios (YYYY-MM-DD)' },
                { status: 400 }
            );
        }

        // Converter para formato de referência de mês (primeiro dia do mês)
        const fromMonth = new Date(from + 'T12:00:00');
        fromMonth.setDate(1);
        const toMonth = new Date(to + 'T12:00:00');
        toMonth.setDate(1);

        const fromRef = fromMonth.toISOString().split('T')[0];
        const toRef = toMonth.toISOString().split('T')[0];

        // ─── Buscar folhas do período ─────────────────────────────────
        let query = supabase
            .from('medical_payroll')
            .select(`
                *,
                doctor:doctors(
                    id, crm, specialty,
                    user:users(full_name, email)
                )
            `)
            .eq('clinic_id', profile.clinic_id)
            .gte('reference_month', fromRef)
            .lte('reference_month', toRef)
            .order('reference_month', { ascending: false })
            .order('doctor_id', { ascending: true });

        if (doctorId) query = query.eq('doctor_id', doctorId);
        if (statusFilter) query = query.eq('status', statusFilter);

        const { data: payrolls, error } = await query;
        if (error) throw error;

        // ─── Buscar itens de convênio se insurance_id informado ───────
        let payrollIdsWithInsurance: Set<string> | null = null;
        if (insuranceId && payrolls && payrolls.length > 0) {
            const ids = payrolls.map((p: any) => p.id);
            const { data: matchingItems } = await supabase
                .from('payroll_items')
                .select('payroll_id, insurance_company')
                .in('payroll_id', ids)
                .ilike('insurance_company', `%${insuranceId}%`);

            payrollIdsWithInsurance = new Set(matchingItems?.map((i: any) => i.payroll_id) ?? []);
        }

        const filtered = payrollIdsWithInsurance
            ? (payrolls ?? []).filter((p: any) => payrollIdsWithInsurance!.has(p.id))
            : (payrolls ?? []);

        // ─── Sumário por médico ───────────────────────────────────────
        const byDoctor: Record<string, any> = {};
        for (const p of filtered) {
            const doctorKey = p.doctor_id;
            if (!byDoctor[doctorKey]) {
                byDoctor[doctorKey] = {
                    doctor_id: p.doctor_id,
                    doctor_name: p.doctor?.user?.full_name ?? '—',
                    doctor_crm: p.doctor?.crm ?? '—',
                    specialty: p.doctor?.specialty ?? '—',
                    total_appointments: 0,
                    gross_revenue: 0,
                    gross_payroll: 0,
                    inss_retention: 0,
                    irrf_retention: 0,
                    iss_retention: 0,
                    net_payroll: 0,
                    sheets: [] as any[],
                };
            }
            const d = byDoctor[doctorKey];
            d.total_appointments += p.total_appointments ?? 0;
            d.gross_revenue += p.gross_revenue ?? 0;
            d.gross_payroll += p.gross_payroll ?? 0;
            d.inss_retention += p.inss_retention ?? 0;
            d.irrf_retention += p.irrf_retention ?? 0;
            d.iss_retention += p.iss_retention ?? 0;
            d.net_payroll += p.net_payroll ?? 0;
            d.sheets.push({
                id: p.id,
                reference_month: p.reference_month,
                status: p.status,
                net_payroll: p.net_payroll,
                gross_payroll: p.gross_payroll,
                total_appointments: p.total_appointments,
                payment_date: p.payment_date,
                payment_method: p.payment_method,
            });
        }

        const doctorSummaries = Object.values(byDoctor);

        // ─── Totais consolidados da clínica ───────────────────────────
        const totals = doctorSummaries.reduce(
            (acc: any, d: any) => {
                acc.total_appointments += d.total_appointments;
                acc.gross_revenue += d.gross_revenue;
                acc.gross_payroll += d.gross_payroll;
                acc.total_deductions += d.inss_retention + d.irrf_retention + d.iss_retention;
                acc.net_payroll += d.net_payroll;
                return acc;
            },
            {
                total_appointments: 0,
                gross_revenue: 0,
                gross_payroll: 0,
                total_deductions: 0,
                net_payroll: 0,
            }
        );

        // Margem retida pela clínica = produção bruta − repasse bruto
        totals.clinic_retained = totals.gross_revenue - totals.gross_payroll;
        totals.retention_rate = totals.gross_revenue > 0
            ? ((totals.clinic_retained / totals.gross_revenue) * 100).toFixed(1)
            : '0.0';

        // Contagem de status
        const statusCount: Record<string, number> = {};
        for (const p of filtered) {
            statusCount[p.status] = (statusCount[p.status] ?? 0) + 1;
        }

        return NextResponse.json({
            success: true,
            data: {
                period: { from: fromRef, to: toRef },
                filters: { doctor_id: doctorId, status: statusFilter },
                totals,
                status_breakdown: statusCount,
                by_doctor: doctorSummaries,
                total_doctors: doctorSummaries.length,
                total_sheets: filtered.length,
            },
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao gerar relatório:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
