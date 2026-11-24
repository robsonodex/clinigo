'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    CheckCircle2,
    FileSearch,
    FolderOpen,
    Play,
    RefreshCw,
    Search,
    ShieldAlert,
    Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ReturnDryRunDialog } from '@/components/tiss/return-dry-run-dialog';
import { TissPresetHelpButton } from '@/components/tiss/tiss-contextual-help';

interface GlosaBatchRow {
    id: string;
    batch_number: string;
    insurance_company_name: string | null;
    reference_month: number;
    reference_year: number;
    status: string;
    review_status: 'NAO_INICIADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'COM_RETORNO_CORRECAO';
    care_type: string;
    total_guides: number;
    total_value: number;
    approved_value: number;
    glosa_value: number;
    irrecoverable_value: number;
    pending_accounts_count: number;
}

const REVIEW_STATUS_LEGEND: Array<{
    key: GlosaBatchRow['review_status'];
    label: string;
    dotClass: string;
    badgeClass: string;
}> = [
        {
            key: 'NAO_INICIADA',
            label: 'Não Iniciada / Pendente',
            dotClass: 'bg-rose-600',
            badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        },
        {
            key: 'EM_ANDAMENTO',
            label: 'Em Andamento',
            dotClass: 'bg-blue-600',
            badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        },
        {
            key: 'FINALIZADA',
            label: 'Já Finalizada',
            dotClass: 'bg-emerald-600',
            badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        },
        {
            key: 'COM_RETORNO_CORRECAO',
            label: 'Remessa com Contas Retornadas para Correção',
            dotClass: 'bg-amber-500',
            badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        },
    ];

function formatBRL(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));
}

export function GlosaLevel1Batches({
    onEnterBatch,
    onJumpToAccount,
    onRefreshParent,
}: {
    onEnterBatch: (batchId: string) => void;
    onJumpToAccount: (batchId: string, guideId: string) => void;
    onRefreshParent?: () => void;
}) {
    const [batches, setBatches] = useState<GlosaBatchRow[]>([]);
    const [operators, setOperators] = useState<Array<{ id: string; name: string }>>([]);
    const [ansReasons, setAnsReasons] = useState<Array<{ code: string; description: string; category: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    // Filtros Nível 1
    const [insuranceFilter, setInsuranceFilter] = useState('ALL');
    const [careTypeFilter, setCareTypeFilter] = useState('ALL');
    const [reviewStatusFilter, setReviewStatusFilter] = useState('ALL');
    const [monthFilter, setMonthFilter] = useState('ALL');
    const [searchFilter, setSearchFilter] = useState('');

    // Modais
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountSearchResults, setAccountSearchResults] = useState<any[]>([]);
    const [searchingAccounts, setSearchingAccounts] = useState(false);

    const [dryRunOpen, setDryRunOpen] = useState(false);

    const [totalGlosaOpen, setTotalGlosaOpen] = useState(false);
    const [totalGlosaForm, setTotalGlosaForm] = useState({
        glosa_code: '9999',
        glosa_description: 'Glosa integral da fatura / remessa',
        glosa_type: 'ADMINISTRATIVA' as 'ADMINISTRATIVA' | 'TECNICA' | 'VALOR_TABELA',
        is_irrecoverable: false,
        observation: '',
    });

    const selectedBatch = batches.find((b) => b.id === selectedBatchId) || null;

    const loadReferenceData = useCallback(async () => {
        try {
            const [opRes, reasonRes] = await Promise.all([
                fetch('/api/tiss/operators'),
                fetch('/api/tiss/glosas/reasons'),
            ]);
            if (opRes.ok) {
                const j = await opRes.json();
                setOperators(j.data || j.operators || []);
            }
            if (reasonRes.ok) {
                const r = await reasonRes.json();
                setAnsReasons(r.data || []);
            }
        } catch {
            // Auxiliares opcionais
        }
    }, []);

    const fetchBatches = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (insuranceFilter !== 'ALL') params.set('health_insurance_id', insuranceFilter);
            if (careTypeFilter !== 'ALL') params.set('care_type', careTypeFilter);
            if (reviewStatusFilter !== 'ALL') params.set('review_status', reviewStatusFilter);
            if (monthFilter !== 'ALL') params.set('reference_month', monthFilter);
            if (searchFilter.trim()) params.set('search', searchFilter.trim());

            const res = await fetch(`/api/tiss/glosas/batches?${params.toString()}`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao carregar remessas');
            }
            const list: GlosaBatchRow[] = json.data || [];
            setBatches(list);
            if (list.length > 0 && !list.some((b) => b.id === selectedBatchId)) {
                setSelectedBatchId(list[0].id);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao carregar remessas');
        } finally {
            setLoading(false);
        }
    }, [insuranceFilter, careTypeFilter, reviewStatusFilter, monthFilter, searchFilter, selectedBatchId]);

    useEffect(() => {
        loadReferenceData();
    }, [loadReferenceData]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    const handleStartReview = async (batchId: string) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/tiss/glosas/batches/${batchId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start_review' }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Falha ao iniciar revisão');
            }
            onEnterBatch(batchId);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao iniciar revisão da remessa');
        } finally {
            setBusy(false);
        }
    };

    const handleFinalizeReview = async () => {
        if (!selectedBatch) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/tiss/glosas/batches/${selectedBatch.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'finalize_batch_review' }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Ainda há contas pendentes de revisão');
            }
            toast.success(json.message);
            await fetchBatches();
            onRefreshParent?.();
        } catch (err: any) {
            toast.error(err?.message || 'Não foi possível finalizar a remessa');
        } finally {
            setBusy(false);
        }
    };

    const handleExecuteGlosaTotalFatura = async () => {
        if (!selectedBatch) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/tiss/glosas/batches/${selectedBatch.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'glosa_total_fatura',
                    glosa_code: totalGlosaForm.glosa_code,
                    glosa_description: totalGlosaForm.glosa_description,
                    glosa_type: totalGlosaForm.glosa_type,
                    is_irrecoverable: totalGlosaForm.is_irrecoverable,
                    observation: totalGlosaForm.observation,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao aplicar glosa total');
            }
            toast.success(json.message);
            setTotalGlosaOpen(false);
            await fetchBatches();
            onRefreshParent?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao aplicar glosa total da fatura');
        } finally {
            setBusy(false);
        }
    };

    const handleSearchAccount = async () => {
        if (accountSearchQuery.trim().length < 2) {
            toast.error('Digite ao menos 2 caracteres para localizar a conta.');
            return;
        }
        setSearchingAccounts(true);
        try {
            const res = await fetch(`/api/tiss/glosas/search?q=${encodeURIComponent(accountSearchQuery.trim())}`);
            const json = await res.json();
            if (res.ok && json.success) {
                setAccountSearchResults(json.data || []);
            }
        } catch {
            toast.error('Erro na pesquisa global de contas');
        } finally {
            setSearchingAccounts(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar Nível 1 */}
            <Card className="border border-border shadow-none">
                <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">
                            Nível 1: Remessas / Faturas de Convênios
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Selecione uma remessa para iniciar a revisão conta a conta (Nível 2 e 3) ou importe o XML de retorno.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={fetchBatches}
                            disabled={loading}
                            className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Legenda Visual TOTVS */}
                    <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 px-3.5 py-2.5 text-xs">
                        <span className="font-semibold text-foreground">Legenda:</span>
                        {REVIEW_STATUS_LEGEND.map((item) => (
                            <span key={item.key} className="inline-flex items-center gap-2 text-muted-foreground">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dotClass}`} />
                                <span>{item.label}</span>
                            </span>
                        ))}
                    </div>

                    {/* Filtros */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Pesquisar Remessa / Protocolo</Label>
                            <div className="relative">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    placeholder="Nº remessa, protocolo ou operadora"
                                    className="min-h-[44px] pl-9 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Convênio / Operadora</Label>
                            <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas as Operadoras</SelectItem>
                                    {operators.map((op) => (
                                        <SelectItem key={op.id} value={op.id}>
                                            {op.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Tipo de Atendimento</Label>
                            <Select value={careTypeFilter} onValueChange={setCareTypeFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="AMBULATORIAL_TERAPIAS">Ambulatorial / Terapias</SelectItem>
                                    <SelectItem value="CONSULTAS_PROCEDIMENTOS">Consultas / Procedimentos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Status da Revisão</Label>
                            <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Status</SelectItem>
                                    <SelectItem value="NAO_INICIADA">Não Iniciada</SelectItem>
                                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                                    <SelectItem value="FINALIZADA">Já Finalizada</SelectItem>
                                    <SelectItem value="COM_RETORNO_CORRECAO">Retornadas para Correção</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Mês Competência</Label>
                            <Select value={monthFilter} onValueChange={setMonthFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Meses</SelectItem>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <SelectItem key={m} value={String(m)}>
                                            Mês {String(m).padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Botões de Ação TOTVS Nível 1 */}
                    <div data-help-target="glosas-l1-toolbar" className="flex flex-wrap items-center gap-2 pt-1 rounded-md">
                        <Button
                            type="button"
                            data-help-target="glosas-l1-start-review"
                            disabled={!selectedBatch || busy}
                            onClick={() => selectedBatch && handleStartReview(selectedBatch.id)}
                            className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            <Play className="w-4 h-4" />
                            Iniciar / Revisar Remessa
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSearchModalOpen(true)}
                            className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                        >
                            <FileSearch className="w-4 h-4" />
                            Pesquisa Conta / Paciente
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            disabled={!selectedBatch || busy}
                            onClick={() => setDryRunOpen(true)}
                            className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                        >
                            <Upload className="w-4 h-4" />
                            Importar Retorno XML (Dry-Run)
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            disabled={!selectedBatch || busy}
                            onClick={() => setTotalGlosaOpen(true)}
                            className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium text-rose-700 border-rose-200 hover:bg-rose-50"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Glosa Total da Fatura
                        </Button>

                        <Button
                            type="button"
                            data-help-target="glosas-l1-finalize"
                            variant="outline"
                            disabled={!selectedBatch || busy}
                            onClick={handleFinalizeReview}
                            className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Contas Revisadas (Finalizar Remessa)
                        </Button>
                    </div>

                    {/* Tabela de Remessas */}
                    <div data-help-target="glosas-l1-table" className="rounded-md border border-border overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/60 text-muted-foreground uppercase border-b border-border">
                                <tr>
                                    <th className="p-3 text-left">Status</th>
                                    <th className="p-3 text-left">Remessa / Competência</th>
                                    <th className="p-3 text-left">Operadora</th>
                                    <th className="p-3 text-center">Contas</th>
                                    <th className="p-3 text-right">Cobrado</th>
                                    <th className="p-3 text-right">Aprovado</th>
                                    <th className="p-3 text-right">Glosado</th>
                                    <th className="p-3 text-right">Abrir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            Carregando remessas para controle de glosas...
                                        </td>
                                    </tr>
                                ) : batches.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-10 text-center text-muted-foreground">
                                            Nenhuma remessa encontrada nesta clínica. Crie uma remessa em /dashboard/tiss/batches para iniciar o controle de glosas.
                                        </td>
                                    </tr>
                                ) : (
                                    batches.map((b) => {
                                        const legend = REVIEW_STATUS_LEGEND.find((l) => l.key === b.review_status) || REVIEW_STATUS_LEGEND[0];
                                        const isSelected = b.id === selectedBatchId;
                                        return (
                                            <tr
                                                key={b.id}
                                                onClick={() => setSelectedBatchId(b.id)}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-slate-100/80' : 'hover:bg-muted/30'
                                                    }`}
                                            >
                                                <td className="p-3 whitespace-nowrap">
                                                    <Badge variant="outline" className={`gap-1.5 text-[11px] ${legend.badgeClass}`}>
                                                        <span className={`w-2 h-2 rounded-full ${legend.dotClass}`} />
                                                        {legend.label}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    <div className="font-mono font-semibold text-foreground">{b.batch_number}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        Comp.: {String(b.reference_month).padStart(2, '0')}/{b.reference_year}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-foreground">{b.insurance_company_name || 'Operadora'}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {b.care_type === 'CONSULTAS_PROCEDIMENTOS' ? 'Consultas / Procedimentos' : 'Ambulatorial / Terapias'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold">{b.total_guides}</span>
                                                    {b.pending_accounts_count > 0 && (
                                                        <div className="text-[10px] text-amber-700">
                                                            {b.pending_accounts_count} a revisar
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-medium">{formatBRL(b.total_value)}</td>
                                                <td className="p-3 text-right font-medium text-emerald-700">{formatBRL(b.approved_value)}</td>
                                                <td className="p-3 text-right font-semibold text-rose-700">{formatBRL(b.glosa_value)}</td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={isSelected ? 'default' : 'outline'}
                                                        className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartReview(b.id);
                                                        }}
                                                    >
                                                        <FolderOpen className="w-3.5 h-3.5" />
                                                        Contas da Remessa
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog Pesquisa Conta / Paciente Global */}
            <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pesquisa Conta / Paciente</DialogTitle>
                        <DialogDescription className="text-xs">
                            Localize qualquer conta ou guia entre remessas pelo nome do paciente, número da guia ou carteirinha.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Input
                            value={accountSearchQuery}
                            onChange={(e) => setAccountSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchAccount()}
                            placeholder="Nome do paciente ou nº da guia..."
                            className="min-h-[44px] text-xs"
                        />
                        <Button type="button" onClick={handleSearchAccount} disabled={searchingAccounts} className="min-h-[44px]">
                            <Search className="w-4 h-4 mr-1.5" />
                            {searchingAccounts ? 'Buscando...' : 'Pesquisar'}
                        </Button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto border border-border rounded-md divide-y divide-border">
                        {accountSearchResults.length === 0 ? (
                            <p className="p-6 text-center text-xs text-muted-foreground">
                                Nenhum resultado carregado. Informe um termo e clique em Pesquisar.
                            </p>
                        ) : (
                            accountSearchResults.map((row) => (
                                <div key={row.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30">
                                    <div className="text-xs space-y-0.5 min-w-0">
                                        <div className="font-semibold text-foreground truncate">
                                            {row.patient_name} — Guia {row.guide_number}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Remessa {row.batch?.batch_number || '-'} • {row.batch?.insurance_company_name || ''} • Cobrado {formatBRL(row.total_value)}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="min-h-[44px] shrink-0 text-xs"
                                        onClick={() => {
                                            setSearchModalOpen(false);
                                            if (row.batch_id) onJumpToAccount(row.batch_id, row.id);
                                        }}
                                    >
                                        Abrir Conta (Nível 3)
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Glosa Total da Fatura */}
            <Dialog open={totalGlosaOpen} onOpenChange={setTotalGlosaOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Glosa Total da Fatura</DialogTitle>
                        <DialogDescription className="text-xs">
                            Aplicar glosa integral sobre todas as contas ativas da remessa {selectedBatch?.batch_number}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-xs">
                        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-rose-800">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                Esta ação lançará glosa integral em todas as {selectedBatch?.total_guides || 0} conta(s) desta remessa.
                            </span>
                        </div>
                        <div>
                            <Label className="text-xs">Tipo da Glosa</Label>
                            <Select
                                value={totalGlosaForm.glosa_type}
                                onValueChange={(v) => setTotalGlosaForm((f) => ({ ...f, glosa_type: v as any }))}
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
                            <Label className="text-xs">Motivo da Glosa (Tabela 38 ANS)</Label>
                            <Select
                                value={totalGlosaForm.glosa_code}
                                onValueChange={(code) => {
                                    const found = ansReasons.find((r) => r.code === code);
                                    setTotalGlosaForm((f) => ({
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
                                checked={totalGlosaForm.is_irrecoverable}
                                onCheckedChange={(v) => setTotalGlosaForm((f) => ({ ...f, is_irrecoverable: Boolean(v) }))}
                            />
                            <span className="font-medium text-foreground">
                                Classificar como Glosa Irrecuperável (bloqueia recurso)
                            </span>
                        </label>
                        <div>
                            <Label className="text-xs">Observação</Label>
                            <Textarea
                                value={totalGlosaForm.observation}
                                onChange={(e) => setTotalGlosaForm((f) => ({ ...f, observation: e.target.value }))}
                                rows={2}
                                className="mt-1 text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setTotalGlosaOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white"
                            onClick={handleExecuteGlosaTotalFatura}
                            disabled={busy}
                        >
                            Confirmar Glosa Total da Fatura
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dry Run Dialog (Importar Retorno XML) */}
            {selectedBatch && (
                <ReturnDryRunDialog
                    open={dryRunOpen}
                    onOpenChange={setDryRunOpen}
                    batchId={selectedBatch.id}
                    batchNumber={selectedBatch.batch_number}
                    onSuccess={() => {
                        fetchBatches();
                        onRefreshParent?.();
                    }}
                />
            )}
        </div>
    );
}
