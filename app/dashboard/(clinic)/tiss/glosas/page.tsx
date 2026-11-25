// app/dashboard/(clinic)/tiss/glosas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    TrendingDown,
    Scale,
    FileSpreadsheet,
    RefreshCw,
    Download,
    Filter,
    XCircle,
    Clock,
    Plus,
    Trash2,
    Send,
    CheckCircle2,
    Paperclip,
    AlertTriangle,
    Layers,
    FileCheck2,
    FileCode2,
    Landmark,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlosaLevel1Batches } from '@/components/tiss/glosa-level1-batches';
import { GlosaLevel2Accounts } from '@/components/tiss/glosa-level2-accounts';
import { GlosaLevel3AccountEditor } from '@/components/tiss/glosa-level3-account-editor';
import { TissPresetHelpButton } from '@/components/tiss/tiss-contextual-help';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContestGlosaDialog } from '@/components/tiss/contest-glosa-dialog';
import { ManualGlosaDialog } from '@/components/tiss/manual-glosa-dialog';
import { HistoryDrawer } from '@/components/tiss/HistoryDrawer';
import { StatusFilterTabs, type StatusFilterOption } from '@/components/tiss/status-filter-tabs';
import {
    LossAppealDialog,
    SubmitAppealDialog,
    ResultAppealDialog,
    AttachmentsAppealDialog,
    ConfirmAppealPaymentDialog,
} from '@/components/tiss/appeal-management-dialogs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useFaturamentoPremium } from '@/lib/tiss/use-faturamento-premium';

export default function GlosasPage() {
    const { isPremium } = useFaturamentoPremium();
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0];

    // Estados gerais e abas principais
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'totvs_3niveis' | 'glosas' | 'recursos'>('totvs_3niveis');

    useEffect(() => {
        const requestedTab = searchParams?.get('tab');
        if (requestedTab === 'recursos' || requestedTab === 'glosas' || requestedTab === 'totvs_3niveis') {
            setActiveTab(requestedTab);
        }
    }, [searchParams]);
    const [level2BatchId, setLevel2BatchId] = useState<string | null>(null);
    const [level3GuideId, setLevel3GuideId] = useState<string | null>(null);
    const [dossierModalData, setDossierModalData] = useState<any | null>(null);
    const [loadingDossierId, setLoadingDossierId] = useState<string | null>(null);
    const [newAppealOpen, setNewAppealOpen] = useState(false);
    const [newAppealInsuranceId, setNewAppealInsuranceId] = useState<string>('');
    const [newAppealReason, setNewAppealReason] = useState<string>('');
    const [newAppealGlosaIds, setNewAppealGlosaIds] = useState<string[]>([]);
    const [creatingAppeal, setCreatingAppeal] = useState(false);
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [filterApplied, setFilterApplied] = useState({ start: defaultStart, end: defaultEnd });

    // Filtros por status F1
    const [glosaStatusFilter, setGlosaStatusFilter] = useState('ALL');
    const [appealStatusFilter, setAppealStatusFilter] = useState('ALL');

    // Modais e seleções
    const [selectedGlosa, setSelectedGlosa] = useState<{ id: string; value: number; code: string } | null>(null);
    const [glosaToReverse, setGlosaToReverse] = useState<{ id: string; code: string; value: number } | null>(null);
    const [reversingGlosa, setReversingGlosa] = useState(false);
    const [isManualGlosaOpen, setIsManualGlosaOpen] = useState(false);
    const [historyEntity, setHistoryEntity] = useState<{ type: string; id: string; title: string } | null>(null);

    // Diálogos de Recursos C4-C8 + Confirmação Bancária FIN-01
    const [lossAppeal, setLossAppeal] = useState<{ id: string; protocol?: string } | null>(null);
    const [submitAppeal, setSubmitAppeal] = useState<{ id: string; protocol?: string } | null>(null);
    const [resultAppeal, setResultAppeal] = useState<any | null>(null);
    const [attachmentsAppeal, setAttachmentsAppeal] = useState<any | null>(null);
    const [confirmPaymentAppeal, setConfirmPaymentAppeal] = useState<any | null>(null);

    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    // =========================================================================
    // CONSULTA 1: Glosas Registradas
    // =========================================================================
    const { data: glosas, isLoading: isLoadingGlosas, refetch: refetchGlosas } = useQuery({
        queryKey: ['tiss-glosas', filterApplied],
        queryFn: async () => {
            const response = await fetch(`/api/tiss/glosas?startDate=${filterApplied.start}&endDate=${filterApplied.end}`);
            if (!response.ok) throw new Error('Erro ao buscar glosas');
            const result = await response.json();
            return result.data || [];
        },
    });

    // =========================================================================
    // CONSULTA 2: Recursos de Glosa (C1 - C8)
    // =========================================================================
    const { data: appealsData, isLoading: isLoadingAppeals, refetch: refetchAppeals } = useQuery({
        queryKey: ['tiss-appeals', appealStatusFilter, filterApplied],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (appealStatusFilter !== 'ALL') params.append('status', appealStatusFilter);
            params.append('start_date', filterApplied.start);
            params.append('end_date', filterApplied.end);

            const res = await fetch(`/api/tiss/appeals?${params.toString()}`);
            if (!res.ok) throw new Error('Erro ao buscar recursos de glosa');
            const result = await res.json();
            return result;
        },
    });

    const { data: operatorsList } = useQuery({
        queryKey: ['tiss-operators-for-appeals'],
        queryFn: async () => {
            const res = await fetch('/api/tiss/operators');
            if (!res.ok) return [];
            const j = await res.json();
            return j.data || j.operators || [];
        },
    });

    const eligibleGlosasForAppeal = (glosas || []).filter(
        (g: any) =>
            !g.is_irrecoverable &&
            g.can_appeal !== false &&
            (!g.status || g.status === 'OPEN') &&
            (!g.contest_status || g.contest_status === 'NONE' || g.contest_status === 'PENDENTE')
    );

    const handleOpenDossier = async (appealId: string) => {
        setLoadingDossierId(appealId);
        try {
            const res = await fetch(`/api/tiss/appeals/${appealId}/dossier`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao gerar dossiê probatório');
            }
            setDossierModalData(json.data);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao gerar dossiê probatório');
        } finally {
            setLoadingDossierId(null);
        }
    };

    const handleCreateAppealBatch = async () => {
        if (!newAppealInsuranceId) {
            toast.error('Selecione a operadora de saúde do recurso.');
            return;
        }
        if (newAppealGlosaIds.length === 0) {
            toast.error('Selecione ao menos uma glosa recuperável em aberto.');
            return;
        }
        setCreatingAppeal(true);
        try {
            const itemsPayload = newAppealGlosaIds.map((gid) => {
                const gl = (glosas || []).find((x: any) => x.id === gid);
                return {
                    glosa_id: gid,
                    contested_value: Number(gl?.glosa_value || 0),
                    item_reason: newAppealReason.trim() || `Contestação técnica e documental referente à glosa ANS ${gl?.glosa_code || ''}`,
                };
            });
            const res = await fetch('/api/tiss/appeals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    health_insurance_id: newAppealInsuranceId,
                    general_reason: newAppealReason.trim() || 'Recurso de Glosa consolidado com Dossiê Probatório CliniGo.',
                    items: itemsPayload,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao criar lote de recurso');
            }
            toast.success('Lote de Recurso de Glosa criado com sucesso!');
            setNewAppealOpen(false);
            setNewAppealGlosaIds([]);
            setNewAppealReason('');
            refetchAppeals();
            refetchGlosas();
        } catch (err: any) {
            toast.error(err?.message || 'Falha ao criar lote de recurso');
        } finally {
            setCreatingAppeal(false);
        }
    };

    const appealsList = appealsData?.data || [];
    const appealCounts = appealsData?.counts || {};

    const hasActiveFilter = startDate !== defaultStart || endDate !== defaultEnd;

    const handleApplyFilter = () => {
        setFilterApplied({ start: startDate, end: endDate });
        toast.success('Filtros aplicados com sucesso!');
    };

    const handleClearFilter = () => {
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        setFilterApplied({ start: defaultStart, end: defaultEnd });
        toast.info('Filtros removidos!');
    };

    // Desfazer glosa manual (R3) com modal formal de confirmação (sem window.confirm - UX-11 / Seção 12)
    const handleConfirmReverseGlosa = async () => {
        if (!glosaToReverse) return;
        setReversingGlosa(true);
        try {
            const res = await fetch(`/api/tiss/glosas/${glosaToReverse.id}`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Glosa estornada e saldo financeiro revertido com sucesso');
                setGlosaToReverse(null);
                refetchGlosas();
            } else {
                toast.error(data.error || 'Erro ao estornar glosa');
            }
        } catch {
            toast.error('Erro de conexão ao estornar glosa');
        } finally {
            setReversingGlosa(false);
        }
    };

    // Liberar recurso para envio (C6)
    const handleReleaseAppeal = async (appealId: string) => {
        try {
            const res = await fetch(`/api/tiss/appeals/${appealId}/release`, {
                method: 'POST',
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Recurso liberado para envio à operadora');
                refetchAppeals();
            } else {
                toast.error(data.error || 'Erro ao liberar recurso');
            }
        } catch {
            toast.error('Erro de conexão ao liberar recurso');
        }
    };

    // Exportação Excel
    const handleExportExcel = async () => {
        if (!glosas || glosas.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Glosas TISS');

            worksheet.columns = [
                { header: 'Código', key: 'code', width: 15 },
                { header: 'Descrição', key: 'desc', width: 40 },
                { header: 'Categoria', key: 'cat', width: 20 },
                { header: 'Valor Glosado', key: 'val', width: 20 },
                { header: 'Status', key: 'status', width: 20 },
            ];

            glosas.forEach((g: any) => {
                worksheet.addRow({
                    code: g.glosa_code || '-',
                    desc: g.glosa_description,
                    cat: g.category,
                    val: g.glosa_value,
                    status: g.contest_status || 'Sem Recurso',
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `glosas-tiss-${filterApplied.start}-a-${filterApplied.end}.xlsx`;
            a.click();
            toast.success('Excel exportado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar Excel');
        } finally {
            setIsExportingExcel(false);
        }
    };

    // Exportação PDF
    const handleExportPDF = async () => {
        if (!glosas || glosas.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');

            const doc = new jsPDF();
            doc.text(`Relatório de Glosas TISS - ${format(new Date(filterApplied.start), 'dd/MM/yyyy')} a ${format(new Date(filterApplied.end), 'dd/MM/yyyy')}`, 14, 15);

            const tableData = glosas.map((g: any) => [
                g.glosa_code || '-',
                g.glosa_description.substring(0, 40) + '...',
                g.category,
                formatCurrency(g.glosa_value),
                g.contest_status || 'Sem Recurso',
            ]);

            (doc as any).autoTable({
                head: [['Código', 'Descrição', 'Categoria', 'Valor Glosado', 'Status']],
                body: tableData,
                startY: 25,
            });

            doc.save(`glosas-tiss-${filterApplied.start}-a-${filterApplied.end}.pdf`);
            toast.success('PDF exportado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar PDF');
        } finally {
            setIsExportingPDF(false);
        }
    };

    // Contadores por status para Glosas F1
    const glosaStatusOptions: StatusFilterOption[] = [
        { value: 'ALL', label: 'Todas as Glosas', count: glosas?.length || 0 },
        { value: 'NONE', label: 'Sem Recurso', count: glosas?.filter((g: any) => !g.contest_status || g.contest_status === 'NONE').length || 0 },
        { value: 'IN_REVIEW', label: 'Em Análise', count: glosas?.filter((g: any) => g.contest_status === 'IN_REVIEW').length || 0 },
        { value: 'REVERSED', label: 'Revertidas', count: glosas?.filter((g: any) => g.contest_status === 'REVERSED').length || 0 },
        { value: 'CLOSED', label: 'Negadas / Fechadas', count: glosas?.filter((g: any) => g.contest_status === 'CLOSED').length || 0 },
    ];

    // Contadores por status para Recursos F1
    const appealStatusOptions: StatusFilterOption[] = [
        { value: 'ALL', label: 'Todos os Recursos', count: appealCounts.total || 0 },
        { value: 'IN_PREPARATION', label: 'Em Preparação', count: appealCounts.in_preparation || 0 },
        { value: 'RELEASED', label: 'Liberados', count: appealCounts.released || 0 },
        { value: 'SENT', label: 'Enviados', count: appealCounts.sent || 0 },
        { value: 'ACCEPTED', label: 'Acatados', count: appealCounts.accepted || 0 },
        { value: 'PARTIAL', label: 'Parciais', count: appealCounts.partial || 0 },
        { value: 'DENIED', label: 'Negados', count: appealCounts.denied || 0 },
        { value: 'FINISHED', label: 'Finalizados', count: appealCounts.finished || 0 },
    ];

    // Filtrar glosas na visualização
    const filteredGlosas = (glosas || []).filter((g: any) => {
        if (glosaStatusFilter === 'ALL') return true;
        if (glosaStatusFilter === 'NONE') return !g.contest_status || g.contest_status === 'NONE';
        return g.contest_status === glosaStatusFilter;
    });

    // Calcular estatísticas
    const stats = glosas ? {
        total: glosas.length,
        totalValue: glosas.reduce((sum: number, g: any) => sum + g.glosa_value, 0),
        canAppeal: glosas.filter((g: any) => g.can_appeal && (!g.contest_status || g.contest_status === 'NONE')).length,
        byCategory: glosas.reduce((acc: any, g: any) => {
            acc[g.category] = (acc[g.category] || 0) + 1;
            return acc;
        }, {}),
    } : null;

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Glosas e Recursos TISS</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestão analítica de glosas, recursos formais C1 a C8 e liquidação de repasse
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <TissPresetHelpButton
                        topicKey="tiss-controle-glosas"
                        triggerLabel="Ajuda Glosas"
                        onBeforeHighlightStep={() => setActiveTab('totvs_3niveis')}
                    />
                    <Button
                        variant="outline"
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                        onClick={() => {
                            refetchGlosas();
                            refetchAppeals();
                            toast.success('Dados atualizados!');
                        }}
                        disabled={isLoadingGlosas || isLoadingAppeals}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${(isLoadingGlosas || isLoadingAppeals) ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                        onClick={handleExportExcel}
                        disabled={!glosas || glosas.length === 0 || isExportingExcel}
                    >
                        <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${isExportingExcel ? 'animate-pulse' : ''}`} />
                        <span>Exportar Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                        onClick={handleExportPDF}
                        disabled={!glosas || glosas.length === 0 || isExportingPDF}
                    >
                        <Download className={`w-3.5 h-3.5 shrink-0 ${isExportingPDF ? 'animate-bounce' : ''}`} />
                        <span>Exportar PDF</span>
                    </Button>
                    <Button
                        data-help-target="glosas-manual-btn"
                        onClick={() => setIsManualGlosaOpen(true)}
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none bg-primary"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Lançar Glosa Manual (R3)</span>
                    </Button>
                </div>
            </div>

            {/* Abas Principais: Controle 3 Níveis vs Glosas vs Recursos */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
                <TabsList className="bg-muted/80 p-1 flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="totvs_3niveis" data-help-target="glosas-tab-3niveis" className="gap-2 min-h-[44px]">
                        <Layers className="w-4 h-4" />
                        Controle de Glosas (3 Níveis)
                    </TabsTrigger>
                    <TabsTrigger value="glosas" className="gap-2 min-h-[44px]">
                        <AlertCircle className="w-4 h-4" />
                        Glosas Registradas
                        <Badge variant="secondary" className="ml-1 font-mono text-[11px]">
                            {glosas?.length || 0}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="recursos" data-help-target="glosas-tab-recursos" className="gap-2 min-h-[44px]">
                        <Scale className="w-4 h-4" />
                        Recursos de Glosa (C1 - C8)
                        <Badge variant="secondary" className="ml-1 font-mono text-[11px]">
                            {appealsList?.length || 0}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* ABA 0: CONTROLE DE GLOSAS EM 3 NÍVEIS (PADRÃO TOTVS RM SAÚDE) */}
                <TabsContent value="totvs_3niveis" className="space-y-4">
                    {level3GuideId ? (
                        <GlosaLevel3AccountEditor
                            guideId={level3GuideId}
                            onBack={() => setLevel3GuideId(null)}
                            onRefreshParent={() => {
                                refetchGlosas();
                                refetchAppeals();
                            }}
                        />
                    ) : level2BatchId ? (
                        <GlosaLevel2Accounts
                            batchId={level2BatchId}
                            onBack={() => setLevel2BatchId(null)}
                            onOpenAccount={(gid) => setLevel3GuideId(gid)}
                            onRefreshParent={() => {
                                refetchGlosas();
                                refetchAppeals();
                            }}
                        />
                    ) : (
                        <GlosaLevel1Batches
                            onEnterBatch={(bid) => {
                                setLevel3GuideId(null);
                                setLevel2BatchId(bid);
                            }}
                            onJumpToAccount={(bid, gid) => {
                                setLevel2BatchId(bid);
                                setLevel3GuideId(gid);
                            }}
                            onRefreshParent={() => {
                                refetchGlosas();
                                refetchAppeals();
                            }}
                        />
                    )}
                </TabsContent>

                {/* Filtro de Período Geral (exibido nas abas Glosas Registradas e Recursos) */}
                {activeTab !== 'totvs_3niveis' && (
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                            <div className="w-full md:w-auto">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Inicial</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-10 min-h-[40px] text-xs"
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Final</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-10 min-h-[40px] text-xs"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <Button
                                    onClick={handleApplyFilter}
                                    disabled={isLoadingGlosas || isLoadingAppeals}
                                    className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Aplicar Filtro</span>
                                </Button>
                                {hasActiveFilter && (
                                    <Button
                                        variant="outline"
                                        onClick={handleClearFilter}
                                        className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span>Limpar Filtros</span>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ABA 1: GLOSAS */}
                <TabsContent value="glosas" className="space-y-6">
                    {/* Stats */}
                    {isLoadingGlosas ? (
                        <div className="grid gap-4 md:grid-cols-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                        </div>
                    ) : stats ? (
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Total de Glosas</CardDescription>
                                    <CardTitle className="text-3xl">{stats.total}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground">
                                        {stats.canAppeal} passíveis de recurso
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Valor Glosado Total</CardDescription>
                                    <CardTitle className="text-3xl">
                                        {formatCurrency(stats.totalValue)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center text-xs text-destructive">
                                        <TrendingDown className="mr-1 h-3 w-3" />
                                        Impacto a recuperar
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Principal Categoria</CardDescription>
                                    <CardTitle className="text-lg">
                                        {Object.keys(stats.byCategory)[0] || 'N/A'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground">
                                        {stats.byCategory[Object.keys(stats.byCategory)[0]] || 0} ocorrências
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription>Recursos Possíveis</CardDescription>
                                    <CardTitle className="text-3xl">{stats.canAppeal}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground">
                                        Prazo ANS ativo
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}

                    {/* Filtros por Status F1 Glosas */}
                    <div className="flex items-center justify-between">
                        <StatusFilterTabs
                            value={glosaStatusFilter}
                            onValueChange={setGlosaStatusFilter}
                            options={glosaStatusOptions}
                            urlParamKey="glosa_status"
                        />
                    </div>

                    {/* Tabela de Glosas */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Glosas Registradas</CardTitle>
                            <CardDescription>Auditoria detalhada de valores glosados por guia e item</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingGlosas ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : filteredGlosas && filteredGlosas.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código ANS</TableHead>
                                            <TableHead>Descrição do Motivo</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead className="text-right">Valor Glosado</TableHead>
                                            <TableHead>Status Recurso</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGlosas.map((glosa: any) => (
                                            <TableRow key={glosa.id}>
                                                <TableCell className="font-mono text-sm font-semibold">
                                                    {glosa.glosa_code || '-'}
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    <p className="text-sm font-medium text-foreground">{glosa.glosa_description}</p>
                                                    {glosa.guide_number && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">Guia: {glosa.guide_number}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{glosa.category}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-destructive font-mono">
                                                    -{formatCurrency(glosa.glosa_value)}
                                                </TableCell>
                                                <TableCell>
                                                    {glosa.contest_status === 'REVERSED' ? (
                                                        <Badge className="bg-emerald-600">Revertida</Badge>
                                                    ) : glosa.contest_status === 'IN_REVIEW' ? (
                                                        <Badge className="bg-amber-500">Em Análise</Badge>
                                                    ) : glosa.contest_status === 'CLOSED' ? (
                                                        <Badge variant="destructive">Recurso Negado</Badge>
                                                    ) : glosa.is_irrecoverable || !glosa.can_appeal ? (
                                                        <Badge variant="destructive">Irrecuperável (Recurso Bloqueado)</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Sem Recurso</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Histórico F2 */}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setHistoryEntity({
                                                                type: 'tiss_glosa',
                                                                id: glosa.id,
                                                                title: `Histórico da Glosa ${glosa.glosa_code || ''}`,
                                                            })}
                                                            className="h-9 px-3 text-xs font-medium gap-1.5"
                                                            title="Ver histórico e auditoria F2"
                                                        >
                                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                            Histórico
                                                        </Button>

                                                        {!glosa.is_irrecoverable && glosa.can_appeal && (glosa.status === 'OPEN' || !glosa.status) && (!glosa.contest_status || glosa.contest_status === 'NONE' || glosa.contest_status === 'PENDENTE') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setSelectedGlosa({
                                                                    id: glosa.id,
                                                                    code: glosa.glosa_code,
                                                                    value: glosa.glosa_value,
                                                                })}
                                                                className="h-9 px-3 text-xs font-medium gap-1.5"
                                                            >
                                                                <Scale className="h-3.5 h-3.5 text-primary" />
                                                                Recorrer
                                                            </Button>
                                                        )}

                                                        {/* Exclusão/Estorno de Glosa Manual R3 */}
                                                        {(!glosa.contest_status || glosa.contest_status === 'NONE' || glosa.contest_status === 'PENDENTE') && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    setGlosaToReverse({
                                                                        id: glosa.id,
                                                                        code: glosa.glosa_code || 'N/I',
                                                                        value: Number(glosa.glosa_value || 0),
                                                                    })
                                                                }
                                                                className="min-h-[44px] text-xs text-destructive hover:bg-destructive/10"
                                                                title="Estornar glosa manual (R3)"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                    <h3 className="font-semibold text-base">Nenhuma glosa registrada</h3>
                                    <p className="text-muted-foreground text-xs mt-1">
                                        Não foram encontradas glosas para os filtros selecionados.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 2: RECURSOS DE GLOSA (C1 - C8) */}
                    <TabsContent value="recursos" className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div data-help-target="glosas-recursos-status-tabs">
                                <StatusFilterTabs
                                    value={appealStatusFilter}
                                    onValueChange={setAppealStatusFilter}
                                    options={appealStatusOptions}
                                    urlParamKey="appeal_status"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <TissPresetHelpButton
                                    topicKey="tiss-recursos-dossie"
                                    triggerLabel="Ajuda Recursos"
                                    onBeforeHighlightStep={() => setActiveTab('recursos')}
                                />
                                <Button
                                    type="button"
                                    data-help-target="glosas-recursos-new-btn"
                                    onClick={() => setNewAppealOpen(true)}
                                    className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Novo Lote de Recurso (C1)
                                </Button>
                            </div>
                        </div>

                        {/* Banner explicativo FIN-01: Separação Acato × Crédito Bancário */}
                        <div
                            data-help-target="glosas-acato-credito"
                            className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                            <div className="flex items-start gap-2.5">
                                <Landmark className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-slate-900">
                                        Controle Acato × Crédito Bancário (FIN-01 / KPI-06)
                                    </span>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                                        Ao registrar um recurso como Acatado ou Parcial, o valor entra como acato pendente até a confirmação do depósito em conta (com campo opcional para retenções ISS/IRRF/CSRF na fonte).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Recursos de Glosa */}
                        <Card data-help-target="glosas-recursos-table">
                            <CardHeader>
                            <CardTitle>Recursos de Glosa (C1 - C8)</CardTitle>
                            <CardDescription>
                                Processos de contestação agrupados por operadora, controle de prazos SLA e liquidação financeira
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingAppeals ? (
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : appealsList && appealsList.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Protocolo / ID</TableHead>
                                            <TableHead>Operadora</TableHead>
                                            <TableHead>Itens / Glosado</TableHead>
                                            <TableHead>Valor Recursado</TableHead>
                                            <TableHead>Acatado / Creditado</TableHead>
                                            <TableHead>Prazo Limite</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {appealsList.map((appeal: any) => {
                                            const isExpired = appeal.deadline_date && new Date(appeal.deadline_date) < new Date() && appeal.status !== 'FINISHED';
                                            const acceptedVal = Number(appeal.accepted_value ?? appeal.recovered_value ?? appeal.total_recovered_value ?? 0);
                                            const bankReceivedVal = Number(appeal.bank_received_value ?? 0);
                                            const taxWithheldVal = Number(appeal.tax_withheld_value ?? 0);
                                            const pendingCredit = Math.max(0, Number((acceptedVal - bankReceivedVal - taxWithheldVal).toFixed(2)));
                                            const canConfirmBankCredit =
                                                (appeal.status === 'ACCEPTED' || appeal.status === 'PARTIAL') &&
                                                pendingCredit > 0.009;
                                            return (
                                                <TableRow key={appeal.id}>
                                                    <TableCell className="font-mono text-xs font-semibold">
                                                        {appeal.protocol_number || appeal.id.slice(0, 8)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium text-sm text-foreground">
                                                            {appeal.health_insurance?.name || 'Operadora'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="font-semibold">{appeal.items?.length || 0} itens</span>
                                                        <span className="text-muted-foreground block font-mono">
                                                            {formatCurrency(appeal.total_glosa_value)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="font-mono font-medium text-sm text-foreground">
                                                        {formatCurrency(appeal.contested_value)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        <span className="font-semibold text-emerald-700 block">
                                                            Acatado: {formatCurrency(acceptedVal)}
                                                        </span>
                                                        {acceptedVal > 0 && (
                                                            <span className="text-[11px] text-slate-600 block">
                                                                Creditado: {formatCurrency(bankReceivedVal)}
                                                                {taxWithheldVal > 0 ? ` (Ret.: ${formatCurrency(taxWithheldVal)})` : ''}
                                                            </span>
                                                        )}
                                                        {canConfirmBankCredit && (
                                                            <Badge variant="outline" className="mt-1 text-[10px] py-0 px-1.5 bg-amber-50 text-amber-800 border-amber-200">
                                                                Aguardando Crédito ({formatCurrency(pendingCredit)})
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {appeal.deadline_date ? (
                                                            <div>
                                                                <time dateTime={appeal.deadline_date}>
                                                                    {format(new Date(appeal.deadline_date), 'dd/MM/yyyy', { locale: ptBR })}
                                                                </time>
                                                                {isExpired && (
                                                                    <Badge variant="destructive" className="ml-1 text-[10px] py-0 px-1">
                                                                        Vencido
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {appeal.status === 'IN_PREPARATION' ? (
                                                            <Badge variant="outline" className="text-amber-700 border-amber-300">Em Preparação</Badge>
                                                        ) : appeal.status === 'RELEASED' ? (
                                                            <Badge variant="outline" className="text-blue-700 border-blue-300">Liberado</Badge>
                                                        ) : appeal.status === 'SENT' ? (
                                                            <Badge variant="outline" className="text-purple-700 border-purple-300">Enviado</Badge>
                                                        ) : appeal.status === 'ACCEPTED' ? (
                                                            <Badge className="bg-emerald-600">Acatado</Badge>
                                                        ) : appeal.status === 'PARTIAL' ? (
                                                            <Badge className="bg-amber-600">Parcial</Badge>
                                                        ) : appeal.status === 'DENIED' ? (
                                                            <Badge variant="destructive">Negado</Badge>
                                                        ) : appeal.status === 'DEFINITIVE_LOSS' ? (
                                                            <Badge variant="destructive">Perda Definitiva</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">{appeal.status}</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* F2: HistoryDrawer */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setHistoryEntity({
                                                                    type: 'tiss_appeal',
                                                                    id: appeal.id,
                                                                    title: `Histórico do Recurso ${appeal.protocol_number || ''}`,
                                                                })}
                                                                className="h-9 px-3 text-xs font-medium gap-1.5"
                                                                title="Trilha de auditoria F2"
                                                            >
                                                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                                Histórico
                                                            </Button>

                                                            {/* Dossiê Probatório Automático */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={loadingDossierId === appeal.id}
                                                                onClick={() => handleOpenDossier(appeal.id)}
                                                                className="h-9 px-3 text-xs font-medium gap-1.5"
                                                                title="Compilar Dossiê Probatório Automático"
                                                            >
                                                                <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                                                                {loadingDossierId === appeal.id ? 'Gerando...' : 'Dossiê Probatório'}
                                                            </Button>

                                                            {/* XML Recurso ANS */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => window.open(`/api/tiss/appeals/${appeal.id}/xml`, '_blank')}
                                                                className="h-9 px-3 text-xs font-medium gap-1.5"
                                                                title="Exportar XML TISS de Recurso de Glosa"
                                                            >
                                                                <FileCode2 className="w-3.5 h-3.5 text-slate-700" />
                                                                XML Recurso
                                                            </Button>

                                                            {/* C4: Anexos */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setAttachmentsAppeal(appeal)}
                                                                className="h-9 px-3 text-xs font-medium gap-1.5"
                                                                title="Anexos do recurso C4"
                                                            >
                                                                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                                                                Anexos ({appeal.attachments?.length || 0})
                                                            </Button>

                                                            {/* C6: Liberar recurso */}
                                                            {appeal.status === 'IN_PREPARATION' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleReleaseAppeal(appeal.id)}
                                                                    disabled={isExpired}
                                                                    className="h-9 px-3 text-xs font-medium gap-1.5 text-blue-700 hover:bg-blue-50"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Liberar
                                                                </Button>
                                                            )}

                                                            {/* C7: Registrar envio */}
                                                            {appeal.status === 'RELEASED' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setSubmitAppeal({ id: appeal.id, protocol: appeal.protocol_number })}
                                                                    className="h-9 px-3 text-xs font-medium gap-1.5 text-purple-700 hover:bg-purple-50"
                                                                >
                                                                    <Send className="w-3.5 h-3.5" />
                                                                    Registrar Envio
                                                                </Button>
                                                            )}

                                                            {/* C8: Registrar resultado e liquidação */}
                                                            {appeal.status === 'SENT' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setResultAppeal(appeal)}
                                                                    className="h-9 px-3 text-xs font-medium gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Registrar Resultado
                                                                </Button>
                                                            )}

                                                            {/* FIN-01 / KPI-06: Confirmar Crédito Bancário Real + Retenções */}
                                                            {canConfirmBankCredit && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setConfirmPaymentAppeal(appeal)}
                                                                    className="h-9 px-3 text-xs font-medium gap-1.5 bg-[#155E4B] hover:bg-[#0F493A] text-white"
                                                                    title="Confirmar depósito bancário do valor acatado"
                                                                >
                                                                    <Landmark className="w-3.5 h-3.5" />
                                                                    Confirmar Crédito
                                                                </Button>
                                                            )}

                                                            {/* C5: Registrar perda (se vencido ou em preparação) */}
                                                            {(appeal.status === 'IN_PREPARATION' || isExpired) && appeal.status !== 'DEFINITIVE_LOSS' && appeal.status !== 'FINISHED' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setLossAppeal({ id: appeal.id, protocol: appeal.protocol_number })}
                                                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                                                    title="Registrar perda definitiva C5"
                                                                >
                                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Scale className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                    <h3 className="font-semibold text-base">Nenhum recurso de glosa cadastrado</h3>
                                    <p className="text-muted-foreground text-xs mt-1">
                                        Inicie um recurso de glosa a partir da lista de glosas registradas.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal de Abrir Recurso C1 (Contestação) */}
            <ContestGlosaDialog
                open={selectedGlosa !== null}
                onOpenChange={(open) => !open && setSelectedGlosa(null)}
                glosaId={selectedGlosa?.id || null}
                glosaCode={selectedGlosa?.code || ''}
                glosaValue={selectedGlosa?.value || 0}
                onSuccess={() => {
                    refetchGlosas();
                    refetchAppeals();
                }}
            />

            {/* Modais Operacionais de Glosas e Recursos (R3, C1-C8, Dossiê, F2) */}
                <>
                    {/* Modal de Lançar Glosa Manual R3 */}
                    <ManualGlosaDialog
                        open={isManualGlosaOpen}
                        onOpenChange={setIsManualGlosaOpen}
                        guide={null}
                        onSuccess={() => refetchGlosas()}
                    />

                    {/* Modal C5: Registrar Perda */}
                    <LossAppealDialog
                        open={lossAppeal !== null}
                        onOpenChange={(open) => !open && setLossAppeal(null)}
                        appealId={lossAppeal?.id || null}
                        protocolNumber={lossAppeal?.protocol}
                        onSuccess={() => {
                            refetchGlosas();
                            refetchAppeals();
                        }}
                    />

                    {/* Modal C7: Registrar Envio */}
                    <SubmitAppealDialog
                        open={submitAppeal !== null}
                        onOpenChange={(open) => !open && setSubmitAppeal(null)}
                        appealId={submitAppeal?.id || null}
                        protocolNumber={submitAppeal?.protocol}
                        onSuccess={() => refetchAppeals()}
                    />

                    {/* Modal C8: Registrar Parecer e Liquidação Financeira */}
                    <ResultAppealDialog
                        open={resultAppeal !== null}
                        onOpenChange={(open) => !open && setResultAppeal(null)}
                        appeal={resultAppeal}
                        onSuccess={() => {
                            refetchGlosas();
                            refetchAppeals();
                        }}
                    />

                    {/* Modal FIN-01: Confirmar Crédito Bancário do Acato + Retenções */}
                    <ConfirmAppealPaymentDialog
                        open={confirmPaymentAppeal !== null}
                        onOpenChange={(open) => !open && setConfirmPaymentAppeal(null)}
                        appeal={confirmPaymentAppeal}
                        onSuccess={() => {
                            refetchGlosas();
                            refetchAppeals();
                        }}
                    />

                    {/* Modal C4: Anexos do Recurso */}
                    <AttachmentsAppealDialog
                        open={attachmentsAppeal !== null}
                        onOpenChange={(open) => !open && setAttachmentsAppeal(null)}
                        appeal={attachmentsAppeal}
                        onSuccess={() => refetchAppeals()}
                    />

                    {/* Gaveta de Histórico F2 */}
                    {historyEntity && (
                        <HistoryDrawer
                            open={Boolean(historyEntity)}
                            onOpenChange={(open) => !open && setHistoryEntity(null)}
                            entityType={historyEntity.type}
                            entityId={historyEntity.id}
                            title={historyEntity.title}
                        />
                    )}

                    {/* Modal Novo Lote de Recurso (C1) — somente glosas recuperáveis */}
                    <Dialog open={newAppealOpen} onOpenChange={setNewAppealOpen}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Novo Lote de Recurso de Glosa (C1)</DialogTitle>
                                <DialogDescription className="text-xs">
                                    Apenas glosas em aberto e classificadas como recuperáveis estão disponíveis. Glosas marcadas como Irrecuperáveis são bloqueadas automaticamente.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <Label>Operadora de Saúde *</Label>
                                    <Select value={newAppealInsuranceId} onValueChange={setNewAppealInsuranceId}>
                                        <SelectTrigger className="min-h-[44px] mt-1 text-xs">
                                            <SelectValue placeholder="Selecione a operadora" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(operatorsList || []).map((op: any) => (
                                                <SelectItem key={op.id} value={op.id}>
                                                    {op.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Justificativa Geral do Recurso</Label>
                                    <Textarea
                                        value={newAppealReason}
                                        onChange={(e) => setNewAppealReason(e.target.value)}
                                        rows={2}
                                        placeholder="Fundamentação técnica e documental para a operadora..."
                                        className="mt-1 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Glosas Elegíveis (Recuperáveis e Abertas: {eligibleGlosasForAppeal.length})</Label>
                                    <div className="max-h-[240px] overflow-y-auto border border-border rounded-md divide-y divide-border">
                                        {eligibleGlosasForAppeal.length === 0 ? (
                                            <p className="p-6 text-center text-muted-foreground">
                                                Nenhuma glosa recuperável em aberto encontrada no período. Verifique se há glosas classificadas como Irrecuperáveis.
                                            </p>
                                        ) : (
                                            eligibleGlosasForAppeal.map((g: any) => (
                                                <label key={g.id} className="flex items-center justify-between gap-2 p-2.5 hover:bg-muted/30 cursor-pointer">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Checkbox
                                                            checked={newAppealGlosaIds.includes(g.id)}
                                                            onCheckedChange={(v) =>
                                                                setNewAppealGlosaIds((prev) =>
                                                                    v ? Array.from(new Set([...prev, g.id])) : prev.filter((x) => x !== g.id)
                                                                )
                                                            }
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="font-semibold truncate">
                                                                ANS {g.glosa_code} — {g.glosa_description}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                Guia {g.guide?.guide_number || g.guide_number || '-'} • {g.guide?.patient_name || ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono font-semibold text-rose-700 shrink-0">
                                                        {formatCurrency(Number(g.glosa_value || 0))}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setNewAppealOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="button" className="min-h-[44px]" onClick={handleCreateAppealBatch} disabled={creatingAppeal}>
                                    {creatingAppeal ? 'Criando...' : `Criar Lote de Recurso (${newAppealGlosaIds.length})`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Modal de Confirmação Auditada de Estorno de Glosa (UX-11 / Seção 12) */}
                    <Dialog open={Boolean(glosaToReverse)} onOpenChange={(o) => !o && !reversingGlosa && setGlosaToReverse(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-rose-700">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    Confirmar Estorno de Glosa
                                </DialogTitle>
                                <DialogDescription className="text-sm pt-1">
                                    Tem certeza que deseja estornar a glosa <strong>ANS {glosaToReverse?.code}</strong> no valor de{' '}
                                    <strong>{formatCurrency(glosaToReverse?.value || 0)}</strong>? O registro será marcado como estornado na trilha imutável e os totais da guia serão recalculados.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px]"
                                    disabled={reversingGlosa}
                                    onClick={() => setGlosaToReverse(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="min-h-[44px]"
                                    disabled={reversingGlosa}
                                    onClick={handleConfirmReverseGlosa}
                                >
                                    {reversingGlosa ? 'Estornando...' : 'Confirmar Estorno'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Modal Dossiê Probatório Automático */}
                    <Dialog open={Boolean(dossierModalData)} onOpenChange={(o) => !o && setDossierModalData(null)}>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    Dossiê Probatório Automático — Recurso {dossierModalData?.appeal_number}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Operadora: {dossierModalData?.health_insurance_name} •{' '}
                                    {dossierModalData?.summary?.biometric_evidences || 0} comprovação(ões) de check-in e{' '}
                                    {dossierModalData?.summary?.signed_evolutions || 0} evolução(ões) assinada(s).
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 text-xs">
                                {(dossierModalData?.items || []).map((item: any) => (
                                    <div key={item.item_id} className="rounded-md border border-border p-3 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold">
                                                Guia {item.guide_number} — {item.patient_name} ({item.tuss_code})
                                            </span>
                                            <span className="font-mono font-semibold text-emerald-700">
                                                {formatCurrency(item.contested_value)}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground">
                                            Glosa ANS {item.glosa_code}: {item.glosa_description}
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Badge variant="outline" className={item.attendance_proof?.checkin_confirmed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}>
                                                Check-in/Biometria: {item.attendance_proof?.checkin_confirmed ? 'Confirmado' : 'Pendente'}
                                            </Badge>
                                            <Badge variant="outline" className={item.clinical_evolution?.exists ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}>
                                                Evolução Clínica: {item.clinical_evolution?.is_signed ? 'Assinada' : item.clinical_evolution?.exists ? 'Registrada' : 'Pendente'}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground pt-1">
                                            {item.clinical_evolution?.summary_excerpt}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <DialogFooter className="gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px] gap-1.5"
                                    onClick={() => dossierModalData?.appeal_id && window.open(`/api/tiss/appeals/${dossierModalData.appeal_id}/xml`, '_blank')}
                                >
                                    <FileCode2 className="w-4 h-4" />
                                    Baixar XML Recurso ANS
                                </Button>
                                <Button type="button" className="min-h-[44px]" onClick={() => setDossierModalData(null)}>
                                    Fechar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
        </div>
    );
}
