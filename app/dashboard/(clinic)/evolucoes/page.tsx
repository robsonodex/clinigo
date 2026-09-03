'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Loader2, Search, FileEdit, Smile, Frown, Meh, SmilePlus, Angry, Lock, CheckCircle2, Shield, Printer, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox'
import { toast } from 'sonner'
import { SignDocumentModal } from '@/components/pep/SignDocumentModal'

const TEMPLATE_LABELS: Record<string, string> = { free: 'Livre', soap: 'SOAP', cif: 'CIF', dap: 'DAP', multidisciplinar: 'Multidisciplinar' }
const MOOD_LABELS = ['Muito Baixo', 'Baixo', 'Neutro', 'Bom', 'Excelente']

export default function SessionEvolutionsPage() {
    const [evolutions, setEvolutions] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [expandedEvolutions, setExpandedEvolutions] = useState<Set<string>>(new Set())
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [finalizing, setFinalizing] = useState(false)
    const [templateType, setTemplateType] = useState('soap')
    const [signModalOpen, setSignModalOpen] = useState(false)
    const [recordToSign, setRecordToSign] = useState<string | null>(null)
    const [filterPatientId, setFilterPatientId] = useState<string>('')
    const [filterStartDate, setFilterStartDate] = useState<string>('')
    const [filterEndDate, setFilterEndDate] = useState<string>('')

    const toggleExpand = (id: string) => {
        setExpandedEvolutions(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const emptyForm = {
        patient_id: '', doctor_id: '', appointment_id: '', plan_id: '',
        evolution_date: new Date().toISOString().split('T')[0], template_type: 'soap',
        subjective: '', objective: '', assessment: '', plan_notes: '',
        body_functions: '', activities_participation: '', environmental_factors: '',
        data_description: '', analysis: '', plan_action: '',
        content: '', patient_response: '', techniques_used: '', next_session_goals: '',
        mood_rating: 3, engagement_rating: 3,
    }
    const [form, setForm] = useState(emptyForm)

    const fetchEvolutions = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filterPatientId) params.append('patient_id', filterPatientId)
            if (filterStartDate) params.append('start_date', filterStartDate)
            if (filterEndDate) params.append('end_date', filterEndDate)
            
            const queryString = params.toString()
            const url = queryString ? `/api/session-evolutions?${queryString}` : '/api/session-evolutions'

            const res = await fetch(url)
            if (res.ok) { const d = await res.json(); setEvolutions(d.data || []) }
        } catch { toast.error('Erro ao carregar evoluções') }
        finally { setLoading(false) }
    }, [filterPatientId, filterStartDate, filterEndDate])

    useEffect(() => { fetchEvolutions() }, [fetchEvolutions])

    useEffect(() => {
        // Busca o usuário logado para controle de bloqueio e role
        fetch('/api/auth/me').then(r => r.json()).then(d => {
            if (d?.id) setCurrentUserId(d.id)
            if (d?.role) setCurrentUserRole(d.role)
        }).catch(() => {
            // Fallback: tenta pelo supabase diretamente
        })
        fetch('/api/patients').then(r => r.json()).then(d => setPatients(d.data || d.patients || []))
        fetch('/api/doctors').then(r => r.json()).then(d => setDoctors(d.data || d.doctors || []))
    }, [])

    // Auto-preenche profissional quando usuário é DOCTOR (terapeuta só vê seu próprio nome)
    useEffect(() => {
        if (currentUserRole === 'DOCTOR' && currentUserId && doctors.length > 0) {
            const myDoctor = doctors.find((d: any) => d.user_id === currentUserId)
            if (myDoctor) {
                setCurrentDoctorId(myDoctor.id)
                setForm(prev => ({ ...prev, doctor_id: myDoctor.id }))
            }
        }
    }, [currentUserRole, currentUserId, doctors])

    // Helper: retorna form vazio preservando doctor_id para DOCTOR
    const getResetForm = () => {
        if (currentUserRole === 'DOCTOR' && currentDoctorId) {
            return { ...emptyForm, doctor_id: currentDoctorId }
        }
        return emptyForm
    }

    const handleSave = async (openSignatureModal = false, shouldFinalize = false) => {
        if (!form.patient_id || !form.doctor_id) { toast.error('Selecione paciente e profissional'); return }
        (openSignatureModal || shouldFinalize) ? setFinalizing(true) : setSaving(true)
        try {
            const url = editingId ? `/api/session-evolutions/${editingId}` : '/api/session-evolutions'
            const method = editingId ? 'PUT' : 'POST'
            const isFinalizing = openSignatureModal || shouldFinalize
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, template_type: templateType, finalize: isFinalizing }) 
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `Erro ${res.status}`)
            }
            const savedData = await res.json()
            const recordId = editingId || savedData.data?.id || savedData.id
            
            toast.success('Rascunho salvo com sucesso!')
            fetchEvolutions()
            
            if (openSignatureModal && recordId) {
                setRecordToSign(recordId)
                setSignModalOpen(true)
            } else {
                setShowDialog(false)
                setForm(getResetForm())
                setEditingId(null)
            }
        } catch (err: any) { toast.error(err.message || 'Erro ao salvar evolução') }
        finally { setSaving(false); setFinalizing(false) }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/session-evolutions/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Erro ao excluir')
            }
            toast.success('Excluída'); fetchEvolutions()
        } catch (err: any) { toast.error(err.message || 'Erro') }
    }

    const openEdit = (ev: any) => {
        setEditingId(ev.id)
        setTemplateType(ev.template_type)
        setForm({
            patient_id: ev.patient_id, doctor_id: ev.doctor_id, appointment_id: ev.appointment_id || '',
            plan_id: ev.plan_id || '', evolution_date: ev.evolution_date, template_type: ev.template_type,
            subjective: ev.subjective || '', objective: ev.objective || '', assessment: ev.assessment || '', plan_notes: ev.plan_notes || '',
            body_functions: ev.body_functions || '', activities_participation: ev.activities_participation || '', environmental_factors: ev.environmental_factors || '',
            data_description: ev.data_description || '', analysis: ev.analysis || '', plan_action: ev.plan_action || '',
            content: ev.content || '', patient_response: ev.patient_response || '', techniques_used: ev.techniques_used || '',
            next_session_goals: ev.next_session_goals || '', mood_rating: ev.mood_rating || 3, engagement_rating: ev.engagement_rating || 3,
        })
        setShowDialog(true)
    }

    const getName = (obj: any) => {
        const o = Array.isArray(obj) ? obj[0] : obj
        return o?.full_name || (o?.users ? (Array.isArray(o.users) ? o.users[0]?.full_name : o.users?.full_name) : 'N/A')
    }

    // Verifica se o usuário atual pode editar esta evolução
    const canEdit = (ev: any) => {
        // Se foi finalizada por outro usuário, bloqueia
        if (ev.finalized_by && ev.finalized_by !== currentUserId) return false
        // Se foi criada por outro usuário e já está finalizada, bloqueia
        if (ev.finalized_at) return false
        return true
    }

    const isFinalized = (ev: any) => !!ev.finalized_at

    const filtered = evolutions.filter(e => getName(e.patients).toLowerCase().includes(search.toLowerCase()))

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <TrendingUp className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Evolução por Sessão</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Notas de evolução pós-atendimento (SOAP, CIF, DAP ou Livre)</p>
                    </div>
                </div>
                <Dialog open={showDialog} onOpenChange={o => { setShowDialog(o); if (!o) { setForm(getResetForm()); setEditingId(null) } }}>
                    <DialogTrigger asChild><Button className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9 px-4 text-xs font-medium"><Plus className="h-4 w-4 mr-2" /> Nova Evolução</Button></DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Nova'} Evolução</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Paciente *</Label>
                                    <PatientSearchCombobox
                                        value={form.patient_id}
                                        onSelect={(patient) => setForm(p => ({ ...p, patient_id: patient?.id || '' }))}
                                        onCreateNew={() => window.open('/dashboard/pacientes', '_blank')}
                                        placeholder="Buscar paciente por nome, CPF..."
                                        doctorId={currentUserRole === 'DOCTOR' && currentDoctorId ? currentDoctorId : undefined}
                                    />
                                </div>
                                <div>
                                    <Label>Profissional *</Label>
                                    <Select value={form.doctor_id} onValueChange={v => setForm(p => ({ ...p, doctor_id: v }))} disabled={currentUserRole === 'DOCTOR' && !!currentDoctorId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>{(currentUserRole === 'DOCTOR' && currentDoctorId ? doctors.filter((d: any) => d.id === currentDoctorId) : doctors).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.user?.full_name || d.full_name || d.id}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Data</Label><Input type="date" value={form.evolution_date} onChange={e => setForm(p => ({ ...p, evolution_date: e.target.value }))} /></div>
                                <div>
                                    <Label>Template</Label>
                                    <Select value={templateType} onValueChange={v => { setTemplateType(v); setForm(p => ({ ...p, template_type: v })) }}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.entries(TEMPLATE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {templateType === 'soap' && (
                                <div className="space-y-3 border rounded-lg p-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground">SOAP</h4>
                                    <div><Label>S — Subjetivo</Label><Textarea placeholder="Relato do paciente, queixas, percepções..." value={form.subjective} onChange={e => setForm(p => ({ ...p, subjective: e.target.value }))} rows={3} /></div>
                                    <div><Label>O — Objetivo</Label><Textarea placeholder="Observações do profissional, dados mensuráveis..." value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} rows={3} /></div>
                                    <div><Label>A — Avaliação</Label><Textarea placeholder="Análise clínica, interpretação dos dados..." value={form.assessment} onChange={e => setForm(p => ({ ...p, assessment: e.target.value }))} rows={3} /></div>
                                    <div><Label>P — Plano</Label><Textarea placeholder="Próximos passos, encaminhamentos..." value={form.plan_notes} onChange={e => setForm(p => ({ ...p, plan_notes: e.target.value }))} rows={3} /></div>
                                </div>
                            )}
                            {templateType === 'cif' && (
                                <div className="space-y-3 border rounded-lg p-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground">CIF — Classificação Internacional de Funcionalidade</h4>
                                    <div><Label>Funções do Corpo</Label><Textarea placeholder="Funções mentais, sensoriais, motoras..." value={form.body_functions} onChange={e => setForm(p => ({ ...p, body_functions: e.target.value }))} rows={3} /></div>
                                    <div><Label>Atividades e Participação</Label><Textarea placeholder="Aprendizagem, comunicação, mobilidade, autocuidado..." value={form.activities_participation} onChange={e => setForm(p => ({ ...p, activities_participation: e.target.value }))} rows={3} /></div>
                                    <div><Label>Fatores Ambientais</Label><Textarea placeholder="Produtos, tecnologia, apoio, atitudes, serviços..." value={form.environmental_factors} onChange={e => setForm(p => ({ ...p, environmental_factors: e.target.value }))} rows={3} /></div>
                                </div>
                            )}
                            {templateType === 'dap' && (
                                <div className="space-y-3 border rounded-lg p-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground">DAP — Dados, Avaliação, Plano</h4>
                                    <div><Label>D — Dados</Label><Textarea placeholder="Dados observados e relatados..." value={form.data_description} onChange={e => setForm(p => ({ ...p, data_description: e.target.value }))} rows={3} /></div>
                                    <div><Label>A — Avaliação</Label><Textarea placeholder="Análise e interpretação dos dados..." value={form.analysis} onChange={e => setForm(p => ({ ...p, analysis: e.target.value }))} rows={3} /></div>
                                    <div><Label>P — Plano</Label><Textarea placeholder="Plano de ação para próximas sessões..." value={form.plan_action} onChange={e => setForm(p => ({ ...p, plan_action: e.target.value }))} rows={3} /></div>
                                </div>
                            )}
                            {templateType === 'multidisciplinar' && (
                                <div className="space-y-3 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4 bg-emerald-50/10 dark:bg-emerald-950/5">
                                    <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">Template Multidisciplinar</h4>
                                    <div>
                                        <Label>Data e Horário do Atendimento</Label>
                                        <Input placeholder="Ex: 25/05/2026 às 14:00" value={form.data_description} onChange={e => setForm(p => ({ ...p, data_description: e.target.value }))} />
                                    </div>
                                    <div>
                                        <Label>Objetivo Terapêutico</Label>
                                        <Textarea placeholder="Descreva o objetivo terapêutico da sessão..." value={form.subjective} onChange={e => setForm(p => ({ ...p, subjective: e.target.value }))} rows={3} />
                                    </div>
                                    <div>
                                        <Label>Estratégias/Intervenções Utilizadas</Label>
                                        <Textarea placeholder="Descreva as estratégias e intervenções realizadas..." value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} rows={3} />
                                    </div>
                                    <div>
                                        <Label>Desempenho do Paciente</Label>
                                        <Textarea placeholder="Como foi o desempenho do paciente na sessão..." value={form.assessment} onChange={e => setForm(p => ({ ...p, assessment: e.target.value }))} rows={3} />
                                    </div>
                                    <div>
                                        <Label>Intercorrências</Label>
                                        <Textarea placeholder="Houve alguma intercorrência durante o atendimento?" value={form.plan_notes} onChange={e => setForm(p => ({ ...p, plan_notes: e.target.value }))} rows={3} />
                                    </div>
                                    <div>
                                        <Label>Orientações aos Responsáveis</Label>
                                        <Textarea placeholder="Orientações e recomendações passadas aos pais ou responsáveis..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} />
                                    </div>
                                </div>
                            )}
                            {templateType === 'free' && (
                                <div><Label>Conteúdo</Label><Textarea placeholder="Registre livremente a evolução da sessão..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={8} /></div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Resposta do Paciente</Label><Textarea placeholder="Como o paciente reagiu?" value={form.patient_response} onChange={e => setForm(p => ({ ...p, patient_response: e.target.value }))} rows={2} /></div>
                                <div><Label>Técnicas Utilizadas</Label><Textarea placeholder="Técnicas, abordagens, recursos..." value={form.techniques_used} onChange={e => setForm(p => ({ ...p, techniques_used: e.target.value }))} rows={2} /></div>
                            </div>
                            <div><Label>Objetivos para Próxima Sessão</Label><Input value={form.next_session_goals} onChange={e => setForm(p => ({ ...p, next_session_goals: e.target.value }))} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Humor do Paciente: {MOOD_LABELS[(form.mood_rating || 3) - 1]}</Label>
                                    <Input type="range" min={1} max={5} value={form.mood_rating} onChange={e => setForm(p => ({ ...p, mood_rating: parseInt(e.target.value) }))} />
                                </div>
                                <div>
                                    <Label>Engajamento: {MOOD_LABELS[(form.engagement_rating || 3) - 1]}</Label>
                                    <Input type="range" min={1} max={5} value={form.engagement_rating} onChange={e => setForm(p => ({ ...p, engagement_rating: parseInt(e.target.value) }))} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => { setShowDialog(false); setForm(getResetForm()); setEditingId(null) }}>Cancelar</Button>
                            <Button variant="outline" onClick={() => handleSave(false, false)} disabled={saving || finalizing}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Salvar Rascunho
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={saving || finalizing}>
                                        {finalizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Finalizar
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Finalizar Evolução</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Como deseja finalizar esta evolução? Após finalizada, ela será bloqueada para edições.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="flex flex-col gap-3 my-4">
                                        <Button variant="outline" onClick={() => handleSave(false, true)} className="justify-start">
                                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                            Assinatura Simples (Sem Certificado)
                                        </Button>
                                        <Button variant="outline" onClick={() => handleSave(true, false)} className="justify-start border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/30">
                                            <Shield className="h-4 w-4 mr-2 text-green-600" />
                                            Assinar com Certificado ICP-Brasil
                                        </Button>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {recordToSign && (
                    <SignDocumentModal
                        open={signModalOpen}
                        onOpenChange={(open) => {
                            setSignModalOpen(open)
                            if (!open) {
                                setShowDialog(false)
                                setForm(getResetForm())
                                setEditingId(null)
                                setRecordToSign(null)
                                fetchEvolutions()
                            }
                        }}
                        recordId={recordToSign}
                        documentType="evolucao"
                        apiEndpoint="/api/session-evolutions/sign"
                        payloadKey="evolution_id"
                        onSuccess={() => {
                            toast.success('Evolução assinada com certificado ICP-Brasil!')
                            fetchEvolutions()
                        }}
                    />
                )}
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Filtrar por Paciente (Completo no Banco)</Label>
                        <PatientSearchCombobox
                            value={filterPatientId}
                            onSelect={(patient) => setFilterPatientId(patient?.id || '')}
                            onCreateNew={() => window.open('/dashboard/pacientes', '_blank')}
                            placeholder="Buscar paciente para listar histórico..."
                            doctorId={currentUserRole === 'DOCTOR' && currentDoctorId ? currentDoctorId : undefined}
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Data Inicial</Label>
                        <Input
                            type="date"
                            value={filterStartDate}
                            onChange={e => setFilterStartDate(e.target.value)}
                            className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/20 text-sm font-medium"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Data Final</Label>
                        <Input
                            type="date"
                            value={filterEndDate}
                            onChange={e => setFilterEndDate(e.target.value)}
                            className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/20 text-sm font-medium"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <Input 
                            placeholder="Pesquisa rápida em tela..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="pl-11 pr-4 h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80" 
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    {(filterPatientId || filterStartDate || filterEndDate || search) && (
                        <Button 
                            variant="ghost" 
                            onClick={() => {
                                setFilterPatientId('')
                                setFilterStartDate('')
                                setFilterEndDate('')
                                setSearch('')
                            }}
                            className="rounded-xl h-11 px-5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                        >
                            Limpar Filtros
                        </Button>
                    )}
                </div>
            </div>

            {filtered.length === 0 ? (
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40"><CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <FileEdit className="h-8 w-8 text-slate-400" />
                    </div>
                    {evolutions.length === 0 ? (
                        <>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Nenhuma evolução registrada</p>
                            <p className="text-sm text-slate-400 mb-4">Clique no botão acima para registrar a primeira evolução</p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhuma evolução encontrada para &quot;{search}&quot;</p>
                            <p className="text-sm text-slate-400 mt-2">Tente buscar por outro nome</p>
                        </>
                    )}
                </CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((ev: any) => (
                        <Card key={ev.id} className={`rounded-2xl border shadow-sm bg-white dark:bg-slate-900/40 hover:shadow-md transition-all duration-200 group ${isFinalized(ev) ? 'border-green-200 dark:border-green-900/50' : 'border-slate-100 dark:border-slate-800/80'}`}>
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <span className="font-semibold">{getName(ev.patients)}</span>
                                            <Badge variant="outline">{TEMPLATE_LABELS[ev.template_type]}</Badge>
                                            <span className="text-sm text-muted-foreground">{new Date(ev.evolution_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            {isFinalized(ev) && (
                                                <Badge className="bg-green-600 text-white gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Finalizada
                                                </Badge>
                                            )}
                                            {isFinalized(ev) && ev.signature_hash && ev.signed_at ? (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Shield className="h-3 w-3 text-emerald-600" />
                                                    Assinatura ICP-Brasil ({new Date(ev.signed_at).toLocaleString('pt-BR')})
                                                </span>
                                            ) : isFinalized(ev) && !ev.signature_hash ? (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                    Assinatura Simples ({new Date(ev.finalized_at).toLocaleString('pt-BR')})
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Profissional: {getName(ev.doctors)}</p>
                                        {expandedEvolutions.has(ev.id) ? (
                                            <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/40 space-y-3 text-sm">
                                                {ev.template_type === 'soap' && (
                                                    <>
                                                        <div><strong className="text-slate-500">S — Subjetivo:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.subjective || '-'}</p></div>
                                                        <div><strong className="text-slate-500">O — Objetivo:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.objective || '-'}</p></div>
                                                        <div><strong className="text-slate-500">A — Avaliação:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.assessment || '-'}</p></div>
                                                        <div><strong className="text-slate-500">P — Plano:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.plan_notes || '-'}</p></div>
                                                    </>
                                                )}
                                                {ev.template_type === 'cif' && (
                                                    <>
                                                        <div><strong className="text-slate-500">Funções do Corpo:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.body_functions || '-'}</p></div>
                                                        <div><strong className="text-slate-500">Atividades e Participação:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.activities_participation || '-'}</p></div>
                                                        <div><strong className="text-slate-500">Fatores Ambientais:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.environmental_factors || '-'}</p></div>
                                                    </>
                                                )}
                                                {ev.template_type === 'dap' && (
                                                    <>
                                                        <div><strong className="text-slate-500">D — Dados:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.data_description || '-'}</p></div>
                                                        <div><strong className="text-slate-500">A — Avaliação:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.analysis || '-'}</p></div>
                                                        <div><strong className="text-slate-500">P — Plano:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.plan_action || '-'}</p></div>
                                                    </>
                                                )}
                                                {ev.template_type === 'multidisciplinar' && (
                                                    <>
                                                        <div><strong className="text-emerald-600 dark:text-emerald-400">Data e Horário do Atendimento:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.data_description || '-'}</p></div>
                                                        <div><strong className="text-emerald-600 dark:text-emerald-400">Objetivo Terapêutico:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.subjective || '-'}</p></div>
                                                        <div><strong className="text-emerald-600 dark:text-emerald-400">Estratégias/Intervenções Utilizadas:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.objective || '-'}</p></div>
                                                        <div><strong className="text-emerald-600 dark:text-emerald-400">Desempenho do Paciente:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.assessment || '-'}</p></div>
                                                        <div><strong className="text-emerald-600 dark:text-emerald-400">Intercorrências:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.plan_notes || '-'}</p></div>
                                                        <div><strong className="text-emerald-600 dark:text-emerald-400">Orientações aos Responsáveis:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.content || '-'}</p></div>
                                                    </>
                                                )}
                                                {ev.template_type === 'free' && (
                                                    <div><strong className="text-slate-500">Conteúdo:</strong> <p className="mt-1 whitespace-pre-wrap">{ev.content || '-'}</p></div>
                                                )}

                                                <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                    <div><strong className="text-slate-500">Resposta do Paciente:</strong> <p className="mt-1">{ev.patient_response || '-'}</p></div>
                                                    <div><strong className="text-slate-500">Técnicas Utilizadas:</strong> <p className="mt-1">{ev.techniques_used || '-'}</p></div>
                                                    <div className="sm:col-span-2"><strong className="text-slate-500">Objetivos para Próxima Sessão:</strong> <p className="mt-1">{ev.next_session_goals || '-'}</p></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {ev.template_type === 'soap' && ev.subjective && <p className="text-sm mt-1 line-clamp-2"><strong>S:</strong> {ev.subjective}</p>}
                                                {ev.template_type === 'cif' && ev.body_functions && <p className="text-sm mt-1 line-clamp-2"><strong>Funções:</strong> {ev.body_functions}</p>}
                                                {ev.template_type === 'dap' && ev.data_description && <p className="text-sm mt-1 line-clamp-2"><strong>D:</strong> {ev.data_description}</p>}
                                                {ev.template_type === 'multidisciplinar' && ev.subjective && <p className="text-sm mt-1 line-clamp-2"><strong>Objetivo:</strong> {ev.subjective}</p>}
                                                {ev.template_type === 'free' && ev.content && <p className="text-sm mt-1 line-clamp-2">{ev.content}</p>}
                                            </>
                                        )}
                                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                            {ev.mood_rating && <span>Humor: {MOOD_LABELS[ev.mood_rating - 1]}</span>}
                                            {ev.engagement_rating && <span>Engajamento: {MOOD_LABELS[ev.engagement_rating - 1]}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-4 items-center">
                                        <Button variant="outline" size="sm" className="text-xs h-8 px-2.5 gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 border" onClick={() => toggleExpand(ev.id)}>
                                            {expandedEvolutions.has(ev.id) ? (
                                                <>
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                    Recolher
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                    Visualizar
                                                </>
                                            )}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Imprimir / Exportar PDF" onClick={() => window.open(`/api/session-evolutions/pdf?id=${ev.id}`, '_blank')}>
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        {canEdit(ev) ? (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(ev)} title="Editar evolução">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive" title="Excluir evolução">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta ação não poderá ser desfeita.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(ev.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground px-2" title="Evolução finalizada — bloqueada para edição">
                                                <Lock className="h-4 w-4 text-green-600" />
                                                <span className="hidden sm:inline">Bloqueada</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
