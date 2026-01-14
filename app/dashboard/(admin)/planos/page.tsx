'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Check, Edit2, Loader2, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { PlanConfig } from '@/lib/constants/plans'

export default function PlansPage() {
    const [plans, setPlans] = useState<PlanConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null)
    const [saving, setSaving] = useState(false)
    const [openDialog, setOpenDialog] = useState(false)

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans')
            if (res.ok) {
                const data = await res.json()
                setPlans(data)
            } else {
                toast.error('Erro ao carregar planos')
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro de conexão ao carregar planos')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!editingPlan) return

        setSaving(true)
        try {
            const res = await fetch('/api/admin/plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPlan)
            })

            if (!res.ok) throw new Error('Falha ao salvar')

            toast.success('Plano atualizado com sucesso!')
            setOpenDialog(false)
            fetchPlans()
        } catch (error) {
            toast.error('Erro ao salvar as alterações')
        } finally {
            setSaving(false)
        }
    }

    const updateFeature = (index: number, field: 'name' | 'included' | 'tooltip', value: any) => {
        if (!editingPlan) return
        const newFeatures = [...editingPlan.features]
        // @ts-ignore - Handle legacy string features
        if (typeof newFeatures[index] === 'string') {
            newFeatures[index] = { name: newFeatures[index], included: true }
        }

        newFeatures[index] = { ...newFeatures[index], [field]: value }
        setEditingPlan({ ...editingPlan, features: newFeatures })
    }

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Planos e Preços (Mode Edição)</h1>
                <p className="text-muted-foreground">
                    Gerencie os planos visíveis no site. Alterações refletem imediatamente.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="flex flex-col relative overflow-hidden ring-1 ring-border hover:ring-2 hover:ring-primary/50 transition-all">
                        {plan.recommended && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-bold">
                                Recomendado
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                {plan.name}
                                {!plan.id && <Badge variant="destructive">Novo</Badge>}
                            </CardTitle>
                            <CardDescription>
                                <span className="text-3xl font-bold text-foreground">
                                    {formatCurrency(plan.price)}
                                </span>
                                {plan.billing}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="space-y-4">
                                <p className="text-sm italic text-muted-foreground">{plan.tagline}</p>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Limites:</p>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li className="flex items-center">
                                            <Check className="h-3 w-3 mr-2 text-green-500" />
                                            {plan.limits.max_doctors === -1 ? 'Médicos Ilimitados' : `${plan.limits.max_doctors} Médicos`}
                                        </li>
                                        <li className="flex items-center">
                                            <Check className="h-3 w-3 mr-2 text-green-500" />
                                            {plan.limits.max_appointments_month === -1 ? 'Agendamentos Ilimitados' : `${plan.limits.max_appointments_month} Consultas/mês`}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => {
                                    setEditingPlan(plan)
                                    setOpenDialog(true)
                                }}
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar Plano
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Plano: {editingPlan?.name}</DialogTitle>
                        <DialogDescription>
                            Modifique os detalhes do plano. Cuidado ao alterar preços e limites.
                        </DialogDescription>
                    </DialogHeader>

                    {editingPlan && (
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do Plano</Label>
                                    <Input
                                        value={editingPlan.name}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tagline (Subtítulo)</Label>
                                    <Input
                                        value={editingPlan.tagline}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Preço (R$)</Label>
                                    <Input
                                        type="number"
                                        value={editingPlan.price}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Label Preço</Label>
                                    <Input
                                        value={editingPlan.priceLabel}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, priceLabel: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-8">
                                    <Switch
                                        checked={editingPlan.recommended}
                                        onCheckedChange={(c) => setEditingPlan({ ...editingPlan, recommended: c })}
                                    />
                                    <Label>Recomendado?</Label>
                                </div>
                            </div>

                            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                                <h3 className="font-semibold mb-2">Limites do Sistema</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Max Médicos (-1 p/ ilimitado)</Label>
                                        <Input
                                            type="number"
                                            value={editingPlan.limits.max_doctors}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, max_doctors: parseInt(e.target.value) }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Consultas/mês (-1 p/ ilimitado)</Label>
                                        <Input
                                            type="number"
                                            value={editingPlan.limits.max_appointments_month}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, max_appointments_month: parseInt(e.target.value) }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Armazenamento (GB)</Label>
                                        <Input
                                            type="number"
                                            value={editingPlan.limits.max_storage_gb}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, max_storage_gb: parseInt(e.target.value) }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Unidades</Label>
                                        <Input
                                            type="number"
                                            value={editingPlan.limits.max_units}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, max_units: parseInt(e.target.value) }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Funcionalidades (Features)</Label>
                                    <span className="text-xs text-muted-foreground">Desmarque para remover da lista</span>
                                </div>
                                <div className="border rounded-md p-4 space-y-3 bg-muted/20 max-h-60 overflow-y-auto">
                                    {editingPlan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <Switch
                                                checked={typeof feature === 'string' ? true : feature.included}
                                                onCheckedChange={(c) => updateFeature(idx, 'included', c)}
                                            />
                                            <Input
                                                className="flex-1 h-8"
                                                value={typeof feature === 'string' ? feature : feature.name}
                                                onChange={(e) => updateFeature(idx, 'name', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

