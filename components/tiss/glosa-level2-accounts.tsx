'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    FolderOpen,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

type Level2FilterKey =
    | 'ALL'
    | 'PENDENTES'
    | 'PAGAS'
    | 'GLOSA_PARCIAL'
    | 'GLOSA_TOTAL'
    | 'SEM_PAGAMENTO';

function formatBRL(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

export function GlosaLevel2Accounts({
    batchId,
    onBack,
    onOpenAccount,
    onRefreshParent,
}: {
    batchId: string;
    onBack: () => void;
    onOpenAccount: (guideId: string) => void;
    onRefreshParent?: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [batch, setBatch] = useState<any>(null);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [summary, setSummary] = useState({
        total_billed: 0,
        total_approved: 0,
        total_glosa: 0,
        total_irrecoverable: 0,
        total_receivable_or_appeal: 0,
    });
    const [ansReasons, setAnsReasons] = useState<Array<{ code: string; description: string }>>([]);

    const [filterTab, setFilterTab] = useState<Level2FilterKey>('ALL');
    const [quickSearch, setQuickSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [autoGlosaModalOpen, setAutoGlosaModalOpen] = useState(false);
    const [autoGlosaForm, setAutoGlosaForm] = useState({
        glosa_code: '9999',
        glosa_description: 'Glosa total automática registrada em revisão',
        glosa_type: 'ADMINISTRATIVA' as 'ADMINISTRATIVA' | 'TECNICA' | 'VALOR_TABELA',
        is_irrecoverable: false,
    });
    const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);

    const loadLevel2 = useCallback(async () => {
        setLoading(true);
        try {
            const [res, reasonRes] = await Promise.all([
                fetch(`/api/tiss/glosas/batches/${batchId}`),
                fetch('/api/tiss/glosas/reasons'),
            ]);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao carregar contas da remessa');
            }
            setBatch(json.data.batch);
            setAccounts(json.data.accounts || []);
            setCounts(json.data.counts || {});
            setSummary(json.data.summary);

            if (reasonRes.ok) {
                const rJson = await reasonRes.json();
                setAnsReasons(rJson.data || []);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao carregar contas');
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        loadLevel2();
    }, [loadLevel2]);

    const filteredAccounts = useMemo(() => {
        const q = quickSearch.trim().toLowerCase();
        return accounts.filter((a) => {
            const matchesTab =
                filterTab === 'ALL'
                    ? true
                    : filterTab === 'PENDENTES'
                    ? !a.is_reviewed
                    : a.account_category === filterTab;

            if (!matchesTab) return false;
            if (!q) return true;

            return (
                String(a.patient_name || '').toLowerCase().includes(q) ||
                String(a.guide_number || '').toLowerCase().includes(q) ||
                String(a.procedure_code || '').toLowerCase().includes(q)
            );
        });
    }, [accounts, filterTab, quickSearch]);

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(filteredAccounts.map((a) => a.id));
    };

    const handleBatchAction = async (payload: Record<string, any>) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/tiss/glosas/batches/${batchId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao executar ação');
            }
            toast.success(json.message);
            setSelectedIds([]);
            await loadLevel2();
            onRefreshParent?.();
        } catch (err: any) {
            toast.error(err?.message || 'Falha na operação em lote');
        } finally {
            setBusy(false);
        }
    };

    const filterChips: Array<{ key: Level2FilterKey; label: string; count: number }> = [
        { key: 'ALL', label: 'Todas as Contas', count: counts.ALL ?? accounts.length },
        { key: 'PENDENTES', label: 'Contas a Revisar / Pendentes', count: counts.PENDENTES ?? 0 },
        { key: 'PAGAS', label: 'Contas Pagas Integralmente', count: counts.PAGAS ?? 0 },
        { key: 'GLOSA_PARCIAL', label: 'Contas com Glosas Parciais', count: counts.GLOSA_PARCIAL ?? 0 },
        { key: 'GLOSA_TOTAL', label: 'Contas com Glosa Total', count: counts.GLOSA_TOTAL ?? 0 },
        { key: 'SEM_PAGAMENTO', label: 'Sem Informação de Pagamento', count: counts.SEM_PAGAMENTO ?? 0 },
    ];

    return (
        <div className="space-y-4">
            {/* Cabeçalho Nível 2 */}
            <Card className="border border-border shadow-none">
                <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                            className="min-h-[44px] gap-1.5 text-xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar / Fechar
                        </Button>
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Nível 2: Contas da Remessa {batch?.batch_number || ''}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {batch?.insurance_company_name || 'Operadora'} • Competência{' '}
                                {String(batch?.reference_month || 1).padStart(2, '0')}/{batch?.reference_year || ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <TissPresetHelpButton topicKey="tiss-controle-glosas" triggerLabel="Ajuda Nível 2" />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={loadLevel2}
                            disabled={loading}
                            className="min-h-[44px] gap-1.5 text-xs"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* 4 Cards de Resumo Financeiro */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-md border border-border p-3.5 bg-muted/20">
                            <div className="text-xs text-muted-foreground">Total Cobrado</div>
                            <div className="text-xl font-bold text-foreground mt-1">{formatBRL(summary.total_billed)}</div>
                        </div>
                        <div className="rounded-md border border-emerald-200 p-3.5 bg-emerald-50/60">
                            <div className="text-xs text-emerald-800">Total Recebido / Aprovado</div>
                            <div className="text-xl font-bold text-emerald-700 mt-1">{formatBRL(summary.total_approved)}</div>
                        </div>
                        <div className="rounded-md border border-rose-200 p-3.5 bg-rose-50/60">
                            <div className="text-xs text-rose-800">Total Glosado</div>
                            <div className="text-xl font-bold text-rose-700 mt-1">{formatBRL(summary.total_glosa)}</div>
                            {summary.total_irrecoverable > 0 && (
                                <div className="text-[11px] text-rose-700 mt-0.5">
                                    Irrecuperável: {formatBRL(summary.total_irrecoverable)}
                                </div>
                            )}
                        </div>
                        <div className="rounded-md border border-blue-200 p-3.5 bg-blue-50/60">
                            <div className="text-xs text-blue-800">A Receber / Em Recurso</div>
                            <div className="text-xl font-bold text-blue-700 mt-1">
                                {formatBRL(summary.total_receivable_or_appeal)}
                            </div>
                        </div>
                    </div>

                    {/* Filtros de Contagem em Tempo Real */}
                    <div className="flex flex-wrap gap-2">
                        {filterChips.map((chip) => (
                            <Button
                                key={chip.key}
                                type="button"
                                variant={filterTab === chip.key ? 'default' : 'outline'}
                                onClick={() => setFilterTab(chip.key)}
                                className="min-h-[44px] text-xs gap-1.5"
                            >
                                <span>{chip.label}</span>
                                <Badge
                                    variant="secondary"
                                    className="text-[11px] font-mono bg-white/80 text-slate-900"
                                >
                                    {chip.count}
                                </Badge>
                            </Button>
                        ))}
                    </div>

                    {/* Localização Rápida + Seleção + Ações em Lote */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            <div className="relative flex-1 min-w-[260px]">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                <Input
                                    value={quickSearch}
                                    onChange={(e) => setQuickSearch(e.target.value)}
                                    placeholder="Localização rápida pelo Nome do Paciente ou Nro. Guia..."
                                    className="min-h-[44px] pl-9 text-xs"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none px-2">
                                <Checkbox
                                    checked={
                                        filteredAccounts.length > 0 &&
                                        selectedIds.length === filteredAccounts.length
                                    }
                                    onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                                />
                                <span>Selecionar TODAS as contas ({filteredAccounts.length})</span>
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                disabled={selectedIds.length === 0 || busy}
                                onClick={() =>
                                    handleBatchAction({
                                        action: 'auto_liberate_accounts',
                                        guide_ids: selectedIds,
                                    })
                                }
                                className="min-h-[44px] gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Liberação Automática ({selectedIds.length})
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={selectedIds.length === 0 || busy}
                                onClick={() => setAutoGlosaModalOpen(true)}
                                className="min-h-[44px] gap-1.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                            >
                                <ShieldAlert className="w-4 h-4" />
                                Glosa Total Automática
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={selectedIds.length === 0 || busy}
                                onClick={() => setReturnConfirmOpen(true)}
                                className="min-h-[44px] gap-1.5 text-xs text-amber-800 border-amber-200 hover:bg-amber-50"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Retornar para Revisão
                            </Button>
                        </div>
                    </div>

                    {/* Grid de Contas da Remessa */}
                    <div className="rounded-md border border-border overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/60 text-muted-foreground uppercase border-b border-border">
                                <tr>
                                    <th className="p-3 w-10 text-center">Sel.</th>
                                    <th className="p-3 text-left">Guia / Atendimento</th>
                                    <th className="p-3 text-left">Paciente / Profissional</th>
                                    <th className="p-3 text-right">Cobrado</th>
                                    <th className="p-3 text-right">Aprovado</th>
                                    <th className="p-3 text-right">Glosado</th>
                                    <th className="p-3 text-left">Situação</th>
                                    <th className="p-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            Carregando contas da remessa...
                                        </td>
                                    </tr>
                                ) : filteredAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            Nenhuma conta encontrada neste filtro.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAccounts.map((acc) => (
                                        <tr key={acc.id} className="hover:bg-muted/30">
                                            <td className="p-3 text-center">
                                                <Checkbox
                                                    checked={selectedIds.includes(acc.id)}
                                                    onCheckedChange={(v) =>
                                                        setSelectedIds((prev) =>
                                                            v
                                                                ? Array.from(new Set([...prev, acc.id]))
                                                                : prev.filter((x) => x !== acc.id)
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <div className="font-mono font-semibold text-foreground">{acc.guide_number}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {acc.execution_date
                                                        ? new Date(`${acc.execution_date}T12:00:00`).toLocaleDateString('pt-BR')
                                                        : '-'}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium text-foreground">{acc.patient_name}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {acc.doctor_name} • TUSS {acc.procedure_code}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-medium">{formatBRL(acc.total_value)}</td>
                                            <td className="p-3 text-right font-medium text-emerald-700">
                                                {formatBRL(acc.approved_value)}
                                            </td>
                                            <td className="p-3 text-right font-semibold text-rose-700">
                                                {formatBRL(acc.glosa_value)}
                                                {acc.irrecoverable_value > 0 && (
                                                    <div className="text-[10px] font-normal text-rose-700">
                                                        Irrec.: {formatBRL(acc.irrecoverable_value)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        acc.account_category === 'PAGAS'
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                            : acc.account_category === 'GLOSA_PARCIAL'
                                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                            : acc.account_category === 'GLOSA_TOTAL'
                                                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                            : 'bg-slate-100 text-slate-700 border-slate-300'
                                                    }
                                                >
                                                    {acc.account_category === 'PAGAS'
                                                        ? 'Paga Integralmente'
                                                        : acc.account_category === 'GLOSA_PARCIAL'
                                                        ? 'Glosa Parcial'
                                                        : acc.account_category === 'GLOSA_TOTAL'
                                                        ? 'Glosa Total'
                                                        : acc.account_category === 'SEM_PAGAMENTO'
                                                        ? 'Sem Info Pagamento'
                                                        : 'A Revisar'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => onOpenAccount(acc.id)}
                                                    className="min-h-[44px] gap-1.5 text-xs"
                                                >
                                                    <FolderOpen className="w-3.5 h-3.5" />
                                                    Abrir Conta
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal Glosa Total Automática */}
            <Dialog open={autoGlosaModalOpen} onOpenChange={setAutoGlosaModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Glosa Total Automática ({selectedIds.length} conta(s))</DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecione o código da Tabela 38 ANS para glosar integralmente as contas selecionadas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-xs">
                        <div>
                            <Label>Tipo da Glosa</Label>
                            <Select
                                value={autoGlosaForm.glosa_type}
                                onValueChange={(v) => setAutoGlosaForm((f) => ({ ...f, glosa_type: v as any }))}
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
                            <Label>Motivo da Glosa (Tabela 38 ANS)</Label>
                            <Select
                                value={autoGlosaForm.glosa_code}
                                onValueChange={(code) => {
                                    const found = ansReasons.find((r) => r.code === code);
                                    setAutoGlosaForm((f) => ({
                                        ...f,
                                        glosa_code: code,
                                        glosa_description: found?.description || f.glosa_description,
                                    }));
                                }}
                            >
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
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                            <Checkbox
                                checked={autoGlosaForm.is_irrecoverable}
                                onCheckedChange={(v) => setAutoGlosaForm((f) => ({ ...f, is_irrecoverable: Boolean(v) }))}
                            />
                            <span className="font-medium">Glosa Irrecuperável (bloqueia recurso)</span>
                        </label>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setAutoGlosaModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white"
                            disabled={busy}
                            onClick={async () => {
                                await handleBatchAction({
                                    action: 'auto_glosa_total_accounts',
                                    guide_ids: selectedIds,
                                    ...autoGlosaForm,
                                });
                                setAutoGlosaModalOpen(false);
                            }}
                        >
                            Aplicar Glosa Total
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmação Retornar para Revisão */}
            <AlertDialog open={returnConfirmOpen} onOpenChange={setReturnConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Retornar contas para Elaboração?</AlertDialogTitle>
                        <AlertDialogDescription>
                            As {selectedIds.length} conta(s) selecionada(s) serão desvinculadas desta remessa e retornarão para Em Elaboração na tela /dashboard/tiss. A remessa ficará sinalizada com Contas Retornadas para Correção. Confirmar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={async () => {
                                setReturnConfirmOpen(false);
                                await handleBatchAction({
                                    action: 'return_to_revision',
                                    guide_ids: selectedIds,
                                });
                            }}
                        >
                            Confirmar Retorno
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

