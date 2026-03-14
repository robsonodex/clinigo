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
import { Receipt, Plus, Pencil, Trash2, Loader2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/use-auth'

interface ReimbursementConfig {
    id: string
    name: string
    doctor_id: string | null
    sessions_per_appointment: number
    billing_price: number | null
    real_price: number | null
    notes: string | null
    is_active: boolean
    doctor?: {
        id: string
        specialty: string
        user: { full_name: string }
    }
}

export default function ReembolsoConfigPage() {
    const { profile } = useAuth()
    const [configs, setConfigs] = useState<ReimbursementConfig[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [doctors, setDoctors] = useState<any[]>([])
    const [form, setForm] = useState({
        name: '',
        doctor_id: '',
        sessions_per_appointment: 1,
        billing_price: '',
        real_price: '',
        notes: '',
    })

    const fetchConfigs = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/reimbursement-configs')
            if (res.ok) {
                const data = await res.json()
                setConfigs(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching configs:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchDoctors = async () => {
        try {
            const res = await fetch('/api/doctors')
            if (res.ok) {
                const data = await res.json()
                setDoctors(data.data || data || [])
            }
        } catch (error) {
            console.error('Error fetching doctors:', error)
        }
    }

    useEffect(() => {
        fetchConfigs()
        fetchDoctors()
    }, [])

    const handleOpenNew = () => {
        setEditingId(null)
        setForm({ name: '', doctor_id: '', sessions_per_appointment: 1, billing_price: '', real_price: '', notes: '' })
        setShowModal(true)
    }

    const handleEdit = (config: ReimbursementConfig) => {
        setEditingId(config.id)
        setForm({
            name: config.name,
            doctor_id: config.doctor_id || '',
            sessions_per_appointment: config.sessions_per_appointment,
            billing_price: config.billing_price?.toString() || '',
            real_price: config.real_price?.toString() || '',
            notes: config.notes || '',
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name || !form.sessions_per_appointment) {
            toast.error('Nome e sessões são obrigatórios')
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                ...(editingId ? { id: editingId } : {}),
                name: form.name,
                doctor_id: form.doctor_id || null,
                sessions_per_appointment: Number(form.sessions_per_appointment),
                billing_price: form.billing_price ? Number(form.billing_price) : null,
                real_price: form.real_price ? Number(form.real_price) : null,
                notes: form.notes || null,
            }

            const res = await fetch('/api/reimbursement-configs', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success(editingId ? 'Configuração atualizada' : 'Configuração criada')
                setShowModal(false)
                fetchConfigs()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao salvar')
            }
        } catch (error) {
            toast.error('Erro ao salvar configuração')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja desativar esta configuração?')) return
        try {
            const res = await fetch(`/api/reimbursement-configs?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Configuração desativada')
                fetchConfigs()
            }
        } catch (error) {
            toast.error('Erro ao desativar')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="h-6 w-6 text-primary" />
                        Configuração de Reembolso
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Defina regras de reembolso para geração de múltiplas guias por atendimento
                    </p>
                </div>
                <Button onClick={handleOpenNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Configuração
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Regras de Reembolso</CardTitle>
                    <CardDescription>
                        Configure quantas sessões de reembolso gerar por atendimento real e os valores para documentos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : configs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Nenhuma regra de reembolso configurada.</p>
                            <p className="text-sm mt-1">Clique em "Nova Configuração" para criar uma regra.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Profissional</TableHead>
                                    <TableHead>Sessões/Atendimento</TableHead>
                                    <TableHead>Valor Reembolso</TableHead>
                                    <TableHead>Valor Real</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {configs.map((config) => (
                                    <TableRow key={config.id}>
                                        <TableCell className="font-medium">{config.name}</TableCell>
                                        <TableCell>
                                            {config.doctor?.user?.full_name || 'Todos'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {config.sessions_per_appointment}x
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {config.billing_price
                                                ? `R$ ${Number(config.billing_price).toFixed(2)}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {config.real_price
                                                ? `R$ ${Number(config.real_price).toFixed(2)}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Configuração' : 'Nova Configuração de Reembolso'}
                        </DialogTitle>
                        <DialogDescription>
                            Defina como o reembolso será calculado e quantas guias gerar por atendimento
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Nome da Regra *</Label>
                            <Input
                                placeholder="Ex: Padrão Terapia, Fonoaudiologia"
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <Label>Profissional (opcional)</Label>
                            <Select value={form.doctor_id || 'all'} onValueChange={(v) => setForm(f => ({ ...f, doctor_id: v === 'all' ? '' : v }))}>
                                <SelectTrigger><SelectValue placeholder="Todos os profissionais" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {doctors.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.user?.full_name || d.name} - {d.specialty}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Sessões por Atendimento *</Label>
                            <Input
                                type="number"
                                min="1"
                                max="10"
                                value={form.sessions_per_appointment}
                                onChange={(e) => setForm(f => ({ ...f, sessions_per_appointment: parseInt(e.target.value) || 1 }))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Quantas guias de reembolso gerar por cada atendimento real
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Valor para Reembolso (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.billing_price}
                                    onChange={(e) => setForm(f => ({ ...f, billing_price: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Valor exibido nos documentos
                                </p>
                            </div>
                            <div>
                                <Label>Valor Real (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.real_price}
                                    onChange={(e) => setForm(f => ({ ...f, real_price: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Valor realmente cobrado
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label>Observações</Label>
                            <Textarea
                                placeholder="Notas adicionais sobre esta regra..."
                                value={form.notes}
                                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingId ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
