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

interface PatientReimbursementRule {
    id: string
    patient_id: string
    therapy_type: string
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

const THERAPY_TYPES = [
    'Psicologia',
    'Terapia Ocupacional',
    'Fonoaudiologia',
    'Fisioterapia',
    'Psicopedagogia',
    'Musicoterapia',
    'Neuropsicologia',
    'ABA',
    'Outro',
]

const INITIAL_FORM = {
    patient_id: '',
    therapy_type: '',
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Reembolso por Paciente
                    </h1>
                    <p className="text-muted-foreground">
                        Configure regras de reembolso específicas por paciente e tipo de terapia
                    </p>
                </div>
                <Button onClick={() => { setEditingId(null); setForm(INITIAL_FORM); setShowModal(true) }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Regra
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Regras de Reembolso por Paciente</CardTitle>
                            <CardDescription>
                                Defina valores e guias por tipo de terapia para cada paciente
                            </CardDescription>
                        </div>
                        <Select value={filterPatient} onValueChange={setFilterPatient}>
                            <SelectTrigger className="w-[250px]">
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
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma regra de reembolso configurada.</p>
                            <p className="text-sm">Clique em "Nova Regra" para adicionar.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Tipo de Terapia</TableHead>
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
                                    <TableRow key={rule.id}>
                                        <TableCell className="font-medium">
                                            {rule.patient?.full_name || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{rule.therapy_type}</Badge>
                                        </TableCell>
                                        <TableCell>{rule.guides_per_session}</TableCell>
                                        <TableCell>R$ {Number(rule.billing_amount).toFixed(2)}</TableCell>
                                        <TableCell>R$ {Number(rule.reimbursement_amount).toFixed(2)}</TableCell>
                                        <TableCell>{rule.actual_session_duration} min</TableCell>
                                        <TableCell>{rule.guide_session_duration} min</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive">
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
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Regra' : 'Nova Regra de Reembolso por Paciente'}
                        </DialogTitle>
                        <DialogDescription>
                            Defina valores de reembolso para um paciente e tipo de terapia específico
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Paciente *</Label>
                            <Select value={form.patient_id} onValueChange={(v) => setForm(prev => ({ ...prev, patient_id: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>{p.full_name || p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Terapia *</Label>
                            <Select value={form.therapy_type} onValueChange={(v) => setForm(prev => ({ ...prev, therapy_type: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {THERAPY_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Guias por Sessão</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.guides_per_session}
                                    onChange={(e) => setForm(prev => ({ ...prev, guides_per_session: Number(e.target.value) }))}
                                />
                                <p className="text-xs text-muted-foreground">Quantas guias gerar por atendimento real</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor Cobrado (R$)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="pl-8"
                                        value={form.billing_amount || ''}
                                        onChange={(e) => setForm(prev => ({ ...prev, billing_amount: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor Reembolso (R$)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="pl-8"
                                        value={form.reimbursement_amount || ''}
                                        onChange={(e) => setForm(prev => ({ ...prev, reimbursement_amount: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Duração Real (min)</Label>
                                <Input
                                    type="number"
                                    value={form.actual_session_duration}
                                    onChange={(e) => setForm(prev => ({ ...prev, actual_session_duration: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Duração da Guia (min)</Label>
                            <Input
                                type="number"
                                value={form.guide_session_duration}
                                onChange={(e) => setForm(prev => ({ ...prev, guide_session_duration: Number(e.target.value) }))}
                            />
                            <p className="text-xs text-muted-foreground">Duração que aparece na guia de reembolso</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Notas adicionais..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingId ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
