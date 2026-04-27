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
import { Plus, Settings, RefreshCcw, Loader2, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
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

    const getName = (obj: any) => { const o = Array.isArray(obj) ? obj[0] : obj; return o?.full_name || (o?.users ? (Array.isArray(o.users) ? o.users[0]?.full_name : o.users?.full_name) : 'N/A') }

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Controle de Faltas e Pacotes</h1>
                <p className="text-muted-foreground">Regras de ausência, reposições e pacotes de sessões</p>
            </div>

            <Tabs defaultValue="rules">
                <TabsList>
                    <TabsTrigger value="rules" className="gap-2"><Settings className="h-4 w-4" /> Regras</TabsTrigger>
                    <TabsTrigger value="replacements" className="gap-2"><RefreshCcw className="h-4 w-4" /> Reposições ({replacements.length})</TabsTrigger>
                    <TabsTrigger value="packages" className="gap-2"><AlertTriangle className="h-4 w-4" /> Pacotes ({packages.length})</TabsTrigger>
                </TabsList>

                {/* REGRAS */}
                <TabsContent value="rules" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Nova Regra de Ausência</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                    <div><Label>Nome da Regra</Label><Input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} /></div>
                                    <div><Label>Aviso Mínimo (horas)</Label><Input type="number" value={ruleForm.min_notice_hours} onChange={e => setRuleForm(p => ({ ...p, min_notice_hours: parseInt(e.target.value) || 0 }))} /></div>
                                    <div className="flex items-center gap-3"><Switch checked={ruleForm.charge_no_show} onCheckedChange={v => setRuleForm(p => ({ ...p, charge_no_show: v }))} /><Label>Cobrar por falta sem aviso</Label></div>
                                    {ruleForm.charge_no_show && <div><Label>Percentual da cobrança (%)</Label><Input type="number" value={ruleForm.no_show_fee_percentage} onChange={e => setRuleForm(p => ({ ...p, no_show_fee_percentage: parseFloat(e.target.value) || 0 }))} /></div>}
                                    <div><Label>Máximo de reagendamentos</Label><Input type="number" value={ruleForm.max_reschedules} onChange={e => setRuleForm(p => ({ ...p, max_reschedules: parseInt(e.target.value) || 0 }))} /></div>
                                    <div className="flex items-center gap-3"><Switch checked={ruleForm.allow_replacement} onCheckedChange={v => setRuleForm(p => ({ ...p, allow_replacement: v }))} /><Label>Permitir reposição</Label></div>
                                    {ruleForm.allow_replacement && <div><Label>Prazo para reposição (dias)</Label><Input type="number" value={ruleForm.replacement_deadline_days} onChange={e => setRuleForm(p => ({ ...p, replacement_deadline_days: parseInt(e.target.value) || 0 }))} /></div>}
                                </div>
                                <DialogFooter><Button onClick={saveRule} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    {rules.length === 0 ? (
                        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma regra configurada. Crie a primeira regra de ausência.</CardContent></Card>
                    ) : (
                        <div className="grid gap-4">
                            {rules.map((rule: any) => (
                                <Card key={rule.id}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold">{rule.name}</h3>
                                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                                    <span>Aviso: {rule.min_notice_hours}h</span>
                                                    <span>Cobrar falta: {rule.charge_no_show ? `Sim (${rule.no_show_fee_percentage}%)` : 'Não'}</span>
                                                    <span>Reposição: {rule.allow_replacement ? `Sim (${rule.replacement_deadline_days} dias)` : 'Não'}</span>
                                                    <span>Máx. reagendamentos: {rule.max_reschedules}</span>
                                                </div>
                                            </div>
                                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Ativa' : 'Inativa'}</Badge>
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
                        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma reposição registrada. Reposições são criadas automaticamente ao marcar faltas na agenda.</CardContent></Card>
                    ) : (
                        <div className="grid gap-3">
                            {replacements.map((rep: any) => {
                                const Icon = STATUS_ICONS[rep.status] || Clock
                                return (
                                    <Card key={rep.id}>
                                        <CardContent className="pt-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">{getName(rep.patients)}</p>
                                                        <p className="text-sm text-muted-foreground">{REASON_LABELS[rep.reason]} — {rep.deadline ? `Prazo: ${new Date(rep.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Sem prazo'}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={rep.status === 'completed' ? 'default' : rep.status === 'expired' ? 'destructive' : 'secondary'}>{STATUS_LABELS[rep.status]}</Badge>
                                            </div>
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
                        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum pacote de sessões criado.</CardContent></Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {packages.map((pkg: any) => {
                                const remaining = pkg.total_sessions - pkg.used_sessions
                                const pct = Math.round((pkg.used_sessions / pkg.total_sessions) * 100)
                                return (
                                    <Card key={pkg.id} className={remaining <= 3 ? 'border-orange-300' : ''}>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                                                    <CardDescription>{getName(pkg.patients)} — {getName(pkg.doctors)}</CardDescription>
                                                </div>
                                                <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>{pkg.status === 'active' ? 'Ativo' : pkg.status}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>{pkg.used_sessions} de {pkg.total_sessions} sessões usadas</span>
                                                <span className={remaining <= 3 ? 'text-orange-600 font-bold' : ''}>{remaining} restantes</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${remaining <= 3 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            {remaining <= 3 && remaining > 0 && <p className="text-xs text-orange-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Pacote quase esgotado!</p>}
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
