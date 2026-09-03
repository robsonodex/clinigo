'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Receipt, Plus, Pencil, Trash2, Loader2, DollarSign, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'
import { useTherapyTypes } from '@/lib/hooks/use-therapy-types'

interface PatientReimbursementRule {
    id: string
    patient_id: string
    therapy_type: string
    billing_therapy_type: string | null
    billing_amount: number
    reimbursement_amount: number
    guides_per_session: number
    actual_session_duration: number
    guide_session_duration: number
    notes: string | null
    is_active: boolean
    patient?: {
        id: string
        full_name: string
    }
}

// THERAPY_TYPES agora vem do hook useTherapyTypes()

const INITIAL_FORM = {
    patient_id: '',
    therapy_type: '',
    billing_therapy_type: '',
    billing_amount: 0,
    reimbursement_amount: 0,
    guides_per_session: 1,
    actual_session_duration: 50,
    guide_session_duration: 30,
    notes: '',
}

export default function ReembolsoPacientePage() {
    const { profile } = useAuth()
    const profLabel = useProfessionalLabel()
    const { therapyTypes: THERAPY_TYPES } = useTherapyTypes()
    const [rules, setRules] = useState<PatientReimbursementRule[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [patients, setPatients] = useState<any[]>([])
    const [filterPatient, setFilterPatient] = useState<string>('all')
    const [form, setForm] = useState(INITIAL_FORM)

    useEffect(() => {
        fetchRules()
        fetchPatients()
    }, [])

    const fetchRules = async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/patient-reimbursement-rules')
            const json = await res.json()
            if (json.error) throw new Error(json.error)
            setRules(json.data || [])
        } catch (err: any) {
            toast.error(err.message || 'Erro ao carregar regras')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/patients')
            const json = await res.json()
            setPatients(json.patients || json.data || [])
        } catch { }
    }

    const handleSubmit = async () => {
        if (!form.patient_id || !form.therapy_type) {
            toast.error('Paciente e tipo de terapia são obrigatórios')
            return
        }

        setIsSaving(true)
        try {
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { id: editingId, ...form } : form

            const res = await fetch('/api/patient-reimbursement-rules', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const json = await res.json()
            if (json.error) throw new Error(json.error)

            toast.success(editingId ? 'Regra atualizada!' : 'Regra criada!')
            setShowModal(false)
            setEditingId(null)
            setForm(INITIAL_FORM)
            fetchRules()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar')
        } finally {
            setIsSaving(false)
        }
    }

    const handleEdit = (rule: PatientReimbursementRule) => {
        setEditingId(rule.id)
        setForm({
            patient_id: rule.patient_id,
            therapy_type: rule.therapy_type,
            billing_therapy_type: rule.billing_therapy_type || '',
            billing_amount: rule.billing_amount,
            reimbursement_amount: rule.reimbursement_amount,
            guides_per_session: rule.guides_per_session,
            actual_session_duration: rule.actual_session_duration || 50,
            guide_session_duration: rule.guide_session_duration || 30,
            notes: rule.notes || '',
        })
        setShowModal(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja desativar esta regra?')) return

        try {
            const res = await fetch(`/api/patient-reimbursement-rules?id=${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.error) throw new Error(json.error)
            toast.success('Regra desativada')
            fetchRules()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao desativar')
        }
    }

    const filteredRules = filterPatient === 'all'
        ? rules
        : rules.filter(r => r.patient_id === filterPatient)

    return (
        <div className="space-y-6">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Users className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Reembolso por Paciente</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Configure regras de reembolso específicas por paciente e tipo de terapia</p>
                    </div>
                </div>
                <Button 
                    onClick={() => { setEditingId(null); setForm(INITIAL_FORM); setShowModal(true) }}
                    className="flex gap-1.5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 text-sm font-semibold transition-all duration-200 border-0"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Regra
                </Button>
            </div>

            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Regras de Reembolso por Paciente</CardTitle>
                            <CardDescription>
                                Defina valores e guias por tipo de terapia para cada paciente
                            </CardDescription>
                        </div>
                        <Select value={filterPatient} onValueChange={setFilterPatient}>
                            <SelectTrigger className="w-full sm:w-[250px] h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all">
                                <SelectValue placeholder="Filtrar por paciente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os pacientes</SelectItem>
                                {patients.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50 text-emerald-600" />
                            <p>Nenhuma regra de reembolso configurada.</p>
                            <p className="text-sm">Clique em "Nova Regra" para adicionar.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Terapia Real</TableHead>
                                    <TableHead>Cobrar como</TableHead>
                                    <TableHead>Guias/Sessão</TableHead>
                                    <TableHead>Valor Cobrado</TableHead>
                                    <TableHead>Valor Reembolso</TableHead>
                                    <TableHead>Duração Real</TableHead>
                                    <TableHead>Duração Guia</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRules.map((rule) => (
                                    <TableRow key={rule.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <TableCell className="font-medium text-slate-950 dark:text-slate-50">
                                            {rule.patient?.full_name || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-lg font-semibold border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400">{rule.therapy_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {rule.billing_therapy_type ? (
                                                <Badge variant="secondary" className="rounded-lg font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">{rule.billing_therapy_type}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs font-semibold">Mesma</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300">{rule.guides_per_session}x</TableCell>
                                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300">R$ {Number(rule.billing_amount).toFixed(2)}</TableCell>
                                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300">R$ {Number(rule.reimbursement_amount).toFixed(2)}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400">{rule.actual_session_duration} min</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400">{rule.guide_session_duration} min</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleEdit(rule)}
                                                    className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    <Pencil className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleDelete(rule.id)} 
                                                    className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de criação/edição */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Regra' : 'Nova Regra de Reembolso por Paciente'}
                        </DialogTitle>
                        <DialogDescription>
                            Defina valores de reembolso para um paciente e tipo de terapia específico
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Paciente *</Label>
                            <Select value={form.patient_id} onValueChange={(v) => setForm(prev => ({ ...prev, patient_id: v }))}>
                                <SelectTrigger className="h-10 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="Selecione o paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>{p.full_name || p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Terapia Real (na Agenda) *</Label>
                            <Select value={form.therapy_type} onValueChange={(v) => setForm(prev => ({ ...prev, therapy_type: v }))}>
                                <SelectTrigger className="h-10 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="Selecione a terapia real" />
                                </SelectTrigger>
                                <SelectContent>
                                    {THERAPY_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Terapia que o paciente realmente faz</p>
                        </div>

                        <div className="space-y-1">
                            <Label>Cobrar como (Terapia para Reembolso)</Label>
                            <Select value={form.billing_therapy_type} onValueChange={(v) => setForm(prev => ({ ...prev, billing_therapy_type: v }))}>
                                <SelectTrigger className="h-10 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="Selecione a terapia para faturamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {THERAPY_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Terapia que aparecerá no relatório/guia de reembolso do convênio</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Guias por Sessão</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.guides_per_session}
                                    onChange={(e) => setForm(prev => ({ ...prev, guides_per_session: Number(e.target.value) }))}
                                    className="h-10 rounded-xl border border-slate-200 dark:border-slate-800"
                                />
                                <p className="text-xs text-muted-foreground">Quantas guias gerar por atendimento real</p>
                            </div>
                            <div className="space-y-1">
                                <Label>Valor Cobrado (R$)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="pl-8 h-10 rounded-xl border border-slate-200 dark:border-slate-800"
                                        value={form.billing_amount || ''}
                                        onChange={(e) => setForm(prev => ({ ...prev, billing_amount: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Valor Reembolso (R$)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="pl-8 h-10 rounded-xl border border-slate-200 dark:border-slate-800"
                                        value={form.reimbursement_amount || ''}
                                        onChange={(e) => setForm(prev => ({ ...prev, reimbursement_amount: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>Duração Real (min)</Label>
                                <Input
                                    type="number"
                                    value={form.actual_session_duration}
                                    onChange={(e) => setForm(prev => ({ ...prev, actual_session_duration: Number(e.target.value) }))}
                                    className="h-10 rounded-xl border border-slate-200 dark:border-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Duração da Guia (min)</Label>
                            <Input
                                type="number"
                                value={form.guide_session_duration}
                                onChange={(e) => setForm(prev => ({ ...prev, guide_session_duration: Number(e.target.value) }))}
                                className="h-10 rounded-xl border border-slate-200 dark:border-slate-800"
                            />
                            <p className="text-xs text-muted-foreground">Duração que aparece na guia de reembolso</p>
                        </div>

                        <div className="space-y-1">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Notas adicionais..."
                                className="rounded-xl border border-slate-200 dark:border-slate-800"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowModal(false)}
                            className="h-10 rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 border-slate-200 hover:bg-slate-50 transition-all duration-200 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={isSaving}
                            className="flex gap-1.5 h-10 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 font-semibold transition-all duration-200 border-0"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <span>{editingId ? 'Salvar' : 'Criar'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
