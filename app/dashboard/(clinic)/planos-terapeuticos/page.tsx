'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Plus, Edit, Trash2, Target, TrendingUp, Loader2, Search, ClipboardList, Printer } from 'lucide-react'
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = { active: 'Ativo', paused: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado' }
const STATUS_COLORS: Record<string, string> = { active: 'default', paused: 'secondary', completed: 'outline', cancelled: 'destructive' }
const GOAL_STATUS: Record<string, string> = { pending: 'Pendente', in_progress: 'Em Andamento', achieved: 'Alcançado', not_achieved: 'Não Alcançado' }
const PRIORITY_LABELS: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' }

export default function TherapeuticPlansPage() {
    const [plans, setPlans] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showDialog, setShowDialog] = useState(false)
    const [editingPlan, setEditingPlan] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null)

    const [form, setForm] = useState({
        patient_id: '', doctor_id: '', title: '', diagnosis: '', cid_code: '',
        objectives: '', methodology: '', frequency: '', estimated_duration: '',
        start_date: new Date().toISOString().split('T')[0], end_date: '', review_date: '',
        status: 'active', notes: '', goals: [] as any[]
    })

    const fetchPlans = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'all') params.set('status', statusFilter)
            const res = await fetch(`/api/therapeutic-plans?${params}`)
            if (res.ok) {
                const data = await res.json()
                setPlans(data.data || [])
            }
        } catch { toast.error('Erro ao carregar planos') }
        finally { setLoading(false) }
    }, [statusFilter])

    useEffect(() => { fetchPlans() }, [fetchPlans])

    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(d => {
            if (d?.id) setCurrentUserId(d.id)
            if (d?.role) setCurrentUserRole(d.role)
        }).catch(() => {})
        fetch('/api/patients').then(r => r.json()).then(d => setPatients(d.data || d.patients || []))
        fetch('/api/doctors').then(r => r.json()).then(d => setDoctors(d.data || d.doctors || []))
    }, [])

    useEffect(() => {
        if (currentUserRole === 'DOCTOR' && currentUserId && doctors.length > 0) {
            const myDoctor = doctors.find((d: any) => d.user_id === currentUserId)
            if (myDoctor) {
                setCurrentDoctorId(myDoctor.id)
                setForm(prev => ({ ...prev, doctor_id: myDoctor.id }))
            }
        }
    }, [currentUserRole, currentUserId, doctors])

    const handleSave = async () => {
        if (!form.patient_id || !form.doctor_id || !form.title) {
            toast.error('Preencha paciente, profissional e título')
            return
        }
        setSaving(true)
        try {
            const url = editingPlan ? `/api/therapeutic-plans/${editingPlan.id}` : '/api/therapeutic-plans'
            const method = editingPlan ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (!res.ok) throw new Error('Erro ao salvar')
            toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!')
            setShowDialog(false)
            resetForm()
            fetchPlans()
        } catch { toast.error('Erro ao salvar plano') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este plano terapêutico?')) return
        try {
            await fetch(`/api/therapeutic-plans/${id}`, { method: 'DELETE' })
            toast.success('Plano excluído')
            fetchPlans()
        } catch { toast.error('Erro ao excluir') }
    }

    const resetForm = () => {
        setForm({ patient_id: '', doctor_id: (currentUserRole === 'DOCTOR' && currentDoctorId) ? currentDoctorId : '', title: '', diagnosis: '', cid_code: '', objectives: '', methodology: '', frequency: '', estimated_duration: '', start_date: new Date().toISOString().split('T')[0], end_date: '', review_date: '', status: 'active', notes: '', goals: [] })
        setEditingPlan(null)
    }

    const openEdit = (plan: any) => {
        setEditingPlan(plan)
        setForm({
            patient_id: plan.patient_id, doctor_id: plan.doctor_id, title: plan.title,
            diagnosis: plan.diagnosis || '', cid_code: plan.cid_code || '',
            objectives: plan.objectives || '', methodology: plan.methodology || '',
            frequency: plan.frequency || '', estimated_duration: plan.estimated_duration || '',
            start_date: plan.start_date, end_date: plan.end_date || '', review_date: plan.review_date || '',
            status: plan.status, notes: plan.notes || '',
            goals: plan.therapeutic_plan_goals || []
        })
        setShowDialog(true)
    }

    const addGoal = () => {
        setForm(prev => ({ ...prev, goals: [...prev.goals, { title: '', description: '', progress: 0, status: 'pending', priority: 'medium', target_date: '' }] }))
    }

    const updateGoal = (idx: number, field: string, value: any) => {
        setForm(prev => ({ ...prev, goals: prev.goals.map((g: any, i: number) => i === idx ? { ...g, [field]: value } : g) }))
    }

    const removeGoal = (idx: number) => {
        setForm(prev => ({ ...prev, goals: prev.goals.filter((_: any, i: number) => i !== idx) }))
    }

    const getPatientName = (p: any) => (Array.isArray(p) ? p[0]?.full_name : p?.full_name) || 'N/A'
    const getDoctorName = (d: any) => {
        const doc = Array.isArray(d) ? d[0] : d
        const u = doc?.users ? (Array.isArray(doc.users) ? doc.users[0] : doc.users) : null
        return u?.full_name || 'N/A'
    }

    const calcProgress = (goals: any[]) => {
        if (!goals?.length) return 0
        return Math.round(goals.reduce((s: number, g: any) => s + (g.progress || 0), 0) / goals.length)
    }

    const filtered = plans.filter(p => {
        const name = getPatientName(p.patients).toLowerCase()
        return name.includes(search.toLowerCase()) || p.title.toLowerCase().includes(search.toLowerCase())
    })

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Planos Terapêuticos</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie os planos terapêuticos individuais dos pacientes</p>
                    </div>
                </div>
                <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm() }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 px-5 text-sm font-semibold"><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingPlan ? 'Editar' : 'Novo'} Plano Terapêutico</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="info">
                            <TabsList className="mb-4">
                                <TabsTrigger value="info">Informações</TabsTrigger>
                                <TabsTrigger value="goals">Metas ({form.goals.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="info" className="space-y-4">
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
                                            <SelectContent>
                                                {(currentUserRole === 'DOCTOR' && currentDoctorId ? doctors.filter((d: any) => d.id === currentDoctorId) : doctors).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.user?.full_name || d.full_name || d.id}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Título do Plano *</Label>
                                    <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Plano de Intervenção ABA" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>Diagnóstico</Label><Input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Ex: TEA - F84.0" /></div>
                                    <div><Label>CID</Label><Input value={form.cid_code} onChange={e => setForm(p => ({ ...p, cid_code: e.target.value }))} placeholder="F84.0" /></div>
                                </div>
                                <div><Label>Objetivos Gerais</Label><Textarea value={form.objectives} onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))} rows={3} /></div>
                                <div><Label>Metodologia</Label><Textarea value={form.methodology} onChange={e => setForm(p => ({ ...p, methodology: e.target.value }))} rows={2} /></div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><Label>Frequência</Label><Input value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} placeholder="2x por semana" /></div>
                                    <div><Label>Duração Estimada</Label><Input value={form.estimated_duration} onChange={e => setForm(p => ({ ...p, estimated_duration: e.target.value }))} placeholder="6 meses" /></div>
                                    <div>
                                        <Label>Status</Label>
                                        <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><Label>Data Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                                    <div><Label>Data Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
                                    <div><Label>Revisão</Label><Input type="date" value={form.review_date} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} /></div>
                                </div>
                                <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                            </TabsContent>
                            <TabsContent value="goals" className="space-y-4">
                                <Button variant="outline" onClick={addGoal} className="w-full"><Plus className="h-4 w-4 mr-2" /> Adicionar Meta</Button>
                                {form.goals.map((goal: any, idx: number) => (
                                    <Card key={idx}>
                                        <CardContent className="pt-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-3">
                                                    <Input placeholder="Título da meta" value={goal.title} onChange={e => updateGoal(idx, 'title', e.target.value)} />
                                                    <Textarea placeholder="Descrição" value={goal.description || ''} onChange={e => updateGoal(idx, 'description', e.target.value)} rows={2} />
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <Select value={goal.status} onValueChange={v => updateGoal(idx, 'status', v)}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>{Object.entries(GOAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                        <Select value={goal.priority} onValueChange={v => updateGoal(idx, 'priority', v)}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>{Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                        <div className="flex items-center gap-2">
                                                            <Input type="number" min={0} max={100} value={goal.progress} onChange={e => updateGoal(idx, 'progress', parseInt(e.target.value) || 0)} className="w-20" />
                                                            <span className="text-sm text-muted-foreground">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => removeGoal(idx)} className="ml-2 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </TabsContent>
                        </Tabs>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm() }}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Barra de Busca Premium */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <Input placeholder="Buscar por paciente ou título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 pr-4 h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {filtered.length === 0 ? (
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40"><CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-slate-400" />
                    </div>
                    {plans.length === 0 ? (
                        <>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Nenhum plano terapêutico cadastrado</p>
                            <p className="text-sm text-slate-400 mb-4">Crie o primeiro plano usando o botão acima</p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum plano encontrado para &quot;{search}&quot;</p>
                            <p className="text-sm text-slate-400 mt-2">Tente buscar por outro nome ou título</p>
                        </>
                    )}
                </CardContent></Card>
            ) : (
                <div className="grid gap-4">
                    {filtered.map((plan: any) => {
                        const progress = calcProgress(plan.therapeutic_plan_goals)
                        return (
                            <Card key={plan.id} className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 hover:shadow-md transition-all duration-200 group">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-lg">{plan.title}</h3>
                                                <Badge variant={STATUS_COLORS[plan.status] as any}>{STATUS_LABELS[plan.status]}</Badge>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                                                <div><span className="font-medium text-foreground">Paciente:</span> {getPatientName(plan.patients)}</div>
                                                <div><span className="font-medium text-foreground">Profissional:</span> {getDoctorName(plan.doctors)}</div>
                                                <div><span className="font-medium text-foreground">CID:</span> {plan.cid_code || '-'}</div>
                                                <div><span className="font-medium text-foreground">Frequência:</span> {plan.frequency || '-'}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Progresso geral</span>
                                                        <span className="font-medium">{progress}%</span>
                                                    </div>
                                                    <Progress value={progress} className="h-2" />
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Target className="h-4 w-4" />
                                                    {plan.therapeutic_plan_goals?.length || 0} metas
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 ml-4">
                                            <Button variant="ghost" size="icon" title="Imprimir / Exportar PDF" onClick={() => window.open(`/api/therapeutic-plans/pdf?id=${plan.id}`, '_blank')}>
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
