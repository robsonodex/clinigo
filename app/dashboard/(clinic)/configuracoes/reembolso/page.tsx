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
import { Receipt, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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
    useAuth()
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
                toast.success(editingId ? 'Configuração atualizada.' : 'Configuração criada.')
                setShowModal(false)
                fetchConfigs()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao salvar')
            }
        } catch {
            toast.error('Erro ao salvar configuração')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja desativar esta configuração?')) return
        try {
            const res = await fetch(`/api/reimbursement-configs?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Configuração desativada.')
                fetchConfigs()
            }
        } catch {
            toast.error('Erro ao desativar')
        }
    }

    return (
        <div className="space-y-6">
            {/* Cabeçalho Corporativo */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Receipt className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Configuração de Reembolso</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Defina regras de reembolso para geração de múltiplas guias por atendimento</p>
                    </div>
                </div>
                <Button
                    type="button"
                    onClick={handleOpenNew}
                    className="h-9 min-h-[36px] px-4 gap-1.5 rounded-md bg-primary hover:bg-primary/90 text-white shadow-none text-xs font-medium border-0"
                >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>Nova Configuração</span>
                </Button>
            </div>

            <Card className="border border-slate-100 dark:border-slate-800 shadow-none rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Regras de Reembolso</CardTitle>
                    <CardDescription className="text-xs">
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
                            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50 text-emerald-600" />
                            <p className="text-sm font-medium text-foreground">Nenhuma regra de reembolso configurada.</p>
                            <p className="text-xs mt-1">Clique em &quot;Nova Configuração&quot; para criar uma regra.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
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
                                        <TableRow key={config.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                            <TableCell className="font-medium text-slate-950 dark:text-slate-50">{config.name}</TableCell>
                                            <TableCell>
                                                {config.doctor?.user?.full_name || 'Todos'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="rounded-md font-medium tabular-nums bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                                                    {config.sessions_per_appointment}x
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {config.billing_price
                                                    ? `R$ ${Number(config.billing_price).toFixed(2)}`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {config.real_price
                                                    ? `R$ ${Number(config.real_price).toFixed(2)}`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(config)}
                                                        aria-label="Editar configuração"
                                                        className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    >
                                                        <Pencil className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(config.id)}
                                                        aria-label="Desativar configuração"
                                                        className="h-8 w-8 p-0 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal compacto com cabeçalho e rodapé fixos (sem necessidade de reduzir zoom) */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <DialogHeader className="px-5 py-3.5 border-b border-border shrink-0 text-left">
                        <DialogTitle className="text-base font-semibold">
                            {editingId ? 'Editar Configuração' : 'Nova Configuração de Reembolso'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Defina como o reembolso será calculado e quantas guias gerar por atendimento
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-5 py-3.5 overflow-y-auto flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Nome da Regra *</Label>
                                <Input
                                    placeholder="Ex: Padrão Terapia, Fonoaudiologia"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="h-9 text-base sm:text-xs border border-slate-200 dark:border-slate-800"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Profissional (opcional)</Label>
                                <Select value={form.doctor_id || 'all'} onValueChange={(v) => setForm(f => ({ ...f, doctor_id: v === 'all' ? '' : v }))}>
                                    <SelectTrigger className="h-9 text-xs border border-slate-200 dark:border-slate-800"><SelectValue placeholder="Todos os profissionais" /></SelectTrigger>
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Sessões / Atend. *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={form.sessions_per_appointment}
                                    onChange={(e) => setForm(f => ({ ...f, sessions_per_appointment: parseInt(e.target.value) || 1 }))}
                                    className="h-9 text-base sm:text-xs border border-slate-200 dark:border-slate-800"
                                />
                                <p className="text-[11px] text-muted-foreground">Guias por atendimento</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Valor Reembolso (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.billing_price}
                                    onChange={(e) => setForm(f => ({ ...f, billing_price: e.target.value }))}
                                    className="h-9 text-base sm:text-xs border border-slate-200 dark:border-slate-800"
                                />
                                <p className="text-[11px] text-muted-foreground">Exibido nos documentos</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Valor Real (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={form.real_price}
                                    onChange={(e) => setForm(f => ({ ...f, real_price: e.target.value }))}
                                    className="h-9 text-base sm:text-xs border border-slate-200 dark:border-slate-800"
                                />
                                <p className="text-[11px] text-muted-foreground">Valor realmente cobrado</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Observações</Label>
                            <Textarea
                                placeholder="Notas adicionais sobre esta regra..."
                                value={form.notes}
                                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                className="text-base sm:text-xs border border-slate-200 dark:border-slate-800 min-h-[58px]"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="px-5 py-3 border-t border-border bg-muted/20 shrink-0 flex flex-row justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowModal(false)}
                            className="h-9 min-h-[36px] rounded-md px-4 text-xs font-medium shadow-none"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-9 min-h-[36px] rounded-md px-5 gap-1.5 text-xs font-medium bg-primary hover:bg-primary/90 text-white shadow-none border-0"
                        >
                            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                            <span>{editingId ? 'Salvar' : 'Criar'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
