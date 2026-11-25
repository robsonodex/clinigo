'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Banknote,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    RefreshCw,
    ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

interface UnbilledSessionAlert {
    appointment_id: string;
    appointment_date: string;
    appointment_time: string | null;
    patient_name: string;
    doctor_name: string;
    therapy_modality: string | null;
    health_insurance_name: string;
    estimated_value: number;
    has_biometric_or_checkin: boolean;
    has_signed_evolution: boolean;
    shield_ready: boolean;
    days_since_execution: number;
    days_until_send_deadline: number;
    urgency: 'critical' | 'warning' | 'normal';
}

interface AcceptedUnpaidAlert {
    appeal_id: string;
    appeal_number: string;
    health_insurance_name: string;
    accepted_value: number;
    bank_received_value: number;
    tax_withheld_value: number;
    pending_credit_value: number;
    days_waiting: number;
    sla_days: number;
    is_overdue: boolean;
}

interface TherapyAuditFinding {
    guide_id: string;
    guide_number: string;
    patient_name: string;
    severity: 'blocker' | 'warning';
    code: string;
    category: 'OVERLAP' | 'CARD_EXPIRED' | 'COUNCIL' | 'SHIELD_PROOF' | 'UNDERPAYMENT';
    message: string;
    estimated_risk_value: number;
}

interface RevenueLeakagePayload {
    unbilled_sessions: {
        total_count: number;
        ready_to_bill_count: number;
        expiring_soon_count: number;
        total_estimated_value: number;
        items: UnbilledSessionAlert[];
    };
    accepted_unpaid_appeals: {
        total_pending_credit_value: number;
        overdue_count: number;
        items: AcceptedUnpaidAlert[];
    };
    therapy_audit: {
        findings_count: number;
        blockers_count: number;
        total_risk_value: number;
        findings: TherapyAuditFinding[];
    };
}

interface TissRevenueRadarCardProps {
    onGoToElaboration?: () => void;
}

export function TissRevenueRadarCard({ onGoToElaboration }: TissRevenueRadarCardProps) {
    const [data, setData] = useState<RevenueLeakagePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedPanel, setExpandedPanel] = useState<'none' | 'unbilled' | 'audit'>('none');

    const loadRadar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/tiss/revenue-leakage', { cache: 'no-store' });
            if (!res.ok) {
                throw new Error('Não foi possível apurar o radar de receita TISS.');
            }
            const json = await res.json();
            if (!json?.success || !json?.data) {
                throw new Error(json?.error || 'Resposta inesperada do radar de receita.');
            }
            setData(json.data);
        } catch (err: any) {
            setError(err?.message || 'Erro ao carregar radar de receita.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRadar();
    }, [loadRadar]);

    if (loading && !data) {
        return (
            <Card className="border-slate-200 bg-white shadow-none" data-help-target="tiss-radar-receita">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error && !data) {
        return (
            <Card className="border-slate-200 bg-white shadow-none" data-help-target="tiss-radar-receita">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadRadar}
                        className="h-9 min-h-[36px] text-xs gap-1.5 self-start sm:self-auto"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar novamente
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const unbilled = data.unbilled_sessions;
    const unpaid = data.accepted_unpaid_appeals;
    const audit = data.therapy_audit;

    const totalAttention =
        unbilled.total_count + unpaid.items.length + audit.findings_count;

    return (
        <Card
            className="border-slate-200 bg-white shadow-none overflow-hidden"
            data-help-target="tiss-radar-receita"
        >
            <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#155E4B]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Radar de Receita e Blindagem ANS
                            </span>
                            <Badge
                                variant="outline"
                                className={
                                    totalAttention === 0
                                        ? 'text-[11px] font-medium border-emerald-200 bg-[#E6F2EE] text-[#155E4B]'
                                        : 'text-[11px] font-medium border-amber-200 bg-amber-50 text-amber-800'
                                }
                            >
                                {totalAttention === 0
                                    ? 'Operação blindada (90 dias)'
                                    : `${totalAttention} ponto(s) de atenção`}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Monitoramento automático de sessões sem guia (PRE-05), acatos aguardando crédito bancário (KPI-06) e conflitos pré-envio de terapias seriadas.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadRadar}
                        disabled={loading}
                        className="h-9 min-h-[36px] px-3 text-xs font-medium gap-1.5 shrink-0 self-start sm:self-auto shadow-none"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Atualizar Radar</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* BLOCO 1: Caçador de Dinheiro na Mesa (PRE-05) */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">
                                    Sessões Sem Guia (Dinheiro na Mesa)
                                </span>
                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
                                    {formatCurrency(unbilled.total_estimated_value)}
                                </span>
                                <span className="text-xs text-slate-500">
                                    ({unbilled.total_count} sessão(ões))
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                <Badge variant="outline" className="text-[10px] font-medium bg-[#E6F2EE] text-[#155E4B] border-emerald-200">
                                    {unbilled.ready_to_bill_count} blindada(s) p/ faturar
                                </Badge>
                                {unbilled.expiring_soon_count > 0 && (
                                    <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200">
                                        {unbilled.expiring_soon_count} prazo ANS próximo
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                            {unbilled.total_count > 0 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setExpandedPanel((p) => (p === 'unbilled' ? 'none' : 'unbilled'))
                                    }
                                    className="h-8 px-2 text-xs text-slate-700 hover:text-slate-900 gap-1"
                                >
                                    {expandedPanel === 'unbilled' ? (
                                        <>
                                            <ChevronUp className="w-3.5 h-3.5" />
                                            Ocultar lista
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                            Ver sessões ({unbilled.total_count})
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#155E4B] font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Todas faturadas
                                </span>
                            )}
                            {onGoToElaboration && unbilled.total_count > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onGoToElaboration}
                                    className="h-8 px-2.5 text-xs gap-1 ml-auto shadow-none"
                                >
                                    Elaborar
                                    <ArrowRight className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* BLOCO 2: Acato Sem Crédito Bancário (KPI-06) */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">
                                    Acato Sem Crédito Bancário
                                </span>
                                <Banknote className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
                                    {formatCurrency(unpaid.total_pending_credit_value)}
                                </span>
                                <span className="text-xs text-slate-500">
                                    ({unpaid.items.length} recurso(s))
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {unpaid.overdue_count > 0 ? (
                                    <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200">
                                        {unpaid.overdue_count} acima do SLA pós-recurso
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] font-medium bg-white text-slate-600 border-slate-200">
                                        Separação Acato × Caixa ativa
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-500">
                                {unpaid.items.length === 0
                                    ? 'Nenhum acato pendente'
                                    : 'Aguardando liquidação em conta'}
                            </span>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs gap-1 shadow-none"
                            >
                                <Link href="/dashboard/tiss/glosas?tab=recursos" prefetch={false}>
                                    Conciliar
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* BLOCO 3: Auditoria Anti-Glosa TEA/Terapias + FIN-08 */}
                    <div
                        className="rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 flex flex-col justify-between gap-3"
                        data-help-target="tiss-blindagem-tea"
                    >
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">
                                    Blindagem Terapias / Subpagamento
                                </span>
                                <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-semibold tracking-tight font-mono tabular-nums text-slate-900">
                                    {formatCurrency(audit.total_risk_value)}
                                </span>
                                <span className="text-xs text-slate-500">
                                    ({audit.findings_count} alerta(s))
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {audit.blockers_count > 0 ? (
                                    <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200">
                                        {audit.blockers_count} bloqueio(s) pré-envio
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] font-medium bg-[#E6F2EE] text-[#155E4B] border-emerald-200">
                                        Zero conflitos críticos
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            {audit.findings_count > 0 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setExpandedPanel((p) => (p === 'audit' ? 'none' : 'audit'))
                                    }
                                    className="h-8 px-2 text-xs text-slate-700 hover:text-slate-900 gap-1"
                                >
                                    {expandedPanel === 'audit' ? (
                                        <>
                                            <ChevronUp className="w-3.5 h-3.5" />
                                            Ocultar alertas
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                            Inspecionar ({audit.findings_count})
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#155E4B] font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Sem sobreposição ou vencimento
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* DETALHAMENTO EXPANSÍVEL: Sessões Sem Guia */}
                {expandedPanel === 'unbilled' && unbilled.items.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800">
                                Sessões concluídas de convênio aguardando guia TISS (últimos 90 dias)
                            </span>
                            <span className="text-[11px] text-slate-500">
                                Ordenadas por urgência do prazo ANS
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {unbilled.items.slice(0, 20).map((item) => (
                                <div
                                    key={item.appointment_id}
                                    className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-900 truncate">
                                            {item.patient_name}{' '}
                                            <span className="text-slate-500 font-normal">
                                                • {item.health_insurance_name}
                                                {item.therapy_modality ? ` (${item.therapy_modality})` : ''}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Data: {item.appointment_date}
                                            {item.appointment_time ? ` às ${item.appointment_time.slice(0, 5)}` : ''} • Terapeuta: {item.doctor_name}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.has_biometric_or_checkin
                                                    ? 'text-[10px] bg-[#E6F2EE] text-[#155E4B] border-emerald-200'
                                                    : 'text-[10px] bg-amber-50 text-amber-800 border-amber-200'
                                            }
                                        >
                                            {item.has_biometric_or_checkin ? 'Biometria OK' : 'Sem check-in'}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.has_signed_evolution
                                                    ? 'text-[10px] bg-[#E6F2EE] text-[#155E4B] border-emerald-200'
                                                    : 'text-[10px] bg-amber-50 text-amber-800 border-amber-200'
                                            }
                                        >
                                            {item.has_signed_evolution ? 'Evolução OK' : 'Sem assinatura'}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.urgency === 'critical'
                                                    ? 'text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-mono'
                                                    : item.urgency === 'warning'
                                                        ? 'text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-mono'
                                                        : 'text-[10px] bg-slate-50 text-slate-700 border-slate-200 font-mono'
                                            }
                                        >
                                            {item.days_until_send_deadline <= 0
                                                ? 'Prazo vencido'
                                                : `${item.days_until_send_deadline}d restantes`}
                                        </Badge>
                                        <span className="font-mono font-semibold text-slate-900 ml-1 tabular-nums">
                                            {formatCurrency(item.estimated_value)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* DETALHAMENTO EXPANSÍVEL: Alertas de Blindagem TEA / Subpagamento */}
                {expandedPanel === 'audit' && audit.findings.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800">
                                Inconsistências detectadas antes do envio / subpagamento silencioso
                            </span>
                            <span className="text-[11px] text-slate-500">
                                Corrija antes de fechar o lote XML
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {audit.findings.slice(0, 20).map((f, idx) => (
                                <div
                                    key={`${f.guide_id}-${f.code}-${idx}`}
                                    className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    f.severity === 'blocker'
                                                        ? 'text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-mono'
                                                        : 'text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-mono'
                                                }
                                            >
                                                {f.code}
                                            </Badge>
                                            <span className="font-medium text-slate-900">
                                                Guia {f.guide_number} — {f.patient_name}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                            {f.message}
                                        </p>
                                    </div>
                                    <span className="font-mono font-semibold text-rose-700 shrink-0 tabular-nums">
                                        {formatCurrency(f.estimated_risk_value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

