'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Plus,
    Trash2,
    Search,
    Printer,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    Activity,
    ClipboardCheck,
    Sparkles,
    Calendar,
    User,
    Stethoscope,
    Layers,
    History,
    FileText,
    ArrowRight,
    Loader2,
    Eye,
    HelpCircle,
    RefreshCw
} from 'lucide-react'
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox'
import { toast } from 'sonner'

interface QuestionnaireTemplate {
    id: string
    title: string
    category: string
    description: string
    structure: any
    is_default?: boolean
}

interface QuestionnaireResponseItem {
    id: string
    patient_id: string
    plan_id?: string
    doctor_id?: string
    program_name: string
    application_date: string
    status: string
    template_snapshot: any
    data: any
    summary_metrics: any
    notes?: string
    created_at: string
    patient?: { id: string; full_name: string; phone?: string }
    doctor?: { id: string; specialty: string; user?: { full_name: string } }
    plan?: { id: string; title: string }
}

interface QuestionnairesTabProps {
    plans: any[]
    patients: any[]
    doctors: any[]
    currentUserDoctorId?: string | null
    currentUserRole?: string | null
}

export function QuestionnairesTab({
    plans,
    patients,
    doctors,
    currentUserDoctorId,
    currentUserRole
}: QuestionnairesTabProps) {
    const [tab, setTab] = useState<'templates' | 'history'>('templates')
    const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([])
    const [responses, setResponses] = useState<QuestionnaireResponseItem[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(true)
    const [loadingResponses, setLoadingResponses] = useState(true)

    // Filtros do Histórico
    const [historySearch, setHistorySearch] = useState('')
    const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('all')

    // Modal de Preenchimento / Aplicação
    const [fillModalOpen, setFillModalOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<QuestionnaireTemplate | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Estado do formulário de preenchimento
    const [selectedPatientId, setSelectedPatientId] = useState('')
    const [selectedPlanId, setSelectedPlanId] = useState('')
    const [selectedDoctorId, setSelectedDoctorId] = useState(currentUserDoctorId || '')
    const [programName, setProgramName] = useState('')
    const [applicationDate, setApplicationDate] = useState(new Date().toISOString().split('T')[0])
    const [rows, setRows] = useState<any[]>([])
    const [notes, setNotes] = useState('')

    // Modal de Visualização de Resposta Gravada
    const [viewResponseModalOpen, setViewResponseModalOpen] = useState(false)
    const [activeResponse, setActiveResponse] = useState<QuestionnaireResponseItem | null>(null)

    // Carregar templates
    const fetchTemplates = async () => {
        setLoadingTemplates(true)
        try {
            const res = await fetch('/api/therapeutic-plans/questionnaires/templates')
            if (res.ok) {
                const data = await res.json()
                setTemplates(data.data || [])
            }
        } catch {
            toast.error('Erro ao carregar modelos de questionários')
        } finally {
            setLoadingTemplates(false)
        }
    }

    // Carregar histórico de respostas
    const fetchResponses = async () => {
        setLoadingResponses(true)
        try {
            const res = await fetch('/api/therapeutic-plans/questionnaires/responses')
            if (res.ok) {
                const data = await res.json()
                setResponses(data.data || [])
            }
        } catch {
            toast.error('Erro ao carregar histórico de aplicações')
        } finally {
            setLoadingResponses(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
        fetchResponses()
    }, [])

    useEffect(() => {
        if (currentUserDoctorId && !selectedDoctorId) {
            setSelectedDoctorId(currentUserDoctorId)
        }
    }, [currentUserDoctorId, selectedDoctorId])

    // Iniciar preenchimento a partir de um template
    const handleStartFill = (template: QuestionnaireTemplate) => {
        setSelectedTemplate(template)
        setProgramName(
            template.category === 'aba_attempts' ? 'Treino Estruturado ABA' :
            template.category === 'baseline' ? 'Linha de Base de Habilidades' :
            template.category === 'naturalistic' ? 'Ensino Naturalista / Incidental' :
            template.title
        )
        setApplicationDate(new Date().toISOString().split('T')[0])
        setNotes('')

        // Inicializa linhas padrão
        const count = template.structure?.defaultRowsCount || 6
        const initialRows = Array.from({ length: count }, () => {
            if (template.category === 'aba_attempts') {
                return { antecedent: '', target_response: '', prompt_type: 'I (Sem Dica)', result: '+' }
            }
            if (template.category === 'baseline') {
                return { stimulus: '', date: new Date().toISOString().split('T')[0], t1: '+', t2: '+', t3: '+' }
            }
            if (template.category === 'naturalistic') {
                return { date: new Date().toISOString().split('T')[0], response: '', prompted_trials: 0, independent_trials: 0 }
            }
            return {}
        })
        setRows(initialRows)
        setFillModalOpen(true)
    }

    const addRow = () => {
        if (!selectedTemplate) return
        if (selectedTemplate.category === 'aba_attempts') {
            setRows(prev => [...prev, { antecedent: '', target_response: '', prompt_type: 'I (Sem Dica)', result: '+' }])
        } else if (selectedTemplate.category === 'baseline') {
            setRows(prev => [...prev, { stimulus: '', date: applicationDate, t1: '+', t2: '+', t3: '+' }])
        } else if (selectedTemplate.category === 'naturalistic') {
            setRows(prev => [...prev, { date: applicationDate, response: '', prompted_trials: 0, independent_trials: 0 }])
        } else {
            setRows(prev => [...prev, {}])
        }
    }

    const removeRow = (index: number) => {
        setRows(prev => prev.filter((_, i) => i !== index))
    }

    const updateRow = (index: number, field: string, value: any) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
    }

    // Métricas calculadas
    const computedMetrics = useMemo(() => {
        if (!selectedTemplate || rows.length === 0) return { totalRows: 0, accuracy: 0, independentCount: 0 }

        if (selectedTemplate.category === 'aba_attempts') {
            const valid = rows.filter(r => r.target_response || r.antecedent)
            const plusCount = valid.filter(r => r.result === '+').length
            const dPlusCount = valid.filter(r => r.result === 'd+').length
            const accuracy = valid.length > 0 ? Math.round(((plusCount + dPlusCount) / valid.length) * 100) : 0
            const independentRate = valid.length > 0 ? Math.round((plusCount / valid.length) * 100) : 0
            return {
                totalTrials: valid.length,
                plusCount,
                dPlusCount,
                accuracy,
                independentRate
            }
        }

        if (selectedTemplate.category === 'baseline') {
            const valid = rows.filter(r => r.stimulus)
            let totalTrials = 0
            let correctTrials = 0
            valid.forEach(r => {
                if (r.t1) { totalTrials++; if (r.t1 === '+') correctTrials++ }
                if (r.t2) { totalTrials++; if (r.t2 === '+') correctTrials++ }
                if (r.t3) { totalTrials++; if (r.t3 === '+') correctTrials++ }
            })
            const accuracy = totalTrials > 0 ? Math.round((correctTrials / totalTrials) * 100) : 0
            return {
                totalStimuli: valid.length,
                totalTrials,
                correctTrials,
                accuracy
            }
        }

        if (selectedTemplate.category === 'naturalistic') {
            const valid = rows.filter(r => r.response)
            let totalPrompted = 0
            let totalIndep = 0
            valid.forEach(r => {
                totalPrompted += Number(r.prompted_trials) || 0
                totalIndep += Number(r.independent_trials) || 0
            })
            const total = totalPrompted + totalIndep
            const accuracy = total > 0 ? Math.round((totalIndep / total) * 100) : 0
            return {
                totalPrompted,
                totalIndep,
                totalTrials: total,
                accuracy
            }
        }

        return {}
    }, [selectedTemplate, rows])

    // Salvar aplicação no histórico
    const handleSaveResponse = async () => {
        if (!selectedPatientId) {
            toast.error('Selecione o paciente')
            return
        }
        if (!selectedTemplate) {
            toast.error('Template inválido')
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                patient_id: selectedPatientId,
                plan_id: selectedPlanId || null,
                doctor_id: selectedDoctorId || null,
                template_id: selectedTemplate.id,
                template_snapshot: selectedTemplate, // Imutabilidade histórica
                program_name: programName.trim() || selectedTemplate.title,
                application_date: applicationDate,
                data: { rows },
                summary_metrics: computedMetrics,
                status: 'completed',
                notes: notes.trim() || null
            }

            const res = await fetch('/api/therapeutic-plans/questionnaires/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao salvar folha de registro')
            }

            toast.success('✅ Folha de registro salva no histórico do paciente!')
            setFillModalOpen(false)
            fetchResponses()
            setTab('history')
        } catch (error: any) {
            toast.error(error.message || 'Erro inesperado')
        } finally {
            setIsSaving(false)
        }
    }

    // Excluir registro do histórico com confirmação obrigatória
    const handleDeleteResponse = async (id: string, program: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir o registro clínico "${program}"? Esta ação não pode ser desfeita.`)) {
            return
        }

        try {
            const res = await fetch(`/api/therapeutic-plans/questionnaires/responses?id=${id}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error('Falha ao excluir')
            toast.success('Registro removido do histórico!')
            fetchResponses()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir')
        }
    }

    // Filtros de histórico
    const filteredResponses = responses.filter(r => {
        const patientName = r.patient?.full_name?.toLowerCase() || ''
        const program = r.program_name?.toLowerCase() || ''
        const searchMatch = !historySearch || patientName.includes(historySearch.toLowerCase()) || program.includes(historySearch.toLowerCase())
        const patientMatch = selectedPatientFilter === 'all' || r.patient_id === selectedPatientFilter
        return searchMatch && patientMatch
    })

    return (
        <div className="space-y-6">
            {/* Header de Controle de Abas */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Folhas de Registro Clínico & Questionários ABA
                        </h2>
                        <p className="text-xs text-slate-500">
                            Padronização de treinos, linha de base, dicas e evolução dos planos terapêuticos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={tab === 'templates' ? 'default' : 'outline'}
                        onClick={() => setTab('templates')}
                        className="h-10 rounded-xl text-xs font-semibold px-4 gap-2"
                    >
                        <Layers className="w-4 h-4" />
                        Modelos / Folhas ({templates.length})
                    </Button>
                    <Button
                        variant={tab === 'history' ? 'default' : 'outline'}
                        onClick={() => setTab('history')}
                        className="h-10 rounded-xl text-xs font-semibold px-4 gap-2"
                    >
                        <History className="w-4 h-4" />
                        Histórico de Aplicações ({responses.length})
                    </Button>
                </div>
            </div>

            {/* ABA 1: MODELOS / TEMPLATES */}
            {tab === 'templates' && (
                <div className="space-y-4">
                    {loadingTemplates ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((tpl) => {
                                const isAba = tpl.category === 'aba_attempts'
                                const isBaseline = tpl.category === 'baseline'
                                const isNaturalistic = tpl.category === 'naturalistic'

                                return (
                                    <Card
                                        key={tpl.id}
                                        className="relative flex flex-col justify-between overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all rounded-2xl shadow-sm hover:shadow-md bg-white dark:bg-slate-900"
                                    >
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                    isAba ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                                                    isBaseline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {isAba && <Activity className="w-5 h-5" />}
                                                    {isBaseline && <ClipboardCheck className="w-5 h-5" />}
                                                    {isNaturalistic && <Sparkles className="w-5 h-5" />}
                                                    {!isAba && !isBaseline && !isNaturalistic && <FileText className="w-5 h-5" />}
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                                                    {isAba ? 'Tentativas ABA' : isBaseline ? 'Linha de Base' : isNaturalistic ? 'Naturalista' : 'Personalizado'}
                                                </Badge>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                                                    {tpl.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                                                    {tpl.description}
                                                </p>
                                            </div>

                                            {/* Preview de colunas estruturadas */}
                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                                    Colunas de Coleta:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {tpl.structure?.columns?.map((c: any) => (
                                                        <span key={c.key} className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                                                            {c.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 pt-0 border-t bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
                                            <span className="text-[11px] text-slate-400">
                                                {tpl.structure?.defaultRowsCount || 6} linhas padrão
                                            </span>
                                            <Button
                                                onClick={() => handleStartFill(tpl)}
                                                className="h-9 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Preencher Folha
                                            </Button>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ABA 2: HISTÓRICO DE APLICAÇÕES */}
            {tab === 'history' && (
                <div className="space-y-4">
                    {/* Barra de Filtros */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por paciente ou programa..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="pl-9 h-10 rounded-xl"
                                style={{ fontSize: '16px' }}
                            />
                        </div>

                        <div className="w-full sm:w-64">
                            <Select value={selectedPatientFilter} onValueChange={setSelectedPatientFilter}>
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="Filtrar por Paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Pacientes</SelectItem>
                                    {patients.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="outline"
                            onClick={fetchResponses}
                            className="h-10 px-3 rounded-xl gap-1.5 text-xs font-semibold shrink-0"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Atualizar
                        </Button>
                    </div>

                    {/* Lista de Registros */}
                    {loadingResponses ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    ) : filteredResponses.length === 0 ? (
                        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Nenhuma folha de registro encontrada
                            </p>
                            <p className="text-xs text-slate-400">
                                Clique na aba &quot;Modelos / Folhas&quot; para iniciar o preenchimento de uma nova folha clínica.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredResponses.map((item) => (
                                <Card
                                    key={item.id}
                                    className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
                                                    {item.program_name}
                                                </span>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                                                📅 {item.application_date?.split('-').reverse().join('/')}
                                            </Badge>
                                        </div>

                                        <div className="text-xs text-slate-500 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <p className="flex items-center gap-1.5">
                                                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                                                <strong>Aplicador:</strong> {item.doctor?.user?.full_name || 'Terapeuta'}
                                            </p>
                                            {item.plan?.title && (
                                                <p className="flex items-center gap-1.5">
                                                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                    <strong>Plano:</strong> {item.plan.title}
                                                </p>
                                            )}
                                        </div>

                                        {/* Métricas Rápidas */}
                                        {item.summary_metrics && (
                                            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-semibold">
                                                <span>Aproveitamento Geral</span>
                                                <span className="text-sm font-extrabold">{item.summary_metrics.accuracy || 0}%</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 border-t bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteResponse(item.id, item.program_name)}
                                            className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 font-semibold"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            Excluir
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setActiveResponse(item)
                                                setViewResponseModalOpen(true)
                                            }}
                                            className="h-8 px-3 text-xs font-semibold rounded-lg gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Visualizar
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE PREENCHIMENTO DA FOLHA / QUESTIONÁRIO */}
            <Dialog open={fillModalOpen} onOpenChange={setFillModalOpen}>
                <DialogContent className="w-full sm:max-w-4xl max-h-[94vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                            {selectedTemplate?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Preencha as tentativas e resultados da sessão de intervenção para registrar no histórico do plano terapêutico.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Cabeçalho da Folha */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Paciente *</Label>
                                <PatientSearchCombobox
                                    value={selectedPatientId}
                                    onSelect={(p) => setSelectedPatientId(p?.id || '')}
                                    onCreateNew={() => window.open('/dashboard/pacientes', '_blank')}
                                    placeholder="Buscar paciente..."
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Profissional / Aplicador *</Label>
                                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                    <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="Selecione o profissional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {doctors.map((d: any) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.user?.full_name || d.full_name || 'Profissional'} ({d.specialty || 'Geral'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Data da Aplicação *</Label>
                                <Input
                                    type="date"
                                    value={applicationDate}
                                    onChange={(e) => setApplicationDate(e.target.value)}
                                    className="h-10 rounded-xl"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs font-bold">Programa / Habilidade / Alvo *</Label>
                                <Input
                                    value={programName}
                                    onChange={(e) => setProgramName(e.target.value)}
                                    placeholder="Ex: Identificação de Cores, Mando, Imitação Motora..."
                                    className="h-10 rounded-xl"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Plano Terapêutico Vinculado</Label>
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="Opcional (geral)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem plano específico</SelectItem>
                                        {plans.map((pl: any) => (
                                            <SelectItem key={pl.id} value={pl.id}>
                                                {pl.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* TABELA DE REGISTRO INTERATIVA */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Grade de Tentativas e Registros Clínicos
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addRow}
                                    className="h-8 px-3 rounded-lg text-xs font-semibold gap-1 text-indigo-600 dark:text-indigo-400"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                                </Button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                                        <tr>
                                            <th className="p-2.5 w-10 text-center">#</th>
                                            {selectedTemplate?.structure?.columns?.map((col: any) => (
                                                <th key={col.key} className="p-2.5 min-w-[140px]">
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th className="p-2.5 w-12 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="p-2 text-center font-bold text-slate-400">
                                                    {idx + 1}
                                                </td>

                                                {selectedTemplate?.category === 'aba_attempts' && (
                                                    <>
                                                        <td className="p-1.5">
                                                            <Input
                                                                value={row.antecedent || ''}
                                                                onChange={(e) => updateRow(idx, 'antecedent', e.target.value)}
                                                                placeholder="Ex: 3 - O que é isso?"
                                                                className="h-9 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                value={row.target_response || ''}
                                                                onChange={(e) => updateRow(idx, 'target_response', e.target.value)}
                                                                placeholder="Ex: Borracha"
                                                                className="h-9 text-xs font-medium"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Select
                                                                value={row.prompt_type || 'I (Sem Dica)'}
                                                                onValueChange={(val) => updateRow(idx, 'prompt_type', val)}
                                                            >
                                                                <SelectTrigger className="h-9 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="I (Sem Dica)">I (Independente)</SelectItem>
                                                                    <SelectItem value="AFT (Física Total)">AFT (Física Total)</SelectItem>
                                                                    <SelectItem value="AFL (Física Leve)">AFL (Física Leve)</SelectItem>
                                                                    <SelectItem value="AG (Gestual)">AG (Gestual)</SelectItem>
                                                                    <SelectItem value="AV (Verbal)">AV (Verbal)</SelectItem>
                                                                    <SelectItem value="M (Modelagem)">M (Modelagem)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="p-1.5">
                                                            <div className="flex items-center gap-1">
                                                                {[
                                                                    { val: '+', label: '+', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                                                                    { val: 'd+', label: 'd+', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                                                                    { val: 'd-', label: 'd-', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
                                                                    { val: '-', label: '-', color: 'bg-red-600 hover:bg-red-700 text-white' }
                                                                ].map(btn => (
                                                                    <button
                                                                        key={btn.val}
                                                                        type="button"
                                                                        onClick={() => updateRow(idx, 'result', btn.val)}
                                                                        className={`w-7 h-7 rounded-md font-bold text-xs transition-all ${
                                                                            row.result === btn.val
                                                                                ? btn.color
                                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        {btn.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {selectedTemplate?.category === 'baseline' && (
                                                    <>
                                                        <td className="p-1.5">
                                                            <Input
                                                                value={row.stimulus || ''}
                                                                onChange={(e) => updateRow(idx, 'stimulus', e.target.value)}
                                                                placeholder="Ex: Nomear estímulo..."
                                                                className="h-9 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                type="date"
                                                                value={row.date || applicationDate}
                                                                onChange={(e) => updateRow(idx, 'date', e.target.value)}
                                                                className="h-9 text-xs"
                                                            />
                                                        </td>
                                                        {['t1', 't2', 't3'].map((tKey, tIdx) => (
                                                            <td key={tKey} className="p-1.5">
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateRow(idx, tKey, '+')}
                                                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                                                            row[tKey] === '+' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                                                                        }`}
                                                                    >
                                                                        +
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateRow(idx, tKey, '-')}
                                                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                                                            row[tKey] === '-' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                                                                        }`}
                                                                    >
                                                                        -
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </>
                                                )}

                                                {selectedTemplate?.category === 'naturalistic' && (
                                                    <>
                                                        <td className="p-1.5">
                                                            <Input
                                                                type="date"
                                                                value={row.date || applicationDate}
                                                                onChange={(e) => updateRow(idx, 'date', e.target.value)}
                                                                className="h-9 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                value={row.response || ''}
                                                                onChange={(e) => updateRow(idx, 'response', e.target.value)}
                                                                placeholder="Resposta observada..."
                                                                className="h-9 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={row.prompted_trials ?? 0}
                                                                onChange={(e) => updateRow(idx, 'prompted_trials', Number(e.target.value))}
                                                                className="h-9 text-xs w-24 text-center"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={row.independent_trials ?? 0}
                                                                onChange={(e) => updateRow(idx, 'independent_trials', Number(e.target.value))}
                                                                className="h-9 text-xs w-24 text-center"
                                                            />
                                                        </td>
                                                    </>
                                                )}

                                                <td className="p-2 text-center">
                                                    {rows.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRow(idx)}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Legendas e Critérios */}
                        {selectedTemplate?.structure?.legend && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs space-y-1.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {selectedTemplate.structure.legend.title}
                                </span>
                                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                                    {selectedTemplate.structure.legend.items?.map((it: any, i: number) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border">
                                            <strong>{it.symbol}:</strong> {it.description}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Observações Clínicas */}
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Observações / Anotações da Sessão</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Registre intercorrências, motivação do paciente, reforçadores utilizados..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFillModalOpen(false)}
                            className="w-full sm:w-auto h-10 px-5"
                        >
                            Cancelar
                        </Button>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                onClick={handleSaveResponse}
                                disabled={isSaving}
                                className="w-full sm:w-auto h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Salvar Folha de Registro
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL DE VISUALIZAÇÃO DE RESPOSTA GRAVADA (SNAPSHOT IMUTÁVEL) */}
            <Dialog open={viewResponseModalOpen} onOpenChange={setViewResponseModalOpen}>
                <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">
                            {activeResponse?.program_name} — Detalhes da Aplicação
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Paciente: <strong>{activeResponse?.patient?.full_name}</strong> | Data: <strong>{activeResponse?.application_date}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {activeResponse && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-1">
                                <p><strong>Terapeuta / Aplicador:</strong> {activeResponse.doctor?.user?.full_name || 'N/A'}</p>
                                <p><strong>Plano Terapêutico:</strong> {activeResponse.plan?.title || 'Geral'}</p>
                                {activeResponse.notes && <p><strong>Observações:</strong> {activeResponse.notes}</p>}
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b">
                                        <tr>
                                            <th className="p-2 w-8 text-center">#</th>
                                            {activeResponse.template_snapshot?.structure?.columns?.map((c: any) => (
                                                <th key={c.key} className="p-2">{c.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {activeResponse.data?.rows?.map((r: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                                                {activeResponse.template_snapshot?.structure?.columns?.map((c: any) => (
                                                    <td key={c.key} className="p-2 font-medium">
                                                        {r[c.key] !== undefined ? String(r[c.key]) : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2 border-t flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.print()}
                            className="gap-1 text-xs"
                        >
                            <Printer className="w-3.5 h-3.5" /> Imprimir
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setViewResponseModalOpen(false)}
                            className="h-9 px-5 text-xs font-semibold"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
