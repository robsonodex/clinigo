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
import { Plus, Edit, Trash2, Loader2, Search, FileEdit, Smile, Frown, Meh, SmilePlus, Angry } from 'lucide-react'
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox'
import { toast } from 'sonner'

const TEMPLATE_LABELS: Record<string, string> = { free: 'Livre', soap: 'SOAP', cif: 'CIF', dap: 'DAP' }
const MOOD_ICONS = [Angry, Frown, Meh, Smile, SmilePlus]
const MOOD_LABELS = ['Muito Baixo', 'Baixo', 'Neutro', 'Bom', 'Excelente']

export default function SessionEvolutionsPage() {
    const [evolutions, setEvolutions] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [templateType, setTemplateType] = useState('soap')

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
        try {
            const res = await fetch('/api/session-evolutions')
            if (res.ok) { const d = await res.json(); setEvolutions(d.data || []) }
        } catch { toast.error('Erro ao carregar evoluções') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchEvolutions() }, [fetchEvolutions])
    useEffect(() => {
        fetch('/api/patients').then(r => r.json()).then(d => setPatients(d.data || d.patients || []))
        fetch('/api/doctors').then(r => r.json()).then(d => setDoctors(d.data || d.doctors || []))
    }, [])

    const handleSave = async () => {
        if (!form.patient_id || !form.doctor_id) { toast.error('Selecione paciente e profissional'); return }
        setSaving(true)
        try {
            const url = editingId ? `/api/session-evolutions/${editingId}` : '/api/session-evolutions'
            const method = editingId ? 'PUT' : 'POST'
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, template_type: templateType }) })
            if (!res.ok) throw new Error()
            toast.success(editingId ? 'Evolução atualizada!' : 'Evolução registrada!')
            setShowDialog(false); setForm(emptyForm); setEditingId(null); fetchEvolutions()
        } catch { toast.error('Erro ao salvar') }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta evolução?')) return
        try { await fetch(`/api/session-evolutions/${id}`, { method: 'DELETE' }); toast.success('Excluída'); fetchEvolutions() }
        catch { toast.error('Erro') }
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

    const getName = (obj: any) => { const o = Array.isArray(obj) ? obj[0] : obj; return o?.full_name || (o?.users ? (Array.isArray(o.users) ? o.users[0]?.full_name : o.users?.full_name) : 'N/A') }

    const filtered = evolutions.filter(e => getName(e.patients).toLowerCase().includes(search.toLowerCase()))

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Evolução por Sessão</h1>
                    <p className="text-muted-foreground">Notas de evolução pós-atendimento (SOAP, CIF, DAP ou Livre)</p>
                </div>
                <Dialog open={showDialog} onOpenChange={o => { setShowDialog(o); if (!o) { setForm(emptyForm); setEditingId(null) } }}>
                    <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova Evolução</Button></DialogTrigger>
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
                                    />
                                </div>
                                <div>
                                    <Label>Profissional *</Label>
                                    <Select value={form.doctor_id} onValueChange={v => setForm(p => ({ ...p, doctor_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.user?.full_name || d.full_name || d.id}</SelectItem>)}</SelectContent>
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
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setShowDialog(false); setForm(emptyForm); setEditingId(null) }}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>

            {filtered.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                    <FileEdit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {evolutions.length === 0 ? (
                        <>
                            <p className="font-medium text-foreground mb-2">Nenhuma evolução registrada</p>
                            <p className="text-sm mb-4">Clique no botão abaixo para registrar a primeira evolução.</p>
                            <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" /> Registrar Primeira Evolução</Button>
                        </>
                    ) : (
                        <>
                            <p>Nenhuma evolução encontrada para &quot;{search}&quot;</p>
                            <p className="text-sm mt-2">Tente buscar por outro nome.</p>
                        </>
                    )}
                </CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((ev: any) => (
                        <Card key={ev.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-semibold">{getName(ev.patients)}</span>
                                            <Badge variant="outline">{TEMPLATE_LABELS[ev.template_type]}</Badge>
                                            <span className="text-sm text-muted-foreground">{new Date(ev.evolution_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Profissional: {getName(ev.doctors)}</p>
                                        {ev.template_type === 'soap' && ev.subjective && <p className="text-sm mt-1 line-clamp-2"><strong>S:</strong> {ev.subjective}</p>}
                                        {ev.template_type === 'cif' && ev.body_functions && <p className="text-sm mt-1 line-clamp-2"><strong>Funções:</strong> {ev.body_functions}</p>}
                                        {ev.template_type === 'dap' && ev.data_description && <p className="text-sm mt-1 line-clamp-2"><strong>D:</strong> {ev.data_description}</p>}
                                        {ev.template_type === 'free' && ev.content && <p className="text-sm mt-1 line-clamp-2">{ev.content}</p>}
                                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                            {ev.mood_rating && <span>Humor: {MOOD_LABELS[ev.mood_rating - 1]}</span>}
                                            {ev.engagement_rating && <span>Engajamento: {MOOD_LABELS[ev.engagement_rating - 1]}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-4">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
