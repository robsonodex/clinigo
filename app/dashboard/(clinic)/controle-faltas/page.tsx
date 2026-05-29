'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Settings, RefreshCcw, Loader2, AlertTriangle, CheckCircle, XCircle, Clock, Copy, Trash, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

const REASON_LABELS: Record<string, string> = { no_show: 'Faltou', cancelled_late: 'Cancelou tarde', cancelled_early: 'Cancelou antecipado', other: 'Outro' }
const STATUS_LABELS: Record<string, string> = { pending: 'Pendente', scheduled: 'Agendada', completed: 'Realizada', expired: 'Expirada' }
const STATUS_ICONS: Record<string, any> = { pending: Clock, scheduled: RefreshCcw, completed: CheckCircle, expired: XCircle }

export default function AbsenceControlPage() {
    const [rules, setRules] = useState<any[]>([])
    const [replacements, setReplacements] = useState<any[]>([])
    const [packages, setPackages] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showRuleDialog, setShowRuleDialog] = useState(false)
    const [showPackageDialog, setShowPackageDialog] = useState(false)
    const [saving, setSaving] = useState(false)

    const [ruleForm, setRuleForm] = useState({
        name: 'Regra Padrão', min_notice_hours: 24, charge_no_show: false,
        no_show_fee_percentage: 100, max_reschedules: 2, allow_replacement: true,
        replacement_deadline_days: 30, is_active: true,
    })

    const [pkgForm, setPkgForm] = useState({
        patient_id: '', doctor_id: '', name: '', total_sessions: 10,
        used_sessions: 0, price_per_session: '', total_price: '', start_date: new Date().toISOString().split('T')[0],
        expiry_date: '', status: 'active', notes: '',
    })

    const fetchAll = useCallback(async () => {
        try {
            const [rulesRes, replacementsRes, packagesRes] = await Promise.all([
                fetch('/api/absence-rules'), fetch('/api/session-replacements'), fetch('/api/session-packages')
            ])
            if (rulesRes.ok) { const d = await rulesRes.json(); setRules(d.data || []) }
            if (replacementsRes.ok) { const d = await replacementsRes.json(); setReplacements(d.data || []) }
            if (packagesRes.ok) { const d = await packagesRes.json(); setPackages(d.data || []) }
        } catch { toast.error('Erro ao carregar dados') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])
    useEffect(() => {
        fetch('/api/patients').then(r => r.json()).then(d => setPatients(d.data || d.patients || []))
        fetch('/api/doctors').then(r => r.json()).then(d => setDoctors(d.data || d.doctors || []))
    }, [])

    const setTemplate = (type: 'strict' | 'flexible' | 'standard') => {
        if (type === 'strict') setRuleForm({...ruleForm, name: 'Cancelamento Tardio (Cobra Sessão)', min_notice_hours: 24, charge_no_show: true, no_show_fee_percentage: 100, allow_replacement: false})
        if (type === 'flexible') setRuleForm({...ruleForm, name: 'Plano Flexível (Direito à Reposição)', min_notice_hours: 12, charge_no_show: false, allow_replacement: true, replacement_deadline_days: 60})
        if (type === 'standard') setRuleForm({...ruleForm, name: 'Regra Padrão (Falta Injustificada)', min_notice_hours: 24, charge_no_show: false, allow_replacement: true, replacement_deadline_days: 30})
    }

    const saveRule = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/absence-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ruleForm) })
            if (!res.ok) throw new Error()
            toast.success('Regra salva!'); setShowRuleDialog(false); fetchAll()
        } catch { toast.error('Erro ao salvar regra') }
        finally { setSaving(false) }
    }

    const savePackage = async () => {
        if (!pkgForm.patient_id || !pkgForm.doctor_id || !pkgForm.name) { toast.error('Preencha os campos obrigatórios'); return }
        setSaving(true)
        try {
            const res = await fetch('/api/session-packages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pkgForm) })
            if (!res.ok) throw new Error()
            toast.success('Pacote criado!'); setShowPackageDialog(false); fetchAll()
            setPkgForm({ patient_id: '', doctor_id: '', name: '', total_sessions: 10, used_sessions: 0, price_per_session: '', total_price: '', start_date: new Date().toISOString().split('T')[0], expiry_date: '', status: 'active', notes: '' })
        } catch { toast.error('Erro ao criar pacote') }
        finally { setSaving(false) }
    }

    const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
        toast.info('Atualizando status...')
        // Placeholder for API call: Atualizar status via PUT
        // await fetch(`/api/absence-rules/${ruleId}`, { method: 'PUT', body: JSON.stringify({ is_active: !currentStatus }) })
        // fetchAll()
    }

    const sendWhatsApp = (phone: string, text: string) => {
        if (!phone) { toast.error('Paciente sem telefone cadastrado.'); return }
        window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
    }

    const getName = (obj: any) => { const o = Array.isArray(obj) ? obj[0] : obj; return o?.full_name || (o?.users ? (Array.isArray(o.users) ? o.users[0]?.full_name : o.users?.full_name) : 'N/A') }

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}>
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Controle de Faltas e Pacotes</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie regras de ausência, reposições e pacotes de sessões</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Summary Cards Premium */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reposições Pendentes</CardTitle>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}>
                            <RefreshCcw className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{replacements.filter(r => r.status === 'pending').length}</div>
                        <p className="text-[10px] text-slate-400 mt-1">Sessões aguardando agendamento</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pacotes Ativos</CardTitle>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                            <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{packages.filter(p => p.status === 'active').length}</div>
                        <p className="text-[10px] text-slate-400 mt-1">Pacotes em andamento</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regras Ativas</CardTitle>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9, #2563EB)' }}>
                            <Settings className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{rules.filter(r => r.is_active).length}</div>
                        <p className="text-[10px] text-slate-400 mt-1">Controlando a agenda automaticamente</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sinal de Alerta</CardTitle>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                            <XCircle className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{replacements.length > 0 ? 'Monitorando' : 'Saudável'}</div>
                        <p className="text-[10px] text-slate-400 mt-1">Baseado nas faltas recentes registradas</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="rules">
                <TabsList className="mb-4">
                    <TabsTrigger value="rules" className="gap-2"><Settings className="h-4 w-4" /> Regras</TabsTrigger>
                    <TabsTrigger value="replacements" className="gap-2">
                        <RefreshCcw className="h-4 w-4" /> Reposições 
                        {replacements.filter(r => r.status === 'pending').length > 0 && (
                            <Badge className="ml-2 bg-orange-500" variant="secondary">{replacements.filter(r => r.status === 'pending').length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="packages" className="gap-2"><AlertTriangle className="h-4 w-4" /> Pacotes ({packages.length})</TabsTrigger>
                </TabsList>

                {/* REGRAS */}
                <TabsContent value="rules" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button></DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>Nova Regra de Ausência</DialogTitle></DialogHeader>
                                <div className="mb-2">
                                    <Label className="text-xs text-muted-foreground mb-2 block">Templates Rápidos (Autopreencher)</Label>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setTemplate('standard')}>Padrão</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setTemplate('flexible')}>Flexível</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setTemplate('strict')}>Rigorosa</Button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div><Label>Nome da Regra</Label><Input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} /></div>
                                    <div><Label>Aviso Mínimo (horas)</Label><Input type="number" value={ruleForm.min_notice_hours} onChange={e => setRuleForm(p => ({ ...p, min_notice_hours: parseInt(e.target.value) || 0 }))} /></div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                                        <div className="space-y-0.5">
                                            <Label>Cobrar por falta</Label>
                                            <p className="text-xs text-muted-foreground">Exigir pagamento se faltar sem aviso</p>
                                        </div>
                                        <Switch checked={ruleForm.charge_no_show} onCheckedChange={v => setRuleForm(p => ({ ...p, charge_no_show: v }))} />
                                    </div>
                                    {ruleForm.charge_no_show && <div><Label>Percentual da cobrança (%)</Label><Input type="number" value={ruleForm.no_show_fee_percentage} onChange={e => setRuleForm(p => ({ ...p, no_show_fee_percentage: parseFloat(e.target.value) || 0 }))} /></div>}
                                    
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                                        <div className="space-y-0.5">
                                            <Label>Permitir Reposição</Label>
                                            <p className="text-xs text-muted-foreground">Gera um crédito de sessão automaticamente</p>
                                        </div>
                                        <Switch checked={ruleForm.allow_replacement} onCheckedChange={v => setRuleForm(p => ({ ...p, allow_replacement: v }))} />
                                    </div>
                                    {ruleForm.allow_replacement && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><Label>Prazo (dias)</Label><Input type="number" value={ruleForm.replacement_deadline_days} onChange={e => setRuleForm(p => ({ ...p, replacement_deadline_days: parseInt(e.target.value) || 0 }))} /></div>
                                            <div><Label>Máx. Faltas</Label><Input type="number" value={ruleForm.max_reschedules} onChange={e => setRuleForm(p => ({ ...p, max_reschedules: parseInt(e.target.value) || 0 }))} /></div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter><Button onClick={saveRule} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar Regra</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    {rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center border rounded-lg bg-card shadow-sm">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <Settings className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Nenhuma regra definida</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">Estabelecer regras de ausência ajuda a reduzir o absenteísmo, automatiza as reposições e evita prejuízos para a clínica.</p>
                            <Button onClick={() => setShowRuleDialog(true)} size="lg"><Plus className="h-4 w-4 mr-2"/> Criar Primeira Regra</Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {rules.map((rule: any) => (
                                <Card key={rule.id} className={`transition-all ${rule.is_active ? 'border-primary/20 shadow-sm' : 'opacity-60 grayscale-[50%]'}`}>
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg">{rule.name}</h3>
                                                </div>
                                                <Badge variant={rule.is_active ? 'default' : 'secondary'} className="mt-1">{rule.is_active ? 'Ativa' : 'Inativa'}</Badge>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => toggleRuleStatus(rule.id, rule.is_active)} title={rule.is_active ? "Desativar regra temporariamente" : "Ativar regra"}>
                                                    {rule.is_active ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t grid grid-cols-1 gap-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Aviso mín: {rule.min_notice_hours}h</div>
                                            <div className="flex items-center gap-2"><CheckCircle className={`h-4 w-4 ${rule.charge_no_show ? 'text-red-500' : ''}`} /> Cobrança: {rule.charge_no_show ? `${rule.no_show_fee_percentage}% do valor` : 'Não cobrar'}</div>
                                            <div className="flex items-center gap-2"><RefreshCcw className={`h-4 w-4 ${rule.allow_replacement ? 'text-green-500' : ''}`} /> Reposição: {rule.allow_replacement ? `${rule.replacement_deadline_days} dias para usar` : 'Sem direito'}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* REPOSIÇÕES */}
                <TabsContent value="replacements" className="space-y-4">
                    {replacements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center border rounded-lg bg-card shadow-sm">
                            <div className="bg-orange-500/10 p-4 rounded-full mb-4">
                                <RefreshCcw className="h-8 w-8 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Nenhuma reposição pendente</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">As reposições aparecerão aqui automaticamente quando um paciente for marcado como 'Faltou' ou 'Cancelou Tarde' na agenda, baseado nas suas regras.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {replacements.map((rep: any) => {
                                const Icon = STATUS_ICONS[rep.status] || Clock
                                const phone = rep.patients?.phone || ''
                                const ptName = getName(rep.patients)
                                const wppText = `Olá ${ptName}, vimos que você não pôde comparecer à sua última sessão na clínica. Como você possui direito a reposição, gostaria de agendar um novo horário?`
                                
                                return (
                                    <Card key={rep.id} className={rep.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : ''}>
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge variant={rep.status === 'completed' ? 'default' : rep.status === 'expired' ? 'destructive' : rep.status === 'pending' ? 'outline' : 'secondary'} className={rep.status === 'pending' ? 'border-orange-500 text-orange-600 bg-orange-100' : ''}>
                                                    {STATUS_LABELS[rep.status]}
                                                </Badge>
                                                <Icon className={`h-5 w-5 ${rep.status === 'pending' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg">{ptName}</p>
                                                <p className="text-sm text-muted-foreground mt-1">Motivo: {REASON_LABELS[rep.reason]}</p>
                                                {rep.deadline && <p className="text-sm font-medium mt-1">Prazo limite: {new Date(rep.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                                            </div>
                                            {rep.status === 'pending' && (
                                                <div className="mt-4 pt-3 border-t">
                                                    <Button variant="outline" size="sm" className="w-full gap-2 text-green-700 border-green-300 hover:bg-green-50" onClick={() => sendWhatsApp(phone, wppText)}>
                                                        <MessageCircle className="h-4 w-4" /> Enviar Cobrança Wpp
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* PACOTES */}
                <TabsContent value="packages" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
                            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Pacote</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Novo Pacote de Sessões</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label>Paciente *</Label>
                                        <Select value={pkgForm.patient_id} onValueChange={v => setPkgForm(p => ({ ...p, patient_id: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Profissional *</Label>
                                        <Select value={pkgForm.doctor_id} onValueChange={v => setPkgForm(p => ({ ...p, doctor_id: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>{doctors.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.users?.full_name || d.id}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Nome do Pacote *</Label><Input value={pkgForm.name} onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Pacote 20 sessões - Psicologia" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Total de Sessões</Label><Input type="number" value={pkgForm.total_sessions} onChange={e => setPkgForm(p => ({ ...p, total_sessions: parseInt(e.target.value) || 0 }))} /></div>
                                        <div><Label>Valor por Sessão (R$)</Label><Input type="number" step="0.01" value={pkgForm.price_per_session} onChange={e => setPkgForm(p => ({ ...p, price_per_session: e.target.value }))} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Data Início</Label><Input type="date" value={pkgForm.start_date} onChange={e => setPkgForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                                        <div><Label>Validade</Label><Input type="date" value={pkgForm.expiry_date} onChange={e => setPkgForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
                                    </div>
                                </div>
                                <DialogFooter><Button onClick={savePackage} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar Pacote</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    {packages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center border rounded-lg bg-card shadow-sm">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <AlertTriangle className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Nenhum pacote vendido</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">Controle pacotes de sessões vendidos antecipadamente para seus pacientes, rastreando o uso e evitando interrupções no tratamento.</p>
                            <Button onClick={() => setShowPackageDialog(true)} size="lg"><Plus className="h-4 w-4 mr-2"/> Vender Novo Pacote</Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {packages.map((pkg: any) => {
                                const remaining = pkg.total_sessions - pkg.used_sessions
                                const pct = Math.round((pkg.used_sessions / pkg.total_sessions) * 100)
                                return (
                                    <Card key={pkg.id} className={remaining <= 3 ? 'border-orange-300 bg-orange-50/10' : ''}>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                                    <CardDescription className="mt-1">{getName(pkg.patients)} — Prof. {getName(pkg.doctors)}</CardDescription>
                                                </div>
                                                <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>{pkg.status === 'active' ? 'Ativo' : pkg.status}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between text-sm mb-2 font-medium">
                                                <span>{pkg.used_sessions} usadas de {pkg.total_sessions}</span>
                                                <span className={remaining <= 3 ? 'text-orange-600 font-bold' : 'text-green-600'}>{remaining} restantes</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-3">
                                                <div className={`h-3 rounded-full transition-all ${remaining <= 3 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            {remaining <= 3 && remaining > 0 && <p className="text-sm font-medium text-orange-600 mt-3 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Pacote quase esgotado! Ofereça renovação.</p>}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
