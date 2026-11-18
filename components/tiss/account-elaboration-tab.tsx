'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    CheckCircle2,
    FileEdit,
    FileText,
    Keyboard,
    Lock,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { TissPresetHelpButton } from '@/components/tiss/tiss-contextual-help';
import type { AccountItemGroup } from '@/types/tiss';

interface AccountRow {
    id: string;
    guide_number: string;
    patient_name: string;
    patient_card_number: string;
    patient_card_validity: string | null;
    procedure_code: string;
    procedure_name: string;
    total_value: number;
    execution_date: string;
    status: string;
    billing_stage: 'ELABORACAO' | 'LIBERADA' | 'EM_LOTE' | 'FATURADA' | 'EM_REVISAO_GLOSA' | 'FINALIZADA';
    doctor_id: string | null;
    doctor_name: string;
    health_insurance_id: string | null;
    insurance_name: string;
    authorization_code: string | null;
    items_count: number;
    batch_id: string | null;
    batch?: { id: string; batch_number: string; status: string } | null;
    shield: {
        status: 'OK' | 'WARNING' | 'BLOCKED';
        blockers: string[];
        warnings: string[];
        biometric_ok: boolean;
        evolution_ok: boolean;
        card_ok: boolean;
        price_ok: boolean;
    };
}

interface AccountDetailData {
    guide: any;
    procedures: any[];
    appointment: any;
    medical_record: any;
}

const GROUP_OPTIONS: Array<{ value: AccountItemGroup; label: string }> = [
    { value: 'HONORARIOS', label: 'Honorários / Sessões' },
    { value: 'TAXAS', label: 'Taxas e Serviços' },
    { value: 'MATERIAIS', label: 'Materiais e Medicamentos' },
    { value: 'DIAGNOSE', label: 'Diagnose e Terapia' },
];

const STAGE_BADGES: Record<string, { label: string; className: string }> = {
    ELABORACAO: { label: 'Em Elaboração', className: 'bg-amber-50 text-amber-800 border-amber-200' },
    LIBERADA: { label: 'Liberada para Faturamento', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    EM_LOTE: { label: 'Em Lote', className: 'bg-blue-50 text-blue-800 border-blue-200' },
    FATURADA: { label: 'Faturada', className: 'bg-slate-100 text-slate-800 border-slate-300' },
    EM_REVISAO_GLOSA: { label: 'Em Revisão de Glosa', className: 'bg-rose-50 text-rose-800 border-rose-200' },
    FINALIZADA: { label: 'Finalizada', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
};

function formatCurrencyBR(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

export function AccountElaborationTab({ onUpdated }: { onUpdated?: () => void }) {
    const [accounts, setAccounts] = useState<AccountRow[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [operators, setOperators] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [actionBusy, setActionBusy] = useState(false);

    // Filtros
    const [stageFilter, setStageFilter] = useState<string>('ALL');
    const [insuranceFilter, setInsuranceFilter] = useState<string>('ALL');
    const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Seleção em lote
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Editor de Conta
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorData, setEditorData] = useState<AccountDetailData | null>(null);
    const [activeGroupTab, setActiveGroupTab] = useState<string>('HONORARIOS');
    const [formState, setFormState] = useState({
        authorization_code: '',
        cid10_code: '',
        patient_card_number: '',
        patient_card_validity: '',
        health_insurance_id: '',
        account_notes: '',
    });

    // Inclusão de Item (+ Incluir)
    const [includeModalOpen, setIncludeModalOpen] = useState(false);
    const [newItemForm, setNewItemForm] = useState({
        procedure_code: '',
        procedure_name: '',
        item_group: 'HONORARIOS' as AccountItemGroup,
        unit_measure: 'UN',
        quantity: '1',
        unit_value: '0',
    });

    // Estorno de Item (AlertDialog)
    const [reverseItemTarget, setReverseItemTarget] = useState<any | null>(null);

    // Dados do Atendimento / Prontuário
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

    const loadOperators = useCallback(async () => {
        try {
            const res = await fetch('/api/tiss/operators');
            if (res.ok) {
                const json = await res.json();
                setOperators(json.data || json.operators || []);
            }
        } catch {
            // Ignora falha silenciosa de listagem auxiliar
        }
    }, []);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (stageFilter !== 'ALL') params.set('billing_stage', stageFilter);
            if (insuranceFilter !== 'ALL') params.set('health_insurance_id', insuranceFilter);
            if (doctorFilter !== 'ALL') params.set('doctor_id', doctorFilter);
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());

            const res = await fetch(`/api/tiss/accounts?${params.toString()}`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Falha ao carregar contas médicas');
            }
            setAccounts(json.data || []);
            setCounts(json.counts || {});
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao carregar contas em elaboração');
        } finally {
            setLoading(false);
        }
    }, [stageFilter, insuranceFilter, doctorFilter, startDate, endDate, searchQuery]);

    useEffect(() => {
        loadOperators();
    }, [loadOperators]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const doctorOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const a of accounts) {
            if (a.doctor_id && a.doctor_name) map.set(a.doctor_id, a.doctor_name);
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [accounts]);

    const openAccountEditor = async (guideId: string) => {
        setActionBusy(true);
        try {
            const res = await fetch(`/api/tiss/accounts/${guideId}`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao abrir conta');
            }
            const data: AccountDetailData = json.data;
            setEditorData(data);
            setFormState({
                authorization_code: data.guide.authorization_code || '',
                cid10_code: data.guide.cid10_code || '',
                patient_card_number: data.guide.patient_card_number || '',
                patient_card_validity: data.guide.patient_card_validity || '',
                health_insurance_id: data.guide.health_insurance_id || '',
                account_notes: data.guide.account_notes || '',
            });
            setActiveGroupTab('HONORARIOS');
            setEditorOpen(true);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao abrir editor da conta');
        } finally {
            setActionBusy(false);
        }
    };

    const handleSaveAccount = async () => {
        if (!editorData?.guide?.id) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/tiss/accounts/${editorData.guide.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formState,
                    health_insurance_id: formState.health_insurance_id || null,
                    patient_card_validity: formState.patient_card_validity || null,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível salvar a conta');
            }
            toast.success('Conta médica gravada com sucesso.');
            await openAccountEditor(editorData.guide.id);
            await fetchAccounts();
            onUpdated?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao gravar alterações');
        } finally {
            setActionBusy(false);
        }
    };

    const handleReleaseOrReverse = useCallback(
        async (guideId: string, action: 'release' | 'reverse', force = false) => {
            setActionBusy(true);
            try {
                const res = await fetch(`/api/tiss/accounts/${guideId}/release`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, force }),
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.error || 'Falha na operação de liberação');
                }
                toast.success(json.message || 'Status da conta atualizado.');
                if (editorOpen && editorData?.guide?.id === guideId) {
                    await openAccountEditor(guideId);
                }
                await fetchAccounts();
                onUpdated?.();
            } catch (err: any) {
                toast.error(err?.message || 'Erro ao atualizar liberação da conta');
            } finally {
                setActionBusy(false);
            }
        },
        [editorOpen, editorData, fetchAccounts, onUpdated]
    );

    // Atalho oficial Ctrl+L no editor aberto
    useEffect(() => {
        if (!editorOpen || !editorData?.guide?.id) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                if (editorData.guide.billing_stage === 'ELABORACAO') {
                    handleReleaseOrReverse(editorData.guide.id, 'release');
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [editorOpen, editorData, handleReleaseOrReverse]);

    const handleBulkRelease = async () => {
        if (selectedIds.length === 0) return;
        setActionBusy(true);
        try {
            const res = await fetch('/api/tiss/accounts/bulk-release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guide_ids: selectedIds }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao liberar contas selecionadas');
            }
            toast.success(json.message);
            setSelectedIds([]);
            await fetchAccounts();
            onUpdated?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro na liberação em lote');
        } finally {
            setActionBusy(false);
        }
    };

    const handleAddItem = async () => {
        if (!editorData?.guide?.id) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/tiss/accounts/${editorData.guide.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    procedure_code: newItemForm.procedure_code,
                    procedure_name: newItemForm.procedure_name,
                    item_group: newItemForm.item_group,
                    unit_measure: newItemForm.unit_measure,
                    quantity: Number(newItemForm.quantity) || 1,
                    unit_value: Number(newItemForm.unit_value) || 0,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao incluir item');
            }
            toast.success('Item incluído na conta médica.');
            setIncludeModalOpen(false);
            setNewItemForm({
                procedure_code: '',
                procedure_name: '',
                item_group: (GROUP_OPTIONS.some((g) => g.value === activeGroupTab)
                    ? activeGroupTab
                    : 'HONORARIOS') as AccountItemGroup,
                unit_measure: 'UN',
                quantity: '1',
                unit_value: '0',
            });
            await openAccountEditor(editorData.guide.id);
            await fetchAccounts();
            onUpdated?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao incluir item');
        } finally {
            setActionBusy(false);
        }
    };

    const handleConfirmReverseItem = async () => {
        if (!editorData?.guide?.id || !reverseItemTarget) return;
        setActionBusy(true);
        try {
            const res = await fetch(`/api/tiss/accounts/${editorData.guide.id}/items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: reverseItemTarget.id }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao estornar item');
            }
            toast.success('Item estornado com sucesso.');
            setReverseItemTarget(null);
            await openAccountEditor(editorData.guide.id);
            await fetchAccounts();
            onUpdated?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao estornar item');
        } finally {
            setActionBusy(false);
        }
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(accounts.filter((a) => a.billing_stage === 'ELABORACAO').map((a) => a.id));
    };

    const toggleRow = (id: string, checked: boolean) => {
        setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
    };

    const isEditableInModal = editorData?.guide?.billing_stage === 'ELABORACAO';
    const activeProcedures = (editorData?.procedures || []).filter((p) => p.status !== 'CANCELLED');
    const summaryByGroup = useMemo(() => {
        return GROUP_OPTIONS.map((grp) => {
            const grpItems = activeProcedures.filter((p) => (p.item_group || 'HONORARIOS') === grp.value);
            const sum = grpItems.reduce((acc, p) => acc + Number(p.total_value || 0), 0);
            return { ...grp, count: grpItems.length, total: sum };
        });
    }, [activeProcedures]);
    const grandTotalModal = summaryByGroup.reduce((acc, s) => acc + s.total, 0);

    return (
        <div className="space-y-4">
            {/* Cabeçalho Operacional + Botões */}
            <Card className="border border-border shadow-none">
                <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-foreground">
                            Elaboração e Liberação de Contas Médicas
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Audite carteirinhas, autorizações, evolução clínica e itens por grupo antes de liberar para Remessa XML.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <TissPresetHelpButton topicKey="tiss-elaboracao-contas" triggerLabel="Ajuda TISS" />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={fetchAccounts}
                            disabled={loading}
                            className="min-h-[44px] gap-2 text-xs font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleBulkRelease}
                            disabled={selectedIds.length === 0 || actionBusy}
                            className="min-h-[44px] gap-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Liberar Selecionadas em Lote ({selectedIds.length})
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Barra de Filtros e Pesquisa */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        <div className="lg:col-span-2">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                                Pesquisa Atendimento / Paciente
                            </Label>
                            <div className="relative">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Paciente, nº conta/guia, senha ou TUSS..."
                                    className="min-h-[44px] pl-9 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                            <Select value={stageFilter} onValueChange={setStageFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos ({counts.ALL ?? accounts.length})</SelectItem>
                                    <SelectItem value="ELABORACAO">Em Elaboração ({counts.ELABORACAO ?? 0})</SelectItem>
                                    <SelectItem value="LIBERADA">Liberada para Faturamento ({counts.LIBERADA ?? 0})</SelectItem>
                                    <SelectItem value="EM_LOTE">Em Lote ({counts.EM_LOTE ?? 0})</SelectItem>
                                    <SelectItem value="FATURADA">Faturada ({counts.FATURADA ?? 0})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Convênio</Label>
                            <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Convênios</SelectItem>
                                    {operators.map((op) => (
                                        <SelectItem key={op.id} value={op.id}>
                                            {op.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Profissional</Label>
                            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                                <SelectTrigger className="min-h-[44px] text-xs">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Profissionais</SelectItem>
                                    {doctorOptions.map((doc) => (
                                        <SelectItem key={doc.id} value={doc.id}>
                                            {doc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">De</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="min-h-[44px] text-xs px-2"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Até</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="min-h-[44px] text-xs px-2"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tabela Principal de Contas */}
                    <div className="rounded-md border border-border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase border-b border-border">
                                <tr>
                                    <th className="p-3 w-10 text-center">
                                        <Checkbox
                                            aria-label="Selecionar todas em elaboração"
                                            checked={
                                                accounts.filter((a) => a.billing_stage === 'ELABORACAO').length > 0 &&
                                                selectedIds.length === accounts.filter((a) => a.billing_stage === 'ELABORACAO').length
                                            }
                                            onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                                        />
                                    </th>
                                    <th className="p-3 text-left font-medium">Conta / Data</th>
                                    <th className="p-3 text-left font-medium">Paciente / Carteirinha</th>
                                    <th className="p-3 text-left font-medium">Convênio / Executante</th>
                                    <th className="p-3 text-left font-medium">Escudo Anti-Glosa</th>
                                    <th className="p-3 text-right font-medium">Valor Total</th>
                                    <th className="p-3 text-left font-medium">Status</th>
                                    <th className="p-3 text-right font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                                            Carregando contas médicas...
                                        </td>
                                    </tr>
                                ) : accounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-10 text-center text-xs text-muted-foreground">
                                            Nenhuma conta encontrada para os filtros selecionados. Atendimentos de convênio concluídos na recepção ou agenda entram automaticamente aqui em Em Elaboração.
                                        </td>
                                    </tr>
                                ) : (
                                    accounts.map((acc) => {
                                        const stageInfo = STAGE_BADGES[acc.billing_stage] || STAGE_BADGES.ELABORACAO;
                                        const allAlerts = [...acc.shield.blockers, ...acc.shield.warnings];

                                        return (
                                            <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        disabled={acc.billing_stage !== 'ELABORACAO'}
                                                        checked={selectedIds.includes(acc.id)}
                                                        onCheckedChange={(v) => toggleRow(acc.id, Boolean(v))}
                                                        aria-label={`Selecionar conta ${acc.guide_number}`}
                                                    />
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    <div className="font-mono text-xs font-semibold text-foreground">
                                                        {acc.guide_number}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {acc.execution_date
                                                            ? new Date(`${acc.execution_date}T12:00:00`).toLocaleDateString('pt-BR')
                                                            : '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-foreground text-xs">{acc.patient_name}</div>
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        Cart.: {acc.patient_card_number || 'Pendente'}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="text-xs font-medium text-foreground">{acc.insurance_name}</div>
                                                    <div className="text-[11px] text-muted-foreground">{acc.doctor_name}</div>
                                                </td>
                                                <td className="p-3 max-w-[260px]">
                                                    {acc.shield.status === 'OK' ? (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            Apta (Sem pendências)
                                                        </Badge>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <Badge
                                                                variant="outline"
                                                                className={`gap-1 text-[11px] ${
                                                                    acc.shield.status === 'BLOCKED'
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                                                }`}
                                                            >
                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                                {acc.shield.status === 'BLOCKED' ? 'Bloqueio Anti-Glosa' : 'Atenção'}
                                                            </Badge>
                                                            <p className="text-[11px] text-muted-foreground leading-tight">
                                                                {allAlerts.slice(0, 2).join('; ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <div className="font-semibold text-xs text-foreground">
                                                        {formatCurrencyBR(acc.total_value)}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {acc.items_count} {acc.items_count === 1 ? 'item' : 'itens'}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className={`text-[11px] font-medium ${stageInfo.className}`}>
                                                        {stageInfo.label}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="min-h-[44px] px-3 text-xs gap-1.5"
                                                            onClick={() => openAccountEditor(acc.id)}
                                                            disabled={actionBusy}
                                                        >
                                                            <FileEdit className="w-3.5 h-3.5" />
                                                            Abrir / Editar Conta
                                                        </Button>

                                                        {acc.billing_stage === 'ELABORACAO' && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="min-h-[44px] px-3 text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
                                                                onClick={() => handleReleaseOrReverse(acc.id, 'release')}
                                                                disabled={actionBusy}
                                                                title="Atalho no editor: Ctrl+L"
                                                            >
                                                                <Lock className="w-3.5 h-3.5" />
                                                                Liberar Conta
                                                            </Button>
                                                        )}

                                                        {acc.billing_stage === 'LIBERADA' && !acc.batch_id && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="min-h-[44px] px-3 text-xs gap-1.5"
                                                                onClick={() => handleReleaseOrReverse(acc.id, 'reverse')}
                                                                disabled={actionBusy}
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                                Estornar Liberação
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
                </CardContent>
            </Card>

            {/* Modal Editor Completo de Conta Médica (5 Abas TOTVS RM Saúde) */}
            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
                            <div>
                                <DialogTitle className="text-lg font-semibold">
                                    Conta Médica nº {editorData?.guide?.guide_number} — {editorData?.guide?.patient_name}
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    {isEditableInModal
                                        ? 'Conta Em Elaboração. Inclua/estorne itens nos 4 grupos e pressione Ctrl+L para encerrar e liberar.'
                                        : `Conta no estágio ${editorData?.guide?.billing_stage}. Modo somente leitura até estorno da liberação.`}
                                </DialogDescription>
                            </div>
                            <Badge
                                variant="outline"
                                className={
                                    STAGE_BADGES[editorData?.guide?.billing_stage || 'ELABORACAO']?.className || ''
                                }
                            >
                                {STAGE_BADGES[editorData?.guide?.billing_stage || 'ELABORACAO']?.label || 'Em Elaboração'}
                            </Badge>
                        </div>
                    </DialogHeader>

                    {editorData && (
                        <div className="space-y-4">
                            {/* Dados Cadastrais Editáveis */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-md border border-border p-3.5 bg-muted/20">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Nº Carteirinha</Label>
                                    <Input
                                        value={formState.patient_card_number}
                                        disabled={!isEditableInModal}
                                        onChange={(e) => setFormState((s) => ({ ...s, patient_card_number: e.target.value }))}
                                        className="min-h-[44px] mt-1 text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Validade Carteirinha</Label>
                                    <Input
                                        type="date"
                                        value={formState.patient_card_validity || ''}
                                        disabled={!isEditableInModal}
                                        onChange={(e) => setFormState((s) => ({ ...s, patient_card_validity: e.target.value }))}
                                        className="min-h-[44px] mt-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Senha de Autorização</Label>
                                    <Input
                                        value={formState.authorization_code}
                                        disabled={!isEditableInModal}
                                        onChange={(e) => setFormState((s) => ({ ...s, authorization_code: e.target.value }))}
                                        placeholder="Informe a senha TISS"
                                        className="min-h-[44px] mt-1 text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">CID-10 Principal</Label>
                                    <Input
                                        value={formState.cid10_code}
                                        disabled={!isEditableInModal}
                                        onChange={(e) => setFormState((s) => ({ ...s, cid10_code: e.target.value }))}
                                        placeholder="Ex: F84.0"
                                        className="min-h-[44px] mt-1 text-xs font-mono"
                                    />
                                </div>
                            </div>

                            {/* 5 Abas de Itens da Conta */}
                            <Tabs value={activeGroupTab} onValueChange={setActiveGroupTab}>
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                    <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
                                        {GROUP_OPTIONS.map((grp) => (
                                            <TabsTrigger
                                                key={grp.value}
                                                value={grp.value}
                                                className="min-h-[44px] text-xs font-medium px-3"
                                            >
                                                {grp.label}
                                            </TabsTrigger>
                                        ))}
                                        <TabsTrigger value="RESUMO" className="min-h-[44px] text-xs font-semibold px-3">
                                            Resumo Parcial / Total
                                        </TabsTrigger>
                                    </TabsList>

                                    {isEditableInModal && activeGroupTab !== 'RESUMO' && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                setNewItemForm((f) => ({
                                                    ...f,
                                                    item_group: activeGroupTab as AccountItemGroup,
                                                }));
                                                setIncludeModalOpen(true);
                                            }}
                                            className="min-h-[44px] gap-1.5 text-xs"
                                        >
                                            <Plus className="w-4 h-4" />
                                            + Incluir Item
                                        </Button>
                                    )}
                                </div>

                                {GROUP_OPTIONS.map((grp) => {
                                    const grpItems = activeProcedures.filter(
                                        (p) => (p.item_group || 'HONORARIOS') === grp.value
                                    );
                                    return (
                                        <TabsContent key={grp.value} value={grp.value} className="mt-2">
                                            <div className="rounded-md border border-border overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                                        <tr>
                                                            <th className="p-2.5 text-left">Código TUSS</th>
                                                            <th className="p-2.5 text-left">Descrição</th>
                                                            <th className="p-2.5 text-center">Qtde.</th>
                                                            <th className="p-2.5 text-right">Valor Unit.</th>
                                                            <th className="p-2.5 text-right">Total</th>
                                                            <th className="p-2.5 text-right">Estorno</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {grpItems.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                                                    Nenhum lançamento neste grupo ({grp.label}).
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            grpItems.map((item: any) => (
                                                                <tr key={item.id}>
                                                                    <td className="p-2.5 font-mono font-medium">{item.procedure_code}</td>
                                                                    <td className="p-2.5">{item.procedure_name}</td>
                                                                    <td className="p-2.5 text-center">
                                                                        {Number(item.quantity)} {item.unit_measure || 'UN'}
                                                                    </td>
                                                                    <td className="p-2.5 text-right">
                                                                        {formatCurrencyBR(item.unit_value)}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-semibold">
                                                                        {formatCurrencyBR(item.total_value)}
                                                                    </td>
                                                                    <td className="p-2.5 text-right">
                                                                        {isEditableInModal && !item.is_virtual ? (
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="min-h-[44px] px-2.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 gap-1"
                                                                                onClick={() => setReverseItemTarget(item)}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                Estorno
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-[11px] text-muted-foreground">Bloqueado</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TabsContent>
                                    );
                                })}

                                <TabsContent value="RESUMO" className="mt-2 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {summaryByGroup.map((s) => (
                                            <div key={s.value} className="rounded-md border border-border p-3 bg-muted/20">
                                                <div className="text-xs text-muted-foreground">{s.label}</div>
                                                <div className="text-base font-semibold text-foreground mt-1">
                                                    {formatCurrencyBR(s.total)}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">{s.count} item(ns)</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rounded-md border border-border p-3.5 bg-slate-50 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-foreground">Total Geral da Conta Médica</span>
                                        <span className="text-lg font-bold text-slate-900">{formatCurrencyBR(grandTotalModal)}</span>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Observações da Conta / Auditoria</Label>
                                        <Textarea
                                            value={formState.account_notes}
                                            disabled={!isEditableInModal}
                                            onChange={(e) => setFormState((s) => ({ ...s, account_notes: e.target.value }))}
                                            rows={3}
                                            className="mt-1 text-xs"
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    <DialogFooter className="flex-wrap gap-2 pt-3 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px] gap-1.5 text-xs"
                            onClick={() => setAttendanceModalOpen(true)}
                        >
                            <FileText className="w-4 h-4" />
                            Dados Atend.
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px] gap-1.5 text-xs"
                            onClick={() => setEditorOpen(false)}
                        >
                            <X className="w-4 h-4" />
                            Desiste
                        </Button>

                        {isEditableInModal && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px] gap-1.5 text-xs"
                                    onClick={handleSaveAccount}
                                    disabled={actionBusy}
                                >
                                    <Save className="w-4 h-4" />
                                    Grava
                                </Button>

                                <Button
                                    type="button"
                                    className="min-h-[44px] gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                                    onClick={() => editorData?.guide?.id && handleReleaseOrReverse(editorData.guide.id, 'release')}
                                    disabled={actionBusy}
                                >
                                    <Keyboard className="w-4 h-4" />
                                    Encerrar e Liberar Conta (Ctrl+L)
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal + Incluir Item */}
            <Dialog open={includeModalOpen} onOpenChange={setIncludeModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Incluir Item na Conta Médica</DialogTitle>
                        <DialogDescription className="text-xs">
                            Adicione procedimento, taxa, material ou exame ao grupo selecionado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Grupo da Conta</Label>
                            <Select
                                value={newItemForm.item_group}
                                onValueChange={(v) => setNewItemForm((f) => ({ ...f, item_group: v as AccountItemGroup }))}
                            >
                                <SelectTrigger className="min-h-[44px] mt-1 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GROUP_OPTIONS.map((g) => (
                                        <SelectItem key={g.value} value={g.value}>
                                            {g.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Código TUSS / Item</Label>
                                <Input
                                    value={newItemForm.procedure_code}
                                    onChange={(e) => setNewItemForm((f) => ({ ...f, procedure_code: e.target.value }))}
                                    placeholder="Ex: 20104090"
                                    className="min-h-[44px] mt-1 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Unidade</Label>
                                <Input
                                    value={newItemForm.unit_measure}
                                    onChange={(e) => setNewItemForm((f) => ({ ...f, unit_measure: e.target.value }))}
                                    className="min-h-[44px] mt-1 text-xs"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Descrição do Procedimento / Item</Label>
                            <Input
                                value={newItemForm.procedure_name}
                                onChange={(e) => setNewItemForm((f) => ({ ...f, procedure_name: e.target.value }))}
                                placeholder="Descrição conforme tabela contratada"
                                className="min-h-[44px] mt-1 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Quantidade</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={newItemForm.quantity}
                                    onChange={(e) => setNewItemForm((f) => ({ ...f, quantity: e.target.value }))}
                                    className="min-h-[44px] mt-1 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Valor Unitário (R$)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newItemForm.unit_value}
                                    onChange={(e) => setNewItemForm((f) => ({ ...f, unit_value: e.target.value }))}
                                    className="min-h-[44px] mt-1 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setIncludeModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" className="min-h-[44px]" onClick={handleAddItem} disabled={actionBusy}>
                            Confirmar Inclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta Obrigatório de Estorno de Item */}
            <AlertDialog open={Boolean(reverseItemTarget)} onOpenChange={(o) => !o && setReverseItemTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar estorno do item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja estornar o item{' '}
                            <strong>{reverseItemTarget?.procedure_name}</strong> ({reverseItemTarget?.procedure_code})? Esta ação recalculará o valor total da conta e ficará registrada na auditoria.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white"
                            onClick={handleConfirmReverseItem}
                        >
                            Confirmar Estorno
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal Dados do Atendimento / Prontuário (Dados Atend.) */}
            <Dialog open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Dados do Atendimento e Prontuário</DialogTitle>
                        <DialogDescription className="text-xs">
                            Evidências clínicas e de comparecimento vinculadas à conta médica.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-xs">
                        <div className="rounded-md border border-border p-3 space-y-1.5">
                            <p className="font-semibold text-foreground">Registro de Atendimento / Biometria</p>
                            {editorData?.appointment ? (
                                <>
                                    <p>
                                        Data/Hora: {editorData.appointment.appointment_date} às{' '}
                                        {String(editorData.appointment.appointment_time || '').slice(0, 5)}
                                    </p>
                                    <p>
                                        Status: {editorData.appointment.status}
                                        {editorData.appointment.session_status ? ` (${editorData.appointment.session_status})` : ''}
                                    </p>
                                    <p>
                                        Check-in / Biometria:{' '}
                                        {editorData.appointment.checkin_confirmed_at ||
                                        editorData.appointment.therapist_start_verified_at ? (
                                            <span className="text-emerald-700 font-medium">
                                                Confirmado ({editorData.appointment.checkin_method || 'BIOMETRIA/MANUAL'})
                                            </span>
                                        ) : (
                                            <span className="text-amber-700 font-medium">Pendente de confirmação biométrica</span>
                                        )}
                                    </p>
                                </>
                            ) : (
                                <p className="text-muted-foreground">Conta avulsa sem vínculo direto com agendamento.</p>
                            )}
                        </div>

                        <div className="rounded-md border border-border p-3 space-y-1.5">
                            <p className="font-semibold text-foreground">Evolução Clínica no Prontuário</p>
                            {editorData?.medical_record ? (
                                <>
                                    <p>
                                        Assinatura:{' '}
                                        {editorData.medical_record.signed_at || editorData.medical_record.signature_hash ? (
                                            <span className="text-emerald-700 font-medium">Assinado digitalmente</span>
                                        ) : (
                                            <span className="text-amber-700 font-medium">Registrado (sem assinatura digital)</span>
                                        )}
                                    </p>
                                    <p className="text-muted-foreground whitespace-pre-line">
                                        {editorData.medical_record.treatment_plan ||
                                            editorData.medical_record.history_present_illness ||
                                            editorData.medical_record.chief_complaint ||
                                            'Evolução registrada no prontuário eletrônico.'}
                                    </p>
                                </>
                            ) : (
                                <div className="flex items-center gap-1.5 text-amber-700">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Nenhuma evolução registrada para este atendimento no prontuário.</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" className="min-h-[44px]" onClick={() => setAttendanceModalOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

