'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DollarSign,
    ShieldAlert,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Save,
    Building2,
    Info,
    RotateCcw,
    Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth, useRole } from '@/lib/hooks/use-auth'
import { api } from '@/lib/api-client'
import type { HealthInsurance } from '@/lib/types/health-insurance'

export function ConveniosConfigTab() {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const { clinicId, isClinicAdmin, isSuperAdmin } = useRole()
    const canEdit = isClinicAdmin || isSuperAdmin

    // Clinic Settings State
    const [selectedRegime, setSelectedRegime] = useState<'PRODUCAO' | 'RECEBIMENTO'>('PRODUCAO')
    const [selectedPolicy, setSelectedPolicy] = useState<'CLINICA_ABSORVE' | 'DESCONTA_PROFISSIONAL' | 'DESCONTA_SE_MANTIDA'>('CLINICA_ABSORVE')
    const [selectedHashAlgo, setSelectedHashAlgo] = useState<'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL'>('LEGACY_SHA256_JSON')
    const [initialRegime, setInitialRegime] = useState<'PRODUCAO' | 'RECEBIMENTO'>('PRODUCAO')
    const [initialPolicy, setInitialPolicy] = useState<'CLINICA_ABSORVE' | 'DESCONTA_PROFISSIONAL' | 'DESCONTA_SE_MANTIDA'>('CLINICA_ABSORVE')
    const [initialHashAlgo, setInitialHashAlgo] = useState<'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL'>('LEGACY_SHA256_JSON')
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    // Inline edit for health insurance closing days
    const [operatorDays, setOperatorDays] = useState<Record<string, { closing_day: string; appeal_deadline_days: string }>>({})

    // Fetch clinic settings
    const { data: clinicData, isLoading: isClinicLoading, refetch: refetchClinic } = useQuery({
        queryKey: ['clinic-settings-repasse', clinicId],
        queryFn: async () => {
            if (!clinicId) return null
            const res = await fetch(`/api/clinics/${clinicId}`)
            if (!res.ok) throw new Error('Erro ao carregar configurações da clínica')
            const json = await res.json()
            return json.data
        },
        enabled: !!clinicId
    })

    // Fetch health insurances for closing day configuration
    const { data: insurancesResponse, isLoading: isInsurancesLoading } = useQuery({
        queryKey: ['health-insurances-config-list'],
        queryFn: () => api.getFull<HealthInsurance[]>('/health-insurances', { status: 'ACTIVE' }),
    })
    const insurances = insurancesResponse?.data || []

    useEffect(() => {
        if (clinicData) {
            const regime = (clinicData.repasse_regime as 'PRODUCAO' | 'RECEBIMENTO') || 'PRODUCAO'
            const policy = (clinicData.glosa_policy as 'CLINICA_ABSORVE' | 'DESCONTA_PROFISSIONAL' | 'DESCONTA_SE_MANTIDA') || 'CLINICA_ABSORVE'
            const hashAlgo = (clinicData.tiss_hash_algorithm as 'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL') || 'LEGACY_SHA256_JSON'
            setSelectedRegime(regime)
            setSelectedPolicy(policy)
            setSelectedHashAlgo(hashAlgo)
            setInitialRegime(regime)
            setInitialPolicy(policy)
            setInitialHashAlgo(hashAlgo)
            setLastUpdatedAt(clinicData.updated_at || null)
        }
    }, [clinicData])

    useEffect(() => {
        if (insurances.length > 0) {
            const initialMap: Record<string, { closing_day: string; appeal_deadline_days: string }> = {}
            insurances.forEach((ins) => {
                initialMap[ins.id] = {
                    closing_day: ins.closing_day?.toString() || '25',
                    appeal_deadline_days: ins.appeal_deadline_days?.toString() || '30'
                }
            })
            setOperatorDays(initialMap)
        }
    }, [insurances])

    const hasChanges = selectedRegime !== initialRegime || selectedPolicy !== initialPolicy || selectedHashAlgo !== initialHashAlgo

    // Mutation: Update Clinic Settings
    const updateClinicMutation = useMutation({
        mutationFn: async () => {
            if (!clinicId) throw new Error('Clínica não identificada')
            const res = await fetch(`/api/clinics/${clinicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repasse_regime: selectedRegime,
                    glosa_policy: selectedPolicy,
                    tiss_hash_algorithm: selectedHashAlgo,
                })
            })

            if (!res.ok) {
                const err = await res.json();
                const errorMsg = typeof err.error === 'string' ? err.error : err.error?.message || err.message || 'Erro ao atualizar configurações';
                throw new Error(errorMsg);
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Configurações de faturamento e repasse atualizadas com sucesso')
            setIsConfirmOpen(false)
            setInitialRegime(selectedRegime)
            setInitialPolicy(selectedPolicy)
            setInitialHashAlgo(selectedHashAlgo)
            queryClient.invalidateQueries({ queryKey: ['clinic-settings-repasse'] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao salvar alterações')
        }
    })

    // Mutation: Update Single Insurance Deadlines
    const updateInsuranceMutation = useMutation({
        mutationFn: async ({ id, closing_day, appeal_deadline_days }: { id: string; closing_day: number | null; appeal_deadline_days: number | null }) => {
            return api.patch(`/health-insurances/${id}`, {
                closing_day,
                appeal_deadline_days
            })
        },
        onSuccess: () => {
            toast.success('Prazos da operadora atualizados com sucesso')
            queryClient.invalidateQueries({ queryKey: ['health-insurances-config-list'] })
            queryClient.invalidateQueries({ queryKey: ['health-insurances'] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao atualizar operadora')
        }
    })

    const handleSaveInsurance = (id: string) => {
        const data = operatorDays[id]
        if (!data) return
        const closingNum = parseInt(data.closing_day, 10)
        const appealNum = parseInt(data.appeal_deadline_days, 10)

        if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) {
            toast.error('Dia de corte deve estar entre 1 e 31')
            return
        }
        if (isNaN(appealNum) || appealNum < 1 || appealNum > 365) {
            toast.error('Prazo de recurso deve ser entre 1 e 365 dias')
            return
        }

        updateInsuranceMutation.mutate({
            id,
            closing_day: closingNum,
            appeal_deadline_days: appealNum
        })
    }

    if (isClinicLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" />
                Carregando configurações de faturamento e repasse...
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">Regras de Faturamento, Repasse e Prazos</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Defina o regime financeiro de liberação dos repasses médicos e os prazos operacionais por convênio
                </p>
            </div>

            {/* Aviso de Não-Retroatividade */}
            <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 text-xs text-foreground">
                <Info className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
                <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Garantia de Não-Retroatividade</p>
                    <p className="text-muted-foreground">
                        Qualquer alteração efetuada nos parâmetros abaixo afeta exclusivamente os novos fechamentos de competência. Fechamentos anteriores já homologados permanecem inalterados com os valores históricos.
                    </p>
                </div>
            </div>

            {/* Configuração de Regime, Glosa e Hash */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Regime de Repasse */}
                <Card className="rounded-xl border border-border shadow-xs">
                    <CardHeader className="p-4 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Regime de Repasse Médico
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px]">
                                {selectedRegime === 'PRODUCAO' ? 'Por Produção' : 'Por Recebimento'}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            Define o momento em que o valor do repasse é disponibilizado para pagamento ao profissional
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Regime Vigente</Label>
                            <Select
                                value={selectedRegime}
                                onValueChange={(val: 'PRODUCAO' | 'RECEBIMENTO') => setSelectedRegime(val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRODUCAO">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Por Produção (Padrão)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="RECEBIMENTO">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Por Recebimento (Liquidação de Lote)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border border-border">
                            {selectedRegime === 'PRODUCAO' ? (
                                <>
                                    <p className="font-semibold text-foreground">Como funciona o Regime por Produção:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        O repasse é apurado na competência em que o atendimento foi realizado. O profissional tem direito ao repasse no fechamento mensal habitual da clínica, independentemente de a operadora de saúde já ter quitado o lote correspondente.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-foreground">Como funciona o Regime por Recebimento:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        O repasse do atendimento de convênio só é liberado para pagamento ao profissional após a clínica importar o demonstrativo de retorno e a operadora liquidar financeiramente o lote.
                                    </p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Política de Glosas */}
                <Card className="rounded-xl border border-border shadow-xs">
                    <CardHeader className="p-4 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                Política de Tratamento de Glosas
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px]">
                                {selectedPolicy === 'CLINICA_ABSORVE' && 'Clínica Absorve'}
                                {selectedPolicy === 'DESCONTA_PROFISSIONAL' && 'Desconta do Médico'}
                                {selectedPolicy === 'DESCONTA_SE_MANTIDA' && 'Desconta se Recurso Negado'}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            Define quem assume o ônus financeiro quando a operadora de saúde glosa o atendimento
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Política Vigente</Label>
                            <Select
                                value={selectedPolicy}
                                onValueChange={(val: any) => setSelectedPolicy(val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLINICA_ABSORVE">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Clínica Absorve Glosas (Padrão)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="DESCONTA_PROFISSIONAL">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Descontar Imediatamente do Profissional</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="DESCONTA_SE_MANTIDA">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Descontar Apenas se Recurso for Indeferido</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border border-border">
                            {selectedPolicy === 'CLINICA_ABSORVE' && (
                                <>
                                    <p className="font-semibold text-foreground">Como funciona o Modelo Clínica Absorve:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        A clínica assume integralmente o risco e o prejuízo de glosas administrativas ou técnicas. O profissional recebe o repasse integral do atendimento prestado.
                                    </p>
                                </>
                            )}
                            {selectedPolicy === 'DESCONTA_PROFISSIONAL' && (
                                <>
                                    <p className="font-semibold text-foreground">Como funciona o Desconto Imediato:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        O valor do repasse correspondente ao procedimento glosado é deduzido do demonstrativo do profissional na competência em que o retorno da operadora for processado.
                                    </p>
                                </>
                            )}
                            {selectedPolicy === 'DESCONTA_SE_MANTIDA' && (
                                <>
                                    <p className="font-semibold text-foreground">Como funciona o Desconto após Recurso:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        O repasse da guia fica provisionado durante o trâmite de recurso de glosa. O desconto definitivo só ocorre caso a operadora confirme a negativa em instância final.
                                    </p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Algoritmo de Hash TISS */}
                <Card className="rounded-xl border border-border shadow-xs md:col-span-2 lg:col-span-1">
                    <CardHeader className="p-4 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                Algoritmo de Hash do Lote TISS
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px]">
                                {selectedHashAlgo === 'LEGACY_SHA256_JSON' ? 'Histórico (SHA-256)' : 'ANS MD5 (Experimental)'}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            Define o algoritmo de cálculo do hash de integridade gravado na mensagem XML do lote
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Algoritmo Ativo</Label>
                            <Select
                                value={selectedHashAlgo}
                                onValueChange={(val: 'LEGACY_SHA256_JSON' | 'ANS_MD5_CANONICAL') => setSelectedHashAlgo(val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LEGACY_SHA256_JSON">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Padrão Histórico (SHA-256 / Compatibilidade)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="ANS_MD5_CANONICAL">
                                        <div className="py-0.5">
                                            <span className="font-medium text-xs">Padrão ANS (MD5 Canônico - Experimental)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs space-y-1.5 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
                            <p className="font-semibold flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Aviso de Homologação:
                            </p>
                            <p className="text-[11px] leading-relaxed">
                                O modo padrão ANS ainda NÃO foi validado com uma operadora real. Não altere sem orientação técnica. O padrão histórico mantém 100% de compatibilidade com os lotes já processados.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Botão de Salvar Alterações de Regime */}
            {canEdit && (
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                    <div className="text-xs text-muted-foreground">
                        {lastUpdatedAt && (
                            <span>Última atualização registrada no sistema: {new Date(lastUpdatedAt).toLocaleString('pt-BR')}</span>
                        )}
                    </div>
                    <Button
                        disabled={!hasChanges || updateClinicMutation.isPending}
                        onClick={() => setIsConfirmOpen(true)}
                        className="h-10 px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                    >
                        {updateClinicMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Salvar Alterações de Regime
                    </Button>
                </div>
            )}

            {/* Configuração de Prazos por Operadora */}
            <Card className="rounded-xl border border-border shadow-xs overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                Prazos Operacionais e Fechamento por Operadora
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Configure o dia de corte mensal de lote e o prazo limite em dias para apresentação de recursos de glosa
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="text-xs font-semibold">Operadora de Saúde</TableHead>
                                <TableHead className="text-xs font-semibold">Código ANS</TableHead>
                                <TableHead className="text-xs font-semibold text-center w-40">Dia de Corte do Lote</TableHead>
                                <TableHead className="text-xs font-semibold text-center w-44">Prazo de Recurso (Dias)</TableHead>
                                <TableHead className="text-xs font-semibold text-right w-28">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isInsurancesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                                        Carregando operadoras...
                                    </TableCell>
                                </TableRow>
                            ) : insurances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                                        Nenhuma operadora ativa cadastrada para configuração de prazos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                insurances.map(ins => {
                                    const currentValues = operatorDays[ins.id] || { closing_day: '25', appeal_deadline_days: '30' }
                                    return (
                                        <TableRow key={ins.id} className="hover:bg-muted/30">
                                            <TableCell className="text-xs font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span>{ins.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {ins.code || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={31}
                                                        value={currentValues.closing_day}
                                                        onChange={(e) => setOperatorDays(prev => ({
                                                            ...prev,
                                                            [ins.id]: {
                                                                ...prev[ins.id],
                                                                closing_day: e.target.value
                                                            }
                                                        }))}
                                                        disabled={!canEdit}
                                                        className="w-20 h-9 text-xs text-center font-mono"
                                                    />
                                                    <span className="text-xs text-muted-foreground">de cada mês</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        value={currentValues.appeal_deadline_days}
                                                        onChange={(e) => setOperatorDays(prev => ({
                                                            ...prev,
                                                            [ins.id]: {
                                                                ...prev[ins.id],
                                                                appeal_deadline_days: e.target.value
                                                            }
                                                        }))}
                                                        disabled={!canEdit}
                                                        className="w-20 h-9 text-xs text-center font-mono"
                                                    />
                                                    <span className="text-xs text-muted-foreground">dias corridos</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={!canEdit || updateInsuranceMutation.isPending}
                                                    onClick={() => handleSaveInsurance(ins.id)}
                                                    className="h-9 px-3 text-xs min-h-[44px]"
                                                >
                                                    Salvar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Modal de Confirmação com Alerta de Não-Retroatividade */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            Confirmar Alteração de Regime e Regras
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Esta alteração muda como os repasses do próximo fechamento são calculados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-900 dark:text-amber-300 space-y-1">
                            <p className="font-semibold">Atenção Crítica:</p>
                            <p>
                                Esta alteração NUNCA é aplicada retroativamente a competências já fechadas. Ela entrará em vigor exclusivamente nos próximos lotes e fechamentos em aberto.
                            </p>
                        </div>

                        <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1.5 font-mono text-[11px]">
                            <p><span className="font-semibold text-foreground">Novo Regime:</span> {selectedRegime === 'PRODUCAO' ? 'Por Produção' : 'Por Recebimento'}</p>
                            <p><span className="font-semibold text-foreground">Nova Política de Glosa:</span> {selectedPolicy}</p>
                            <p><span className="font-semibold text-foreground">Algoritmo de Hash TISS:</span> {selectedHashAlgo === 'LEGACY_SHA256_JSON' ? 'Histórico (SHA-256)' : 'Padrão ANS (MD5 Canônico)'}</p>
                            <p><span className="font-semibold text-foreground">Responsável pela alteração:</span> {user?.email || 'Administrador da Clínica'}</p>
                            <p><span className="font-semibold text-foreground">Data/Hora:</span> {new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsConfirmOpen(false)}
                            className="h-10 text-xs min-h-[44px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => updateClinicMutation.mutate()}
                            disabled={updateClinicMutation.isPending}
                            className="h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                        >
                            {updateClinicMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            Confirmar e Aplicar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
