'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileText,
    RefreshCw,
    RotateCcw,
    Save,
    ShieldAlert,
    X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TissPresetHelpButton } from '@/components/tiss/tiss-contextual-help';
import type { AccountItemGroup, GlosaReconciliationSummary } from '@/types/tiss';

const GROUP_TABS: Array<{ value: AccountItemGroup; label: string }> = [
    { value: 'HONORARIOS', label: 'Honorários / Sessões' },
    { value: 'TAXAS', label: 'Taxas e Serviços' },
    { value: 'MATERIAIS', label: 'Materiais e Medicamentos' },
    { value: 'DIAGNOSE', label: 'Diagnose e Terapia' },
];

function formatBRL(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

export function GlosaLevel3AccountEditor({
    guideId,
    onBack,
    onRefreshParent,
}: {
    guideId: string;
    onBack: () => void;
    onRefreshParent?: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [snapshot, setSnapshot] = useState<any>(null);
    const [ansReasons, setAnsReasons] = useState<Array<{ code: string; description: string; category: string }>>([]);
    const [activeTab, setActiveTab] = useState<string>('HONORARIOS');

    // Modal de Glosa Parcial / Irrecuperável (espelho exato TOTVS RM Saúde)
    const [partialModalProc, setPartialModalProc] = useState<any | null>(null);
    const [reasonSearch, setReasonSearch] = useState('');
    const [partialForm, setPartialForm] = useState({
        approved_quantity: '0',
        approved_unit_value: '0',
        is_irrecoverable: false,
        irrecoverable_quantity: '0',
        irrecoverable_value: '0',
        glosa_type: 'ADMINISTRATIVA' as 'ADMINISTRATIVA' | 'TECNICA' | 'VALOR_TABELA',
        glosa_code: '1701',
        glosa_description: 'Cobrança em duplicidade do mesmo procedimento na mesma data',
        observation: '',
        control_date: new Date().toISOString().split('T')[0],
    });

    // Modais auxiliares
    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [resumoGlosasOpen, setResumoGlosasOpen] = useState(false);
    const [groupGlosaTarget, setGroupGlosaTarget] = useState<AccountItemGroup | null>(null);
    const [groupGlosaCode, setGroupGlosaCode] = useState('9999');
    const [groupGlosaIrrec, setGroupGlosaIrrec] = useState(false);
    const [confirmTotalReverseOpen, setConfirmTotalReverseOpen] = useState(false);
    const [reverseGlosaTarget, setReverseGlosaTarget] = useState<any | null>(null);

    // Modal Batimento Contábil (Conclui)
    const [batimentoOpen, setBatimentoOpen] = useState(false);
    const [accountObs, setAccountObs] = useState('');

    const loadLevel3 = useCallback(async () => {
        setLoading(true);
        try {
            const [res, reasonRes] = await Promise.all([
                fetch(`/api/tiss/glosas/accounts/${guideId}`),
                fetch('/api/tiss/glosas/reasons'),
            ]);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao carregar conta no Nível 3');
            }
            setSnapshot(json.data);
            setAccountObs(json.data.guide?.account_notes || '');

            if (reasonRes.ok) {
                const rJson = await reasonRes.json();
                setAnsReasons(rJson.data || []);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao carregar conta médica');
        } finally {
            setLoading(false);
        }
    }, [guideId]);

    useEffect(() => {
        loadLevel3();
    }, [loadLevel3]);

    const runAction = async (payload: Record<string, any>, keepOpen = true) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/tiss/glosas/accounts/${guideId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                if (json.code === 'BATIMENTO_DIVERGENCE') {
                    setBatimentoOpen(true);
                    return false;
                }
                throw new Error(json.error || 'Erro ao executar ação');
            }
            setSnapshot(json.data);
            toast.success(json.message);
            onRefreshParent?.();
            if (!keepOpen) onBack();
            return true;
        } catch (err: any) {
            toast.error(err?.message || 'Falha na operação');
            return false;
        } finally {
            setBusy(false);
        }
    };

    const openPartialModal = (proc: any) => {
        const activeGlosa = (snapshot?.glosas || []).find((g: any) => g.procedure_id === proc.id);
        setPartialModalProc(proc);
        setReasonSearch('');
        const defaultReason = ansReasons[0];
        setPartialForm({
            approved_quantity: String(activeGlosa?.approved_quantity ?? proc.approved_quantity ?? 0),
            approved_unit_value: String(activeGlosa?.approved_unit_value ?? proc.approved_unit_value ?? proc.unit_value ?? 0),
            is_irrecoverable: Boolean(activeGlosa?.is_irrecoverable),
            irrecoverable_quantity: String(activeGlosa?.irrecoverable_quantity ?? 0),
            irrecoverable_value: String(activeGlosa?.irrecoverable_value ?? 0),
            glosa_type: (activeGlosa?.glosa_type || 'ADMINISTRATIVA') as any,
            glosa_code: activeGlosa?.glosa_code || defaultReason?.code || '1701',
            glosa_description:
                activeGlosa?.glosa_description ||
                defaultReason?.description ||
                'Cobrança em duplicidade do mesmo procedimento na mesma data',
            observation: activeGlosa?.observation || '',
            control_date: activeGlosa?.control_date || new Date().toISOString().split('T')[0],
        });
    };

    const handleConfirmPartialGlosa = async () => {
        if (!partialModalProc) return;
        const ok = await runAction({
            action: 'apply_item_glosa',
            procedure_id: partialModalProc.id,
            item_group: partialModalProc.item_group || 'HONORARIOS',
            glosa_code: partialForm.glosa_code,
            glosa_description: partialForm.glosa_description,
            glosa_type: partialForm.glosa_type,
            approved_quantity: Number(partialForm.approved_quantity) || 0,
            approved_unit_value: Number(partialForm.approved_unit_value) || 0,
            is_irrecoverable: partialForm.is_irrecoverable,
            irrecoverable_quantity: Number(partialForm.irrecoverable_quantity) || 0,
            irrecoverable_value: Number(partialForm.irrecoverable_value) || 0,
            observation: partialForm.observation,
            control_date: partialForm.control_date,
        });
        if (ok) {
            setPartialModalProc(null);
        }
    };

    if (loading || !snapshot) {
        return (
            <Card className="border border-border shadow-none">
                <CardContent className="p-10 text-center text-xs text-muted-foreground">
                    Carregando detalhamento de glosa Nível 3...
                </CardContent>
            </Card>
        );
    }

    const { guide, procedures, glosas } = snapshot;
    const summary: GlosaReconciliationSummary = snapshot.summary;
    const filteredReasons = ansReasons.filter((r) => {
        const q = reasonSearch.trim().toLowerCase();
        if (!q) return true;
        return r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    });

    const partialBilledTotal = Number(partialModalProc?.total_value || 0);
    const partialApprovedPreview = Math.min(
        partialBilledTotal,
        (Number(partialForm.approved_quantity) || 0) * (Number(partialForm.approved_unit_value) || 0)
    );
    const partialGlosaPreview = Math.max(0, partialBilledTotal - partialApprovedPreview);

    return (
        <div className="space-y-4">
            {/* Cabeçalho Nível 3 */}
            <Card className="border border-border shadow-none">
                <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={onBack} className="min-h-[44px] gap-1.5 text-xs">
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </Button>
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Nível 3: Conta {guide.guide_number} — {guide.patient_name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {guide.health_insurance?.name || guide.batch?.insurance_company_name || 'Convênio'} • Remessa{' '}
                                {guide.batch?.batch_number || '-'} • Profissional: {guide.doctor?.user?.full_name || '-'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <TissPresetHelpButton topicKey="tiss-controle-glosas" triggerLabel="Ajuda Nível 3" />
                        <Button type="button" variant="outline" onClick={loadLevel3} className="min-h-[44px] gap-1.5 text-xs">
                            <RefreshCw className="w-4 h-4" />
                            Atualizar Valores
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Barra de Batimento Contábil ao Vivo */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="rounded-md border border-border p-3 bg-muted/20">
                            <div className="text-[11px] text-muted-foreground">Total Cobrado</div>
                            <div className="text-sm font-bold">{formatBRL(summary.billed_total)}</div>
                        </div>
                        <div className="rounded-md border border-emerald-200 p-3 bg-emerald-50/60">
                            <div className="text-[11px] text-emerald-800">Total Aprovado</div>
                            <div className="text-sm font-bold text-emerald-700">{formatBRL(summary.approved_total)}</div>
                        </div>
                        <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
                            <div className="text-[11px] text-slate-600">Glosa Prevista (Retorno)</div>
                            <div className="text-sm font-bold text-slate-900">{formatBRL(summary.expected_glosa_total)}</div>
                        </div>
                        <div className="rounded-md border border-rose-200 p-3 bg-rose-50/60">
                            <div className="text-[11px] text-rose-800">Glosa Digitada</div>
                            <div className="text-sm font-bold text-rose-700">{formatBRL(summary.entered_glosa_total)}</div>
                            {summary.irrecoverable_total > 0 && (
                                <div className="text-[10px] text-rose-700">
                                    Irrecup.: {formatBRL(summary.irrecoverable_total)}
                                </div>
                            )}
                        </div>
                        <div
                            className={`rounded-md border p-3 ${
                                Math.abs(summary.difference) < 0.01
                                    ? 'border-emerald-200 bg-emerald-50/60'
                                    : 'border-amber-300 bg-amber-50'
                            }`}
                        >
                            <div className="text-[11px] text-muted-foreground">Diferença Batimento</div>
                            <div
                                className={`text-sm font-bold ${
                                    Math.abs(summary.difference) < 0.01 ? 'text-emerald-700' : 'text-amber-800'
                                }`}
                            >
                                {formatBRL(summary.difference)}
                            </div>
                        </div>
                    </div>

                    {/* 5 Abas (4 Grupos + Resumo por Grupo) */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
                            {GROUP_TABS.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value} className="min-h-[44px] text-xs font-medium px-3">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                            <TabsTrigger value="RESUMO" className="min-h-[44px] text-xs font-semibold px-3">
                                Resumo por Grupo
                            </TabsTrigger>
                        </TabsList>

                        {GROUP_TABS.map((tab) => {
                            const items = (procedures || []).filter((p: any) => (p.item_group || 'HONORARIOS') === tab.value);
                            return (
                                <TabsContent key={tab.value} value={tab.value} className="mt-3">
                                    <div className="rounded-md border border-border overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                                <tr>
                                                    <th className="p-2.5 text-left">TUSS / Item</th>
                                                    <th className="p-2.5 text-center">Qtde Cobrada</th>
                                                    <th className="p-2.5 text-right">Cobrado Total</th>
                                                    <th className="p-2.5 text-right">Glosado</th>
                                                    <th className="p-2.5 text-left">Motivo / Status</th>
                                                    <th className="p-2.5 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {items.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                                            Nenhum item cadastrado neste grupo ({tab.label}).
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    items.map((proc: any) => {
                                                        const itemGlosa = (glosas || []).find((g: any) => g.procedure_id === proc.id)
                                                            || (glosas || []).find((g: any) => g.item_code === proc.procedure_code);
                                                        const glVal = itemGlosa ? Number(itemGlosa.glosa_value || 0) : Number(proc.glosa_value || 0);
                                                        const isIrrec = Boolean(itemGlosa?.is_irrecoverable || proc.is_irrecoverable);

                                                        return (
                                                            <tr key={proc.id} className="hover:bg-muted/20">
                                                                <td className="p-2.5">
                                                                    <div className="font-mono font-semibold">{proc.procedure_code}</div>
                                                                    <div className="text-muted-foreground">{proc.procedure_name}</div>
                                                                </td>
                                                                <td className="p-2.5 text-center">
                                                                    {Number(proc.quantity)} x {formatBRL(proc.unit_value)}
                                                                </td>
                                                                <td className="p-2.5 text-right font-medium">
                                                                    {formatBRL(proc.total_value)}
                                                                </td>
                                                                <td className="p-2.5 text-right font-semibold text-rose-700">
                                                                    {formatBRL(glVal)}
                                                                </td>
                                                                <td className="p-2.5">
                                                                    {itemGlosa ? (
                                                                        <div className="space-y-1">
                                                                            <div className="font-medium text-foreground">
                                                                                ANS {itemGlosa.glosa_code} — {itemGlosa.glosa_description}
                                                                            </div>
                                                                            {isIrrec && (
                                                                                <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">
                                                                                    Glosa Irrecuperável (Recurso Bloqueado)
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-emerald-700 font-medium">Sem glosa no item</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-2.5 text-right">
                                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => openPartialModal(proc)}
                                                                            className="min-h-[44px] text-xs gap-1"
                                                                        >
                                                                            <ShieldAlert className="w-3.5 h-3.5" />
                                                                            Glosa Parcial / Item
                                                                        </Button>
                                                                        {itemGlosa && (
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => setReverseGlosaTarget(itemGlosa)}
                                                                                className="min-h-[44px] text-xs text-rose-700 border-rose-200 hover:bg-rose-50 gap-1"
                                                                            >
                                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                                                Estornar Glosa Selecionada
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </TabsContent>
                            );
                        })}

                        <TabsContent value="RESUMO" className="mt-3 space-y-4">
                            <div className="rounded-md border border-border overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                        <tr>
                                            <th className="p-3 text-left">Grupo da Conta</th>
                                            <th className="p-3 text-right">Cobrado</th>
                                            <th className="p-3 text-right">Aprovado</th>
                                            <th className="p-3 text-right">Glosado</th>
                                            <th className="p-3 text-right">Irrecuperável</th>
                                            <th className="p-3 text-right">Ações no Grupo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {summary.by_group.map((g) => (
                                            <tr key={g.group}>
                                                <td className="p-3 font-semibold">{g.label}</td>
                                                <td className="p-3 text-right">{formatBRL(g.billed)}</td>
                                                <td className="p-3 text-right text-emerald-700 font-medium">{formatBRL(g.approved)}</td>
                                                <td className="p-3 text-right text-rose-700 font-semibold">{formatBRL(g.glosa)}</td>
                                                <td className="p-3 text-right text-rose-800">{formatBRL(g.irrecoverable)}</td>
                                                <td className="p-3 text-right">
                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={g.billed <= 0 || busy}
                                                            onClick={() => setGroupGlosaTarget(g.group)}
                                                            className="min-h-[44px] text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                                                        >
                                                            Glosar Grupo
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={g.glosa <= 0 || busy}
                                                            onClick={() =>
                                                                runAction({
                                                                    action: 'estornar_glosas_grupo',
                                                                    item_group: g.group,
                                                                })
                                                            }
                                                            className="min-h-[44px] text-xs"
                                                        >
                                                            Estornar Glosas Grupos
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setConfirmTotalReverseOpen(true)}
                                    disabled={summary.entered_glosa_total <= 0 || busy}
                                    className="min-h-[44px] text-xs gap-1.5"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Estornar Glosa Valor Total
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setResumoGlosasOpen(true)}
                                    className="min-h-[44px] text-xs gap-1.5"
                                >
                                    <FileText className="w-4 h-4" />
                                    Resumo Glosa ({glosas.length})
                                </Button>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Observação Geral da Revisão</Label>
                                <Textarea
                                    value={accountObs}
                                    onChange={(e) => setAccountObs(e.target.value)}
                                    rows={2}
                                    className="mt-1 text-xs"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Rodapé Fixo Nível 3 TOTVS */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className="min-h-[44px] gap-1.5 text-xs" onClick={() => setAttendanceOpen(true)}>
                                <FileText className="w-4 h-4" />
                                Dados Atend.
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className="min-h-[44px] gap-1.5 text-xs" onClick={onBack}>
                                <X className="w-4 h-4" />
                                Desiste
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-[44px] gap-1.5 text-xs"
                                disabled={busy}
                                onClick={() => runAction({ action: 'save_draft', observation: accountObs })}
                            >
                                <Save className="w-4 h-4" />
                                Grava
                            </Button>
                            <Button
                                type="button"
                                className="min-h-[44px] gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                                disabled={busy}
                                onClick={() => setBatimentoOpen(true)}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Conclui (Batimento Contábil)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* MODAL DE GLOSA PARCIAL / IRRECUPERÁVEL (TOTVS RM-SAU) */}
            <Dialog open={Boolean(partialModalProc)} onOpenChange={(o) => !o && setPartialModalProc(null)}>
                <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registro de Glosa Parcial / Item</DialogTitle>
                        <DialogDescription className="text-xs">
                            Ajuste a quantidade e valor unitário aprovados pela operadora ou classifique como glosa irrecuperável.
                        </DialogDescription>
                    </DialogHeader>

                    {partialModalProc && (
                        <div className="space-y-4 text-xs">
                            <div className="rounded-md border border-border p-3 bg-muted/30 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-3 font-semibold text-foreground">
                                    {partialModalProc.procedure_code} — {partialModalProc.procedure_name}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Qtde. Cobrada:</span>{' '}
                                    <strong>{Number(partialModalProc.quantity)}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Valor Unit. Cobrado:</span>{' '}
                                    <strong>{formatBRL(partialModalProc.unit_value)}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Valor Total Cobrado:</span>{' '}
                                    <strong>{formatBRL(partialModalProc.total_value)}</strong>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label>Qtde. Aprovada</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={partialForm.approved_quantity}
                                        onChange={(e) => setPartialForm((f) => ({ ...f, approved_quantity: e.target.value }))}
                                        className="min-h-[44px] mt-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label>Valor Unitário Aprovado (R$)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={partialForm.approved_unit_value}
                                        onChange={(e) => setPartialForm((f) => ({ ...f, approved_unit_value: e.target.value }))}
                                        className="min-h-[44px] mt-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label>Glosa Calculada no Item</Label>
                                    <div className="min-h-[44px] mt-1 px-3 flex items-center rounded-md border border-rose-200 bg-rose-50 font-bold text-rose-700">
                                        {formatBRL(partialGlosaPreview)}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-md border border-border p-3 space-y-3 bg-muted/10">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={partialForm.is_irrecoverable}
                                        onCheckedChange={(v) => {
                                            const checked = Boolean(v);
                                            setPartialForm((f) => ({
                                                ...f,
                                                is_irrecoverable: checked,
                                                irrecoverable_value: checked ? String(partialGlosaPreview.toFixed(2)) : '0',
                                            }));
                                        }}
                                    />
                                    <span className="font-semibold text-foreground">
                                        Glosa Irrecuperável (impede inclusão em Recurso de Glosa)
                                    </span>
                                </label>
                                {partialForm.is_irrecoverable && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Qtd. Irrecuperável</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={partialForm.irrecoverable_quantity}
                                                onChange={(e) => setPartialForm((f) => ({ ...f, irrecoverable_quantity: e.target.value }))}
                                                className="min-h-[44px] mt-1 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label>Valor Irrecuperável (R$)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={partialForm.irrecoverable_value}
                                                onChange={(e) => setPartialForm((f) => ({ ...f, irrecoverable_value: e.target.value }))}
                                                className="min-h-[44px] mt-1 text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label>Tipo da Glosa</Label>
                                    <Select
                                        value={partialForm.glosa_type}
                                        onValueChange={(v) => setPartialForm((f) => ({ ...f, glosa_type: v as any }))}
                                    >
                                        <SelectTrigger className="min-h-[44px] mt-1 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ADMINISTRATIVA">Administrativa</SelectItem>
                                            <SelectItem value="TECNICA">Técnica</SelectItem>
                                            <SelectItem value="VALOR_TABELA">Valor / Tabela</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Data de Controle</Label>
                                    <Input
                                        type="date"
                                        value={partialForm.control_date}
                                        onChange={(e) => setPartialForm((f) => ({ ...f, control_date: e.target.value }))}
                                        className="min-h-[44px] mt-1 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Motivo da Glosa (Tabela 38 ANS)</Label>
                                <Input
                                    value={reasonSearch}
                                    onChange={(e) => setReasonSearch(e.target.value)}
                                    placeholder="Filtrar por código (ex: 1701, 1401) ou descrição ANS..."
                                    className="min-h-[44px] text-xs"
                                />
                                <Select
                                    value={partialForm.glosa_code}
                                    onValueChange={(code) => {
                                        const found = ansReasons.find((r) => r.code === code);
                                        setPartialForm((f) => ({
                                            ...f,
                                            glosa_code: code,
                                            glosa_description: found?.description || f.glosa_description,
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="min-h-[44px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredReasons.map((r) => (
                                            <SelectItem key={r.code} value={r.code}>
                                                {r.code} - {r.description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Observação</Label>
                                <Textarea
                                    value={partialForm.observation}
                                    onChange={(e) => setPartialForm((f) => ({ ...f, observation: e.target.value }))}
                                    rows={2}
                                    placeholder="Detalhes da justificativa ou divergência encontrada..."
                                    className="mt-1 text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setPartialModalProc(null)}>
                            Cancelar
                        </Button>
                        <Button type="button" className="min-h-[44px]" onClick={handleConfirmPartialGlosa} disabled={busy}>
                            OK — Gravar Glosa do Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL CONCLUSÃO & BATIMENTO CONTÁBIL */}
            <Dialog open={batimentoOpen} onOpenChange={setBatimentoOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Conclusão da Revisão & Batimento Contábil</DialogTitle>
                        <DialogDescription className="text-xs">
                            Confira o confronto entre a Glosa Prevista no demonstrativo e os valores digitados nos itens da conta.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-xs">
                        <div className="rounded-md border border-border p-3.5 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Cobrado:</span>
                                <strong>{formatBRL(summary.billed_total)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Glosa Prevista (Demonstrativo):</span>
                                <strong>{formatBRL(summary.expected_glosa_total)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Glosa Digitada (Itens/Grupos):</span>
                                <strong className="text-rose-700">{formatBRL(summary.entered_glosa_total)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Recebimento a Maior:</span>
                                <strong className="text-blue-700">{formatBRL(summary.overpayment_received)}</strong>
                            </div>
                            <div className="pt-2 border-t border-border flex justify-between font-bold">
                                <span>Diferença no Batimento:</span>
                                <span className={Math.abs(summary.difference) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}>
                                    {formatBRL(summary.difference)}
                                </span>
                            </div>
                        </div>

                        {Math.abs(summary.difference) >= 0.01 && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-amber-900">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    A glosa digitada difere da glosa prevista em {formatBRL(Math.abs(summary.difference))}. Ao concluir, o sistema assumirá a glosa digitada item a item para o cálculo final da remessa e recursos.
                                </span>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setBatimentoOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white"
                            disabled={busy}
                            onClick={async () => {
                                const ok = await runAction(
                                    { action: 'complete_account_review', force_batimento: true },
                                    false
                                );
                                if (ok) setBatimentoOpen(false);
                            }}
                        >
                            Confirmar Conclusão e Batimento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Glosar Grupo */}
            <Dialog open={Boolean(groupGlosaTarget)} onOpenChange={(o) => !o && setGroupGlosaTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Glosar Grupo ({groupGlosaTarget})</DialogTitle>
                        <DialogDescription className="text-xs">
                            Aplicar glosa integral a todos os itens ativos deste grupo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-xs">
                        <div>
                            <Label>Motivo ANS Tabela 38</Label>
                            <Select value={groupGlosaCode} onValueChange={setGroupGlosaCode}>
                                <SelectTrigger className="min-h-[44px] mt-1 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ansReasons.map((r) => (
                                        <SelectItem key={r.code} value={r.code}>
                                            {r.code} - {r.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={groupGlosaIrrec} onCheckedChange={(v) => setGroupGlosaIrrec(Boolean(v))} />
                            <span>Marcar glosas do grupo como Irrecuperáveis</span>
                        </label>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setGroupGlosaTarget(null)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white"
                            disabled={busy}
                            onClick={async () => {
                                const found = ansReasons.find((r) => r.code === groupGlosaCode);
                                const ok = await runAction({
                                    action: 'glosar_grupo',
                                    item_group: groupGlosaTarget,
                                    glosa_code: groupGlosaCode,
                                    glosa_description: found?.description || 'Glosa integral de grupo',
                                    is_irrecoverable: groupGlosaIrrec,
                                });
                                if (ok) setGroupGlosaTarget(null);
                            }}
                        >
                            Confirmar Glosa do Grupo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Resumo Glosa */}
            <Dialog open={resumoGlosasOpen} onOpenChange={setResumoGlosasOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Resumo de Glosas da Conta ({glosas.length})</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-border border border-border rounded-md text-xs">
                        {glosas.length === 0 ? (
                            <p className="p-6 text-center text-muted-foreground">Nenhuma glosa ativa registrada nesta conta.</p>
                        ) : (
                            glosas.map((g: any) => (
                                <div key={g.id} className="p-3 flex items-center justify-between gap-2">
                                    <div className="space-y-0.5">
                                        <div className="font-semibold">
                                            ANS {g.glosa_code} — {g.glosa_description}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Grupo {g.item_group || 'HONORARIOS'} • Valor: {formatBRL(g.glosa_value)}
                                            {g.is_irrecoverable ? ' • Irrecuperável' : ' • Recuperável'}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="min-h-[44px] text-xs text-rose-700"
                                        onClick={() => setReverseGlosaTarget(g)}
                                    >
                                        Estornar
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Dados Atend. */}
            <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Dados do Atendimento e Prontuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-xs">
                        <p>
                            Check-in / Biometria:{' '}
                            {snapshot.appointment?.checkin_confirmed_at || snapshot.appointment?.therapist_start_verified_at
                                ? 'Confirmado'
                                : 'Sem comprovação registrada'}
                        </p>
                        <p>
                            Evolução Clínica:{' '}
                            {snapshot.medical_record?.id
                                ? snapshot.medical_record.signed_at || snapshot.medical_record.signature_hash
                                    ? 'Assinada digitalmente'
                                    : 'Registrada no prontuário'
                                : 'Pendente'}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" className="min-h-[44px]" onClick={() => setAttendanceOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AlertDialog Estornar Glosa Selecionada */}
            <AlertDialog open={Boolean(reverseGlosaTarget)} onOpenChange={(o) => !o && setReverseGlosaTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Estornar glosa selecionada?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Confirma o estorno da glosa ANS {reverseGlosaTarget?.glosa_code} ({formatBRL(reverseGlosaTarget?.glosa_value)})?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white"
                            onClick={async () => {
                                const id = reverseGlosaTarget?.id;
                                setReverseGlosaTarget(null);
                                if (id) await runAction({ action: 'reverse_glosa_item', glosa_id: id });
                            }}
                        >
                            Confirmar Estorno
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog Estornar Glosa Valor Total */}
            <AlertDialog open={confirmTotalReverseOpen} onOpenChange={setConfirmTotalReverseOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Estornar todas as glosas desta conta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ATENÇÃO: Todas as glosas abertas desta conta ({formatBRL(summary.entered_glosa_total)}) serão estornadas e a conta será marcada como Paga Integralmente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white"
                            onClick={async () => {
                                setConfirmTotalReverseOpen(false);
                                await runAction({ action: 'estornar_glosa_valor_total' });
                            }}
                        >
                            Confirmar Estorno Total
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

