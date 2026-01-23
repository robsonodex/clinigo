'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, History, Save, Loader2, AlertCircle, Check, X, Settings2 } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'

import {
    type FeatureKey,
    FEATURE_METADATA,
    CATEGORY_LABELS,
    getFeaturesByCategory,
    getPlanBadge,
    PROTECTED_FEATURES,
    type FeatureCategory,
} from '@/lib/constants/features'

interface ClinicInfo {
    id: string
    name: string
    plan_type: string
}

interface PermissionState {
    enabled: boolean
    isCustom: boolean
}

interface PricingInfo {
    plan_type: string
    custom_price: number | null
    custom_price_start_date: string | null
    custom_price_end_date: string | null
    custom_price_reason: string | null
    effective_price: number
    is_custom_active: boolean
}

interface HistoryEntry {
    id: string
    action: string
    metadata: Record<string, any>
    created_at: string
    user_id: string
}

export default function ClinicPermissionsPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const clinicId = params.id as string

    // State
    const [clinic, setClinic] = useState<ClinicInfo | null>(null)
    const [permissions, setPermissions] = useState<Record<FeatureKey, PermissionState>>({} as any)
    const [pricing, setPricing] = useState<PricingInfo | null>(null)
    const [history, setHistory] = useState<HistoryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [savingFeature, setSavingFeature] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Custom price form
    const [customPrice, setCustomPrice] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [priceReason, setPriceReason] = useState('')
    const [savingPrice, setSavingPrice] = useState(false)

    // Load clinic info and permissions
    const loadData = useCallback(async () => {
        try {
            setLoading(true)

            // Fetch clinic info
            const clinicRes = await fetch(`/api/clinics/${clinicId}`)
            if (!clinicRes.ok) throw new Error('Failed to fetch clinic')
            const clinicData = await clinicRes.json()
            setClinic(clinicData.clinic || clinicData)

            // Fetch permissions
            const permRes = await fetch(`/api/super-admin/clinics/${clinicId}/permissions`)
            if (!permRes.ok) throw new Error('Failed to fetch permissions')
            const permData = await permRes.json()
            setPermissions(permData.permissions)

            // Fetch pricing
            const priceRes = await fetch(`/api/super-admin/clinics/${clinicId}/custom-price`)
            if (priceRes.ok) {
                const priceData = await priceRes.json()
                setPricing(priceData.pricing)
                // Pre-fill form if custom price exists
                if (priceData.pricing.custom_price) {
                    setCustomPrice(priceData.pricing.custom_price.toString())
                    setStartDate(priceData.pricing.custom_price_start_date || '')
                    setEndDate(priceData.pricing.custom_price_end_date || '')
                    setPriceReason(priceData.pricing.custom_price_reason || '')
                }
            }
        } catch (error) {
            console.error('Error loading data:', error)
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados da clínica',
            })
        } finally {
            setLoading(false)
        }
    }, [clinicId, toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Load history
    const loadHistory = async () => {
        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/permissions/history?limit=50`)
            if (res.ok) {
                const data = await res.json()
                setHistory(data.history)
            }
        } catch (error) {
            console.error('Error loading history:', error)
        }
    }

    // Toggle permission
    const handleTogglePermission = async (featureKey: FeatureKey, enabled: boolean) => {
        if (PROTECTED_FEATURES.includes(featureKey)) {
            toast({
                variant: 'destructive',
                title: 'Não permitido',
                description: 'Esta funcionalidade não pode ser desativada',
            })
            return
        }

        setSavingFeature(featureKey)
        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature: featureKey, enabled }),
            })

            if (!res.ok) throw new Error('Failed to update permission')

            // Update local state
            setPermissions((prev) => ({
                ...prev,
                [featureKey]: { enabled, isCustom: true },
            }))

            toast({
                title: 'Sucesso',
                description: `${FEATURE_METADATA[featureKey].label} ${enabled ? 'ativado' : 'desativado'}`,
            })
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível atualizar a permissão',
            })
        } finally {
            setSavingFeature(null)
        }
    }

    // Reset all permissions
    const handleResetPermissions = async () => {
        if (!confirm('Tem certeza que deseja restaurar todas as permissões para o padrão do plano?')) {
            return
        }

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/permissions`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error('Failed to reset permissions')

            toast({
                title: 'Sucesso',
                description: 'Permissões restauradas para o padrão do plano',
            })

            loadData()
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível restaurar as permissões',
            })
        }
    }

    // Save custom price
    const handleSaveCustomPrice = async () => {
        if (!customPrice || !startDate || !priceReason) {
            toast({
                variant: 'destructive',
                title: 'Campos obrigatórios',
                description: 'Preencha valor, data início e motivo',
            })
            return
        }

        setSavingPrice(true)
        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/custom-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: parseFloat(customPrice),
                    startDate,
                    endDate: endDate || null,
                    reason: priceReason,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to save custom price')
            }

            toast({
                title: 'Sucesso',
                description: 'Preço customizado salvo com sucesso',
            })

            loadData()
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Não foi possível salvar o preço',
            })
        } finally {
            setSavingPrice(false)
        }
    }

    // Clear custom price
    const handleClearCustomPrice = async () => {
        if (!confirm('Tem certeza que deseja remover o preço customizado?')) {
            return
        }

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/custom-price`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error('Failed to clear custom price')

            setCustomPrice('')
            setStartDate('')
            setEndDate('')
            setPriceReason('')

            toast({
                title: 'Sucesso',
                description: 'Preço customizado removido',
            })

            loadData()
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível remover o preço customizado',
            })
        }
    }

    // Filter features by search
    const featuresByCategory = getFeaturesByCategory()
    const filteredCategories = Object.entries(featuresByCategory).filter(([category, features]) => {
        if (!searchQuery) return true
        return features.some(
            (f) =>
                f.metadata.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.key.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/system-master-hub">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Permissões Customizadas</h1>
                        <p className="text-muted-foreground">
                            {clinic?.name} • Plano {clinic?.plan_type}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { loadHistory(); setShowHistory(true) }}>
                        <History className="h-4 w-4 mr-2" />
                        Histórico
                    </Button>
                    <Button variant="outline" onClick={loadData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Pricing Card */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Preço Customizado
                    </CardTitle>
                    <CardDescription>
                        Defina um preço especial que sobrescreve o valor do plano
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pricing?.is_custom_active && (
                        <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                            <Check className="h-4 w-4 text-emerald-600" />
                            <AlertTitle className="text-emerald-800">Preço customizado ativo</AlertTitle>
                            <AlertDescription className="text-emerald-700">
                                R$ {pricing.effective_price}/mês (padrão seria R$ {
                                    { BASICO: 149, AVANCADO: 299, PROFESSIONAL: 549, ENTERPRISE: 799 }[pricing.plan_type] || 0
                                })
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Valor Mensal (R$)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={customPrice}
                                onChange={(e) => setCustomPrice(e.target.value)}
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Início *</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Fim (opcional)</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo *</Label>
                            <Textarea
                                placeholder="Ex: Desconto promocional, parceria, etc."
                                value={priceReason}
                                onChange={(e) => setPriceReason(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleSaveCustomPrice} disabled={savingPrice}>
                            {savingPrice ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Salvar Preço
                        </Button>
                        {pricing?.custom_price && (
                            <Button variant="outline" onClick={handleClearCustomPrice}>
                                <X className="h-4 w-4 mr-2" />
                                Remover Preço Custom
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Permissions Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Funcionalidades</CardTitle>
                            <CardDescription>
                                Ative ou desative funcionalidades individualmente
                            </CardDescription>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleResetPermissions}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Restaurar Padrões
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="mt-4">
                        <Input
                            placeholder="Buscar funcionalidade..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredCategories.map(([category, features]) => {
                        const filteredFeatures = searchQuery
                            ? features.filter(
                                (f) =>
                                    f.metadata.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    f.key.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            : features

                        if (filteredFeatures.length === 0) return null

                        return (
                            <div key={category} className="mb-6">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                    {CATEGORY_LABELS[category as FeatureCategory]}
                                </h3>
                                <div className="space-y-2">
                                    {filteredFeatures.map(({ key, metadata }) => {
                                        const permission = permissions[key]
                                        const isProtected = PROTECTED_FEATURES.includes(key)
                                        const isSaving = savingFeature === key

                                        return (
                                            <div
                                                key={key}
                                                className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={permission?.enabled ?? false}
                                                        onCheckedChange={(checked) => handleTogglePermission(key, checked)}
                                                        disabled={isProtected || isSaving}
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{metadata.label}</span>
                                                            {permission?.isCustom && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Customizado
                                                                </Badge>
                                                            )}
                                                            {isProtected && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Protegido
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {metadata.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {metadata.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            metadata.defaultPlans.includes('BASICO')
                                                                ? 'border-blue-200 text-blue-700 bg-blue-50'
                                                                : metadata.defaultPlans.includes('AVANCADO')
                                                                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                                                    : metadata.defaultPlans.includes('PROFESSIONAL')
                                                                        ? 'border-purple-200 text-purple-700 bg-purple-50'
                                                                        : 'border-amber-200 text-amber-700 bg-amber-50'
                                                        }
                                                    >
                                                        {getPlanBadge(metadata.defaultPlans)}+
                                                    </Badge>
                                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <Separator className="mt-4" />
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* History Dialog */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Histórico de Alterações</DialogTitle>
                        <DialogDescription>
                            Últimas alterações em permissões e preços
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {history.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                Nenhum histórico encontrado
                            </p>
                        ) : (
                            history.map((entry) => (
                                <div key={entry.id} className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge variant="outline">{entry.action}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(entry.created_at).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                        {JSON.stringify(entry.metadata, null, 2)}
                                    </pre>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
