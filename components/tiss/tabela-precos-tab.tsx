'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Search,
    Plus,
    Trash2,
    Upload,
    FileSpreadsheet,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import type { HealthInsurance, HealthInsurancePlan } from '@/lib/types/health-insurance'

interface PriceRule {
    id: string
    clinic_id: string
    health_insurance_id: string
    plan_id: string | null
    tuss_code: string
    tuss_description?: string
    price: number
    requires_authorization: boolean
    max_sessions?: number | null
    valid_from?: string | null
    valid_to?: string | null
    health_insurances?: { name: string }
    health_insurance_plans?: { name: string }
}

interface TussProcedure {
    id: string
    code: string
    description: string
    modality?: string
}

export function TabelaPrecosTab() {
    const queryClient = useQueryClient()
    const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>('all')
    const [selectedPlanId, setSelectedPlanId] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<PriceRule | null>(null)

    // Form State
    const [formInsuranceId, setFormInsuranceId] = useState<string>('')
    const [formPlanId, setFormPlanId] = useState<string>('')
    const [formTussSearch, setFormTussSearch] = useState('')
    const [selectedTuss, setSelectedTuss] = useState<TussProcedure | null>(null)
    const [formPrice, setFormPrice] = useState<string>('')
    const [formRequiresAuth, setFormRequiresAuth] = useState(true)
    const [formMaxSessions, setFormMaxSessions] = useState<string>('')

    // CSV Import State
    const [csvContent, setCsvContent] = useState('')
    const [importLoading, setImportLoading] = useState(false)

    // Buscar Operadoras
    const { data: insurancesResponse } = useQuery({
        queryKey: ['health-insurances-pricing-list'],
        queryFn: () => api.getFull<HealthInsurance[]>('/health-insurances', { status: 'ACTIVE' }),
    })
    const insurances = insurancesResponse?.data || []

    // Buscar Planos da Operadora Selecionada no Form
    const { data: plansResponse } = useQuery({
        queryKey: ['health-insurance-plans-form', formInsuranceId],
        queryFn: async () => {
            if (!formInsuranceId) return { data: [] as HealthInsurancePlan[] }
            return api.getFull<HealthInsurancePlan[]>(`/health-insurances/${formInsuranceId}/plans`)
        },
        enabled: !!formInsuranceId,
    })
    const formPlans: HealthInsurancePlan[] = (plansResponse as any)?.data || []

    // Buscar Regras de Preço
    const { data: pricingData, isLoading: isPricingLoading, refetch: refetchPricing } = useQuery({
        queryKey: ['tiss-pricing-rules', selectedInsuranceId, selectedPlanId, searchTerm],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (selectedInsuranceId && selectedInsuranceId !== 'all') params.append('health_insurance_id', selectedInsuranceId)
            if (selectedPlanId && selectedPlanId !== 'all') params.append('plan_id', selectedPlanId)
            if (searchTerm.trim()) params.append('search', searchTerm.trim())

            const res = await fetch(`/api/tiss/pricing?${params.toString()}`)
            if (!res.ok) throw new Error('Erro ao buscar regras de preço')
            const json = await res.json()
            return json.data as PriceRule[]
        }
    })

    // Autocomplete TUSS
    const { data: tussResults, isLoading: isTussLoading } = useQuery({
        queryKey: ['tuss-search', formTussSearch],
        queryFn: async () => {
            if (!formTussSearch.trim() || formTussSearch.length < 2) return []
            const res = await fetch(`/api/tiss/tuss?search=${encodeURIComponent(formTussSearch.trim())}`)
            if (!res.ok) return []
            const json = await res.json()
            return json.data as TussProcedure[]
        },
        enabled: formTussSearch.length >= 2 && !selectedTuss
    })

    // Criar Regra
    const createRuleMutation = useMutation({
        mutationFn: async () => {
            if (!formInsuranceId) throw new Error('Selecione uma operadora')
            if (!selectedTuss?.code) throw new Error('Selecione um procedimento TUSS')
            const priceNum = parseFloat(formPrice.replace(',', '.'))
            if (isNaN(priceNum) || priceNum < 0) throw new Error('Valor inválido')

            const payload = {
                health_insurance_id: formInsuranceId,
                plan_id: formPlanId && formPlanId !== 'all' ? formPlanId : null,
                tuss_code: selectedTuss.code,
                tuss_description: selectedTuss.description,
                price: priceNum,
                requires_authorization: formRequiresAuth,
                max_sessions: formMaxSessions ? parseInt(formMaxSessions, 10) : null
            }

            const res = await fetch('/api/tiss/pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json();
                const errorMsg = typeof err.error === 'string' ? err.error : err.error?.message || err.message || 'Erro ao cadastrar regra de preço';
                throw new Error(errorMsg);
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Preço cadastrado com sucesso')
            setIsAddOpen(false)
            resetForm()
            queryClient.invalidateQueries({ queryKey: ['tiss-pricing-rules'] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao salvar regra')
        }
    })

    // Excluir Regra
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/tiss/pricing?id=${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const err = await res.json();
                const errorMsg = typeof err.error === 'string' ? err.error : err.error?.message || err.message || 'Erro ao excluir regra';
                throw new Error(errorMsg);
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Regra de preço excluída com sucesso')
            setDeleteTarget(null)
            queryClient.invalidateQueries({ queryKey: ['tiss-pricing-rules'] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao excluir')
        }
    })

    // Importar CSV
    const handleImportCsv = async () => {
        if (!csvContent.trim()) {
            toast.error('Cole o conteúdo CSV antes de importar')
            return
        }
        setImportLoading(true)
        try {
            // Se o CSV contém codigo,descricao -> cadastra no catalogo TUSS
            // Ou se tem codigo,preco -> vincula
            const lines = csvContent.split('\n').filter(l => l.trim().length > 0)
            const procedures: { code: string; description: string }[] = []

            for (const line of lines) {
                const parts = line.split(/[;,]/)
                if (parts.length >= 2) {
                    const code = parts[0].trim().replace(/\D/g, '')
                    const desc = parts[1].trim()
                    if (code && desc) {
                        procedures.push({ code, description: desc })
                    }
                }
            }

            if (procedures.length === 0) {
                throw new Error('Nenhum procedimento válido reconhecido no formato codigo;descricao')
            }

            const res = await fetch('/api/tiss/tuss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'import', procedures })
            })

            if (!res.ok) {
                const err = await res.json();
                const errorMsg = typeof err.error === 'string' ? err.error : err.error?.message || err.message || 'Erro ao importar procedimentos';
                throw new Error(errorMsg);
            }

            toast.success(`${procedures.length} procedimento(s) TUSS importados com sucesso`)
            setIsImportOpen(false)
            setCsvContent('')
            queryClient.invalidateQueries({ queryKey: ['tiss-pricing-rules'] })
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar importação')
        } finally {
            setImportLoading(false)
        }
    }

    const resetForm = () => {
        setFormInsuranceId('')
        setFormPlanId('')
        setFormTussSearch('')
        setSelectedTuss(null)
        setFormPrice('')
        setFormRequiresAuth(true)
        setFormMaxSessions('')
    }

    const rules = pricingData || []

    return (
        <div className="space-y-6">
            {/* Header & Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground tracking-tight">Tabela de Preços e Catálogo TUSS</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Defina valores negociados por operadora, exigência de autorização e limites de sessões
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsImportOpen(true)}
                        className="h-10 px-3 text-xs font-medium"
                    >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Importar TUSS
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => { resetForm(); setIsAddOpen(true) }}
                        className="h-10 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Novo Preço / Procedimento
                    </Button>
                </div>
            </div>

            {/* Aviso de Catálogo TUSS Orientado por Dados */}
            {rules.length === 0 ? (
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="font-semibold text-amber-950 dark:text-amber-100">Catálogo TUSS não importado</p>
                        <p className="text-amber-800 dark:text-amber-300">
                            Catálogo TUSS não importado. Importe a tabela oficial da ANS antes de faturar.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/30 text-xs text-foreground">
                    <Info className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="font-semibold">Catálogo e Tabela de Preços Ativos</p>
                        <p className="text-muted-foreground">
                            Utilize procedimentos homologados pela sua operadora. Em caso de atualizações de rol da ANS, importe a nova planilha oficial pelo botão "Importar TUSS".
                        </p>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <Card className="rounded-xl border border-border shadow-xs">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por Operadora</Label>
                            <Select value={selectedInsuranceId} onValueChange={setSelectedInsuranceId}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Todas as operadoras" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as operadoras</SelectItem>
                                    {insurances.map(ins => (
                                        <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Busca (Código ou Procedimento)</Label>
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por código ou descrição do procedimento..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-10 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetchPricing()}
                                className="h-10 w-full sm:w-auto px-4 text-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Atualizar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Preços Cadastrados */}
            <Card className="rounded-xl border border-border shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="text-xs font-semibold">Código TUSS</TableHead>
                                <TableHead className="text-xs font-semibold">Descrição do Procedimento</TableHead>
                                <TableHead className="text-xs font-semibold">Operadora / Plano</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Valor Negociado</TableHead>
                                <TableHead className="text-xs font-semibold text-center">Exige Senha?</TableHead>
                                <TableHead className="text-xs font-semibold text-center">Limite Sessões</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPricingLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                                        Carregando tabela de preços...
                                    </TableCell>
                                </TableRow>
                            ) : rules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                                        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-muted-foreground/60" />
                                        Nenhuma regra de preço cadastrada com os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rules.map(rule => (
                                    <TableRow key={rule.id} className="hover:bg-muted/30">
                                        <TableCell className="font-mono text-xs font-bold text-foreground">
                                            {rule.tuss_code}
                                        </TableCell>
                                        <TableCell className="text-xs max-w-xs truncate text-foreground font-medium">
                                            {rule.tuss_description || 'Procedimento TUSS'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div className="font-medium text-foreground">
                                                {rule.health_insurances?.name || 'Operadora'}
                                            </div>
                                            {rule.health_insurance_plans?.name && (
                                                <div className="text-[11px] text-muted-foreground">
                                                    Plano: {rule.health_insurance_plans.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-right text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(rule.price)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {rule.requires_authorization ? (
                                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]">
                                                    Obrigatória
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 text-[10px]">
                                                    Dispensada
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-center text-muted-foreground">
                                            {rule.max_sessions ? `${rule.max_sessions} sessões` : 'Ilimitado'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteTarget(rule)}
                                                className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Modal Novo Preço */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Novo Preço de Procedimento</DialogTitle>
                        <DialogDescription className="text-xs">
                            Vincule um código TUSS à operadora e estabeleça o valor contratual
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Operadora */}
                        <div>
                            <Label className="text-xs font-semibold mb-1 block">Operadora *</Label>
                            <Select value={formInsuranceId} onValueChange={setFormInsuranceId}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Selecione a operadora" />
                                </SelectTrigger>
                                <SelectContent>
                                    {insurances.map(ins => (
                                        <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Plano Opcional */}
                        {formPlans.length > 0 && (
                            <div>
                                <Label className="text-xs font-semibold mb-1 block">Plano Específico (Opcional)</Label>
                                <Select value={formPlanId} onValueChange={setFormPlanId}>
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue placeholder="Válido para todos os planos da operadora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os planos</SelectItem>
                                        {formPlans.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Procedimento TUSS com Autocomplete */}
                        <div>
                            <Label className="text-xs font-semibold mb-1 block">Procedimento TUSS *</Label>
                            {selectedTuss ? (
                                <div className="p-3 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-foreground mr-2">{selectedTuss.code}</span>
                                        <span className="text-xs text-muted-foreground">{selectedTuss.description}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedTuss(null)}
                                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Alterar
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Digite o código TUSS ou nome do procedimento..."
                                            value={formTussSearch}
                                            onChange={(e) => setFormTussSearch(e.target.value)}
                                            className="pl-8 h-10 text-xs"
                                        />
                                    </div>
                                    {isTussLoading && (
                                        <p className="text-[11px] text-muted-foreground">Buscando na base TUSS...</p>
                                    )}
                                    {tussResults && tussResults.length > 0 && (
                                        <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border bg-popover shadow-sm">
                                            {tussResults.map(tuss => (
                                                <button
                                                    key={tuss.code}
                                                    type="button"
                                                    onClick={() => { setSelectedTuss(tuss); setFormTussSearch('') }}
                                                    className="w-full text-left p-2.5 hover:bg-muted/60 transition-colors text-xs flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span className="font-mono font-bold mr-2 text-primary">{tuss.code}</span>
                                                        <span className="text-foreground">{tuss.description}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {formTussSearch.length >= 2 && (!tussResults || tussResults.length === 0) && !isTussLoading && (
                                        <div className="text-[11px] text-muted-foreground p-2 border border-dashed rounded-md flex items-center justify-between">
                                            <span>Código não encontrado no catálogo. Deseja cadastrar manualmente?</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedTuss({
                                                    id: 'temp',
                                                    code: formTussSearch.trim(),
                                                    description: 'Procedimento Personalizado'
                                                })}
                                                className="h-7 text-xs ml-2"
                                            >
                                                Usar Código
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Valor e Sessões */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold mb-1 block">Valor Negociado (R$) *</Label>
                                <Input
                                    placeholder="0,00"
                                    value={formPrice}
                                    onChange={(e) => setFormPrice(e.target.value)}
                                    className="h-10 text-xs font-semibold"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold mb-1 block">Limite de Sessões (Opcional)</Label>
                                <Input
                                    type="number"
                                    placeholder="Sem limite"
                                    value={formMaxSessions}
                                    onChange={(e) => setFormMaxSessions(e.target.value)}
                                    className="h-10 text-xs"
                                />
                            </div>
                        </div>

                        {/* Exige Autorização */}
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
                            <div>
                                <Label className="text-xs font-semibold text-foreground">Exige Senha / Autorização Prévia?</Label>
                                <p className="text-[11px] text-muted-foreground">O sistema alertará se a guia for emitida sem autorização vinculada</p>
                            </div>
                            <Switch checked={formRequiresAuth} onCheckedChange={setFormRequiresAuth} />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsAddOpen(false)}
                            className="h-10 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => createRuleMutation.mutate()}
                            disabled={createRuleMutation.isPending}
                            className="h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {createRuleMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            Salvar Preço
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Importar CSV */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Importar Catálogo TUSS em Massa</DialogTitle>
                        <DialogDescription className="text-xs">
                            Cole o catálogo no formato: código;descrição (um por linha)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <textarea
                            className="w-full h-44 p-3 font-mono text-xs border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="codigo_tuss;descricao_procedimento&#10;Exemplo: cole aqui as linhas do arquivo CSV exportado da operadora ou da ANS"
                            value={csvContent}
                            onChange={(e) => setCsvContent(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Aviso de Integridade: Códigos de procedimentos e o catálogo de glosas da ANS são cadastrados inicialmente como [NAO_VERIFICADO]. Importe o arquivo CSV oficial da ANS ou da sua operadora para atualizar a base com segurança.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsImportOpen(false)}
                            className="h-10 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImportCsv}
                            disabled={importLoading}
                            className="h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {importLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            Importar Procedimentos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Confirmação de Exclusão */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-red-600">Excluir Regra de Preço</DialogTitle>
                        <DialogDescription className="text-xs text-foreground">
                            Tem certeza que deseja excluir esta regra de preço? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteTarget && (
                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                            <p><span className="font-semibold">Procedimento:</span> {deleteTarget.tuss_code} - {deleteTarget.tuss_description}</p>
                            <p><span className="font-semibold">Valor:</span> {formatCurrency(deleteTarget.price)}</p>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            className="h-10 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                            disabled={deleteMutation.isPending}
                            className="h-10 text-xs font-semibold"
                        >
                            {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
