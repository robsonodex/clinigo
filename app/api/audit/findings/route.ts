// app/api/audit/findings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/audit/findings - Lista inconsistências
 * POST /api/audit/findings - Executa auditoria automática
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
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'OPEN';
        const severity = searchParams.get('severity');

        let query = supabase
            .from('audit_findings')
            .select('*')
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (status) {
            query = query.eq('status', status);
        }

        if (severity) {
            query = query.eq('severity', severity);
        }

        const { data: findings, error } = await query;

        if (error) throw error;

        // Calcular resumo
        const summary = {
            total: findings?.length || 0,
            critical: findings?.filter(f => f.severity === 'CRITICAL').length || 0,
            high: findings?.filter(f => f.severity === 'HIGH').length || 0,
            medium: findings?.filter(f => f.severity === 'MEDIUM').length || 0,
            low: findings?.filter(f => f.severity === 'LOW').length || 0,
            total_value_at_risk: findings
                ?.filter(f => f.status === 'OPEN')
                .reduce((sum, f) => sum + Math.abs(f.difference_value || 0), 0) || 0,
        };

        return NextResponse.json({ success: true, data: findings, summary });

    } catch (error: any) {
        console.error('[Audit] Erro ao listar findings:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST - Executar auditoria automática
 */
export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { days_back = 7 } = body;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days_back);

        // 1. Buscar consultas COMPLETED sem lançamento financeiro
        const { data: appointments } = await supabase
            .from('appointments')
            .select('id, appointment_date, patient_id')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', startDate.toISOString().split('T')[0]);

        let missingPayments = 0;

        for (const apt of appointments || []) {
            const { data: entry } = await supabase
                .from('financial_entries')
                .select('id')
                .eq('appointment_id', apt.id)
                .eq('entry_type', 'INCOME')
                .single();

            if (!entry) {
                // Criar finding
                await supabase.from('audit_findings').insert({
                    clinic_id: profile.clinic_id,
                    finding_type: 'MISSING_PAYMENT',
                    severity: 'HIGH',
                    entity_type: 'appointment',
                    entity_id: apt.id,
                    description: `Consulta concluída em ${apt.appointment_date} sem lançamento financeiro`,
                    status: 'OPEN',
                });
                missingPayments++;
            }
        }

        // 2. Buscar lançamentos órfãos (sem appointment_id)
        const { data: orphanEntries } = await supabase
            .from('financial_entries')
            .select('id, date, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'INCOME')
            .is('appointment_id', null)
            .gte('date', startDate.toISOString().split('T')[0]);

        for (const entry of orphanEntries || []) {
            await supabase.from('audit_findings').insert({
                clinic_id: profile.clinic_id,
                finding_type: 'ORPHAN_PAYMENT',
                severity: 'MEDIUM',
                entity_type: 'financial_entry',
                entity_id: entry.id,
                description: `Lançamento de R$ ${entry.amount} sem consulta vinculada`,
                status: 'OPEN',
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Auditoria concluída',
            findings_created: missingPayments + (orphanEntries?.length || 0),
            details: {
                missing_payments: missingPayments,
                orphan_entries: orphanEntries?.length || 0,
            },
        });

    } catch (error: any) {
        console.error('[Audit] Erro ao executar auditoria:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
