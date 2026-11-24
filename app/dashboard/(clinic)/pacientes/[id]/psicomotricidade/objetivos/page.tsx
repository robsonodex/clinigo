'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowLeft,
    BookOpen,
    Check,
    CheckCircle2,
    Copy,
    Loader2,
    PlayCircle,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    Target,
    X,
    XCircle,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
    CATEGORIAS_OBJETIVOS_ORDEM,
    OBJETIVOS_PSICOMOTRICIDADE_CATALOGO,
} from '@/components/psicomotricidade/catalogo-objetivos';
import {
    BibliotecaObjetivoViewItem,
    PsicomotricidadeBibliotecaModal,
} from '@/components/psicomotricidade/PsicomotricidadeBibliotecaModal';

function resolveCategoriaLetra(codigo: string, categoria: string): string {
    const match = OBJETIVOS_PSICOMOTRICIDADE_CATALOGO.find(
        (c) => c.codigo.toUpperCase() === codigo.toUpperCase()
    );
    if (match) return match.categoriaLetra;
    const catLower = (categoria || '').toLowerCase().trim();
    const byCat = CATEGORIAS_OBJETIVOS_ORDEM.find((c) =>
        c.toLowerCase().includes(catLower)
    );
    return byCat || categoria;
}

export default function PacienteObjetivosPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { clinic } = useAuth();
    const patientId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [objetivos, setObjetivos] = useState<any[]>([]);
    const [biblioteca, setBiblioteca] = useState<any[]>([]);
    const [patient, setPatient] = useState<any>(null);

    // Filtros da lista de objetivos vinculados ao paciente
    const [listSearch, setListSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'adquirido' | 'descontinuado'>('todos');

    // Modal de consulta completa da biblioteca
    const [isLibraryViewerOpen, setIsLibraryViewerOpen] = useState(false);

    // Modal "Vincular Novo Objetivo" com seletor visual pesquisável
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerCategory, setPickerCategory] = useState<string>('todas');
    const [selectedBibId, setSelectedBibId] = useState('');
    const [criterioTexto, setCriterioTexto] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Confirmação de ações destrutivas (Regra dos Botões)
    const [confirmDiscontinueObj, setConfirmDiscontinueObj] = useState<any | null>(null);
    const [confirmClearForm, setConfirmClearForm] = useState(false);

    const loadData = useCallback(async (silent = false) => {
        if (!patientId || !user?.clinic_id) return;
        if (silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        try {
            const supabase = createClient();

            // Dados do paciente
            const { data: patientData } = await supabase
                .from('patients')
                .select('full_name')
                .eq('id', patientId)
                .single();
            setPatient(patientData);

            // Objetivos já vinculados ao paciente
            const { data: pacObj } = await supabase
                .from('paciente_objetivos')
                .select('*, biblioteca:objetivos_biblioteca(*)')
                .eq('paciente_id', patientId)
                .order('created_at', { ascending: false });

            setObjetivos(pacObj || []);

            // Biblioteca da clínica (com auto-seed idempotente 100% RLS para novas clínicas)
            const { data: existingBib } = await supabase
                .from('objetivos_biblioteca')
                .select('*')
                .eq('clinica_id', user.clinic_id)
                .eq('ativo', true)
                .order('codigo');

            let finalBib = existingBib || [];

            if (finalBib.length === 0) {
                const seedRows = OBJETIVOS_PSICOMOTRICIDADE_CATALOGO.map((item) => ({
                    clinica_id: user.clinic_id,
                    codigo: item.codigo,
                    categoria: item.categoria,
                    descricao_template: item.descricao,
                    estrutura_parametros: [],
                    versao: 1,
                    ativo: true,
                }));

                const { error: seedError } = await (supabase as any)
                    .from('objetivos_biblioteca')
                    .upsert(seedRows, {
                        onConflict: 'clinica_id,codigo',
                        ignoreDuplicates: true,
                    });

                if (!seedError) {
                    const { data: seededBib } = await supabase
                        .from('objetivos_biblioteca')
                        .select('*')
                        .eq('clinica_id', user.clinic_id)
                        .eq('ativo', true)
                        .order('codigo');
                    finalBib = seededBib || [];
                }
            }

            setBiblioteca(finalBib);
        } catch (error: any) {
            console.error('Error loading data', error);
            toast.error('Erro ao carregar objetivos: ' + (error?.message || 'falha inesperada'));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [patientId, user?.clinic_id]);

    useEffect(() => {
        if (patientId && user?.clinic_id) {
            loadData(false);
        }
    }, [patientId, user?.clinic_id, loadData]);

    const enrichedBiblioteca = useMemo(() => {
        return biblioteca.map((b) => ({
            ...b,
            categoriaLetra: resolveCategoriaLetra(b.codigo, b.categoria),
        }));
    }, [biblioteca]);

    const linkedActiveCodes = useMemo(
        () =>
            objetivos
                .filter((o) => o.status === 'ativo' && o.biblioteca?.codigo)
                .map((o) => String(o.biblioteca.codigo).toUpperCase()),
        [objetivos]
    );

    const linkedActiveSet = useMemo(() => new Set(linkedActiveCodes), [linkedActiveCodes]);

    const filteredPickerItems = useMemo(() => {
        const q = pickerSearch.toLowerCase().trim();
        return enrichedBiblioteca.filter((item) => {
            const matchCat =
                pickerCategory === 'todas' || item.categoriaLetra === pickerCategory;
            const matchSearch =
                !q ||
                String(item.codigo || '').toLowerCase().includes(q) ||
                String(item.categoria || '').toLowerCase().includes(q) ||
                String(item.descricao_template || '').toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
    }, [enrichedBiblioteca, pickerCategory, pickerSearch]);

    const selectedBib = useMemo(
        () => enrichedBiblioteca.find((b) => b.id === selectedBibId),
        [enrichedBiblioteca, selectedBibId]
    );

    const filteredPatientObjetivos = useMemo(() => {
        const q = listSearch.toLowerCase().trim();
        return objetivos.filter((obj) => {
            const matchStatus = statusFilter === 'todos' || obj.status === statusFilter;
            const matchSearch =
                !q ||
                String(obj.biblioteca?.codigo || '').toLowerCase().includes(q) ||
                String(obj.biblioteca?.categoria || '').toLowerCase().includes(q) ||
                String(obj.criterio_texto_gerado || '').toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [objetivos, statusFilter, listSearch]);

    const handlePickObjective = (bibItem: any) => {
        const prevTemplate = selectedBib?.descricao_template || '';
        setSelectedBibId(bibItem.id);
        // Autopreenche o campo de critério com o template base se estiver vazio ou igual ao template anterior
        if (!criterioTexto.trim() || criterioTexto.trim() === prevTemplate.trim()) {
            setCriterioTexto(bibItem.descricao_template || '');
        }
    };

    const handleSelectFromLibraryViewer = (item: BibliotecaObjetivoViewItem) => {
        const matched = enrichedBiblioteca.find(
            (b) =>
                (item.id && b.id === item.id) ||
                String(b.codigo).toUpperCase() === item.codigo.toUpperCase()
        );
        if (matched) {
            setSelectedBibId(matched.id);
            setCriterioTexto(matched.descricao_template || '');
            setIsModalOpen(true);
        } else {
            toast.info('Abra o cadastro de objetivo para selecionar este item.');
            setIsModalOpen(true);
        }
    };

    const handleAddObjetivo = async () => {
        if (!selectedBibId || !criterioTexto.trim()) {
            toast.error('Selecione um objetivo da biblioteca e defina o critério');
            return;
        }

        setIsSaving(true);
        try {
            const bibItem = biblioteca.find((b) => b.id === selectedBibId);
            const supabase = createClient();
            const { error } = await (supabase as any).from('paciente_objetivos').insert({
                clinica_id: user?.clinic_id,
                paciente_id: patientId,
                objetivo_id: selectedBibId,
                objetivo_versao: bibItem?.versao || 1,
                criterio_texto_gerado: criterioTexto.trim(),
                parametros_definidos: [],
                profissional_id: user?.id,
                status: 'ativo',
            });

            if (error) throw error;

            toast.success('Objetivo vinculado ao paciente com sucesso.');
            setIsModalOpen(false);
            setSelectedBibId('');
            setCriterioTexto('');
            setPickerSearch('');
            setPickerCategory('todas');
            loadData(true);
        } catch (error: any) {
            console.error('Error adding goal', error);
            toast.error('Erro ao adicionar objetivo: ' + (error?.message || 'falha inesperada'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const supabase = createClient();
            const { error } = await (supabase as any)
                .from('paciente_objetivos')
                .update({ status: newStatus, data_status: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Status atualizado para ${newStatus}.`);
            loadData(true);
        } catch (error: any) {
            toast.error('Erro ao atualizar status: ' + (error?.message || 'falha inesperada'));
        }
    };

    const handleCopyObjetivo = async (obj: any) => {
        const text = `${obj.biblioteca?.codigo || 'OBJ'} — ${obj.criterio_texto_gerado || ''}`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Critério do objetivo copiado.');
        } catch {
            toast.error('Não foi possível copiar o texto.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ativo':
                return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Ativo</Badge>;
            case 'adquirido':
                return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Adquirido</Badge>;
            case 'suspenso':
                return <Badge variant="outline" className="text-amber-700 border-amber-500">Suspenso</Badge>;
            case 'descontinuado':
                return <Badge variant="destructive">Descontinuado</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="container py-8 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container py-6 sm:py-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[40px] shrink-0"
                        onClick={() =>
                            router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)
                        }
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Voltar
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                            Objetivos do Paciente
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {patient?.full_name}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsLibraryViewerOpen(true)}
                        className="min-h-[42px] border-emerald-200 bg-emerald-50/70 text-[#155E4B] hover:bg-emerald-100/70 font-medium"
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Ver Biblioteca ({biblioteca.length || OBJETIVOS_PSICOMOTRICIDADE_CATALOGO.length})
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing}
                        aria-label="Atualizar lista de objetivos"
                        title="Atualizar lista"
                        className="min-h-[42px] min-w-[42px]"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>

                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F4C3A] text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Objetivo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                            <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-200 bg-slate-50/70">
                                <DialogTitle className="text-base sm:text-lg font-semibold text-slate-900">
                                    Vincular Novo Objetivo
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm">
                                    Leia a descrição completa antes de selecionar. Ao clicar em um objetivo, o modelo preenche automaticamente o critério abaixo.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                                {/* Busca e filtros de categoria do Catálogo Visual */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                            1. Escolha um Objetivo da Biblioteca ({filteredPickerItems.length} de {enrichedBiblioteca.length})
                                        </Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setIsLibraryViewerOpen(true);
                                            }}
                                            className="text-xs font-medium text-[#155E4B] hover:underline"
                                        >
                                            Abrir catálogo completo / PDF
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <Input
                                            type="text"
                                            placeholder="Buscar por código (ex.: ATR01, AUT02) ou descrição (ex.: obstáculos, saltar)..."
                                            value={pickerSearch}
                                            onChange={(e) => setPickerSearch(e.target.value)}
                                            className="pl-9 pr-9 h-10 text-base sm:text-sm"
                                            style={{ fontSize: '16px' }}
                                        />
                                        {pickerSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setPickerSearch('')}
                                                aria-label="Limpar busca"
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={pickerCategory === 'todas' ? 'default' : 'outline'}
                                            onClick={() => setPickerCategory('todas')}
                                            className={`h-7 px-2.5 text-xs shrink-0 ${
                                                pickerCategory === 'todas'
                                                    ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white'
                                                    : 'border-slate-200'
                                            }`}
                                        >
                                            Todas
                                        </Button>
                                        {CATEGORIAS_OBJETIVOS_ORDEM.map((cat) => {
                                            const letter = cat.split(' · ')[0];
                                            const active = pickerCategory === cat;
                                            return (
                                                <Button
                                                    key={cat}
                                                    type="button"
                                                    size="sm"
                                                    variant={active ? 'default' : 'outline'}
                                                    title={cat}
                                                    onClick={() => setPickerCategory(cat)}
                                                    className={`h-7 px-2.5 text-xs shrink-0 ${
                                                        active
                                                            ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white'
                                                            : 'border-slate-200'
                                                    }`}
                                                >
                                                    {letter}
                                                </Button>
                                            );
                                        })}
                                    </div>

                                    {pickerCategory !== 'todas' && (
                                        <p className="text-xs text-[#155E4B] font-medium">
                                            {pickerCategory}
                                        </p>
                                    )}

                                    {/* Lista visual com descrição completa ANTES da escolha */}
                                    <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
                                        {filteredPickerItems.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-500">
                                                Nenhum objetivo encontrado com esse filtro.
                                            </div>
                                        ) : (
                                            filteredPickerItems.map((b) => {
                                                const isSelected = selectedBibId === b.id;
                                                const isAlreadyActive = linkedActiveSet.has(
                                                    String(b.codigo || '').toUpperCase()
                                                );
                                                return (
                                                    <button
                                                        key={b.id}
                                                        type="button"
                                                        onClick={() => handlePickObjective(b)}
                                                        className={`w-full text-left p-3 transition-colors flex items-start justify-between gap-3 ${
                                                            isSelected
                                                                ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-400'
                                                                : 'hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className="space-y-1 min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#155E4B]">
                                                                    {b.codigo}
                                                                </span>
                                                                <span className="text-xs font-medium text-slate-500">
                                                                    {b.categoria}
                                                                </span>
                                                                {isAlreadyActive && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] py-0 px-1.5 border-slate-300 text-slate-600"
                                                                    >
                                                                        Já ativo
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs sm:text-sm text-slate-800 leading-snug">
                                                                {b.descricao_template}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border shrink-0 mt-0.5 ${
                                                                isSelected
                                                                    ? 'bg-[#155E4B] border-[#155E4B] text-white'
                                                                    : 'border-slate-300 bg-white'
                                                            }`}
                                                        >
                                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Resumo do item selecionado + Critério editável */}
                                <div className="space-y-2 pt-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                            2. Critério Definido para o Paciente
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            {selectedBib && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCriterioTexto(
                                                            selectedBib.descricao_template || ''
                                                        )
                                                    }
                                                    className="h-7 px-2 text-xs text-[#155E4B]"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                                    Usar texto do modelo
                                                </Button>
                                            )}
                                            {(selectedBibId || criterioTexto) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setConfirmClearForm(true)}
                                                    className="h-7 px-2 text-xs text-slate-500 hover:text-destructive"
                                                >
                                                    Limpar
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {selectedBib && (
                                        <div className="px-3 py-2 rounded-md bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950">
                                            <span className="font-mono font-bold mr-1.5">
                                                {selectedBib.codigo}
                                            </span>
                                            <span className="text-emerald-800">
                                                ({selectedBib.categoria})
                                            </span>
                                        </div>
                                    )}

                                    <Textarea
                                        placeholder="Selecione um objetivo acima para preencher automaticamente e substitua os espaços ___ pelos parâmetros do paciente."
                                        value={criterioTexto}
                                        onChange={(e) => setCriterioTexto(e.target.value)}
                                        rows={3}
                                        className="text-base sm:text-sm"
                                        style={{ fontSize: '16px' }}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Substitua os campos em branco (___) pelos valores exatos usados para avaliar o desempenho do paciente.
                                    </p>
                                </div>
                            </div>

                            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="min-h-[40px]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleAddObjetivo}
                                    disabled={isSaving || !selectedBibId || !criterioTexto.trim()}
                                    className="min-h-[40px] bg-[#155E4B] hover:bg-[#0F4C3A] text-white"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Salvar Objetivo
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filtros da lista de objetivos do paciente */}
            {objetivos.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <Input
                            type="text"
                            value={listSearch}
                            onChange={(e) => setListSearch(e.target.value)}
                            placeholder="Filtrar objetivos deste paciente..."
                            className="pl-9 h-10 text-base sm:text-sm"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {(
                            [
                                { id: 'todos', label: `Todos (${objetivos.length})` },
                                {
                                    id: 'ativo',
                                    label: `Ativos (${objetivos.filter((o) => o.status === 'ativo').length})`,
                                },
                                {
                                    id: 'adquirido',
                                    label: `Adquiridos (${objetivos.filter((o) => o.status === 'adquirido').length})`,
                                },
                                {
                                    id: 'descontinuado',
                                    label: `Descontinuados (${objetivos.filter((o) => o.status === 'descontinuado').length})`,
                                },
                            ] as const
                        ).map((tab) => (
                            <Button
                                key={tab.id}
                                type="button"
                                size="sm"
                                variant={statusFilter === tab.id ? 'default' : 'outline'}
                                onClick={() => setStatusFilter(tab.id)}
                                className={`h-8 text-xs ${
                                    statusFilter === tab.id
                                        ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white'
                                        : 'border-slate-200'
                                }`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Lista de Objetivos */}
            <div className="space-y-3">
                {objetivos.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                            <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-25" />
                            <h3 className="text-lg font-medium text-slate-800">
                                Nenhum objetivo definido
                            </h3>
                            <p className="text-sm text-muted-foreground mb-5 max-w-md">
                                Consulte a biblioteca completa para visualizar os 55 objetivos disponíveis ou vincule o primeiro objetivo diretamente.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsLibraryViewerOpen(true)}
                                    className="min-h-[42px]"
                                >
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Consultar Biblioteca (55)
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setIsModalOpen(true)}
                                    className="min-h-[42px] bg-[#155E4B] hover:bg-[#0F4C3A] text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Começar a adicionar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : filteredPatientObjetivos.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center space-y-2">
                            <p className="text-sm text-slate-600">
                                Nenhum objetivo corresponde ao filtro selecionado.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setListSearch('');
                                    setStatusFilter('todos');
                                }}
                            >
                                Limpar filtros
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    filteredPatientObjetivos.map((obj) => (
                        <Card key={obj.id} className="overflow-hidden">
                            <div className="border-l-4 border-l-[#155E4B] flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <Badge variant="outline" className="font-mono text-xs bg-emerald-50 text-[#155E4B] border-emerald-200">
                                            {obj.biblioteca?.codigo || 'N/A'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                            {obj.biblioteca?.categoria || 'Categoria Indefinida'}
                                        </span>
                                        {getStatusBadge(obj.status)}
                                    </div>
                                    <p className="text-slate-900 font-medium leading-relaxed">
                                        {obj.criterio_texto_gerado}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Definido em:{' '}
                                        {new Date(obj.data_definicao).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyObjetivo(obj)}
                                        className="min-h-[38px]"
                                        title="Copiar texto do objetivo"
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        Copiar
                                    </Button>

                                    {obj.status === 'ativo' ? (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUpdateStatus(obj.id, 'adquirido')}
                                                className="min-h-[38px] text-blue-700 border-blue-200 hover:bg-blue-50"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                Marcar Adquirido
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setConfirmDiscontinueObj(obj)}
                                                className="min-h-[38px] text-red-700 border-red-200 hover:bg-red-50"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Descontinuar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(obj.id, 'ativo')}
                                            className="min-h-[38px]"
                                        >
                                            <PlayCircle className="w-4 h-4 mr-1" />
                                            Reativar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Visualizador completo da Biblioteca (55 objetivos + Imprimir/PDF) */}
            <PsicomotricidadeBibliotecaModal
                open={isLibraryViewerOpen}
                onOpenChange={setIsLibraryViewerOpen}
                items={enrichedBiblioteca}
                clinicName={clinic?.name}
                linkedCodes={linkedActiveCodes}
                onSelectObjetivo={handleSelectFromLibraryViewer}
            />

            {/* Confirmação para Descontinuar objetivo */}
            <AlertDialog
                open={!!confirmDiscontinueObj}
                onOpenChange={(open) => {
                    if (!open) setConfirmDiscontinueObj(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Descontinuar objetivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja arquivar/descontinuar o objetivo{' '}
                            <strong>{confirmDiscontinueObj?.biblioteca?.codigo || ''}</strong>? Ele
                            continuará no histórico e poderá ser reativado depois.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => {
                                if (confirmDiscontinueObj) {
                                    handleUpdateStatus(confirmDiscontinueObj.id, 'descontinuado');
                                    setConfirmDiscontinueObj(null);
                                }
                            }}
                        >
                            Confirmar descontinuação
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirmação para Limpar formulário */}
            <AlertDialog open={confirmClearForm} onOpenChange={setConfirmClearForm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Limpar campos?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja limpar todos os campos preenchidos neste formulário?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setSelectedBibId('');
                                setCriterioTexto('');
                                setPickerSearch('');
                                setPickerCategory('todas');
                                setConfirmClearForm(false);
                            }}
                        >
                            Limpar campos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
