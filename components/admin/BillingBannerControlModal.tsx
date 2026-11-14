'use client'

import { useEffect, useState } from 'react'
import {
    AlertTriangle,
    CalendarClock,
    CreditCard,
    Eye,
    EyeOff,
    Loader2,
    Shield,
    Users,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    type BillingBannerAudience,
    type BillingBannerMode,
    type BillingBannerStage,
    formatDateBr,
    getTodayBrtStr,
    normalizeDateStr,
} from '@/lib/utils/billing-banner'

export interface ClinicBannerControlTarget {
    id: string
    name: string
    subscriptionDueDate: string | null
    billingBanner?: {
        mode: BillingBannerMode
        activeFrom: string | null
        audience: BillingBannerAudience
        shouldShow: boolean
        stage: BillingBannerStage
    }
}

interface BillingBannerControlModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    clinic: ClinicBannerControlTarget | null
    onSaved: (
        clinicId: string,
        nextBanner: NonNullable<ClinicBannerControlTarget['billingBanner']>
    ) => void
}

export function BillingBannerControlModal({
    open,
    onOpenChange,
    clinic,
    onSaved,
}: BillingBannerControlModalProps) {
    const [mode, setMode] = useState<BillingBannerMode>('off')
    const [activeFrom, setActiveFrom] = useState<string>('')
    const [audience, setAudience] = useState<BillingBannerAudience>('all')
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !clinic) return
        const current = clinic.billingBanner
        const dueClean = normalizeDateStr(clinic.subscriptionDueDate)
        const today = getTodayBrtStr()

        setMode(current?.mode ?? 'off')
        setActiveFrom(current?.activeFrom || dueClean || today)
        setAudience(current?.audience ?? 'all')
        setErrorMsg(null)
    }, [open, clinic])

    if (!clinic) return null

    const todayStr = getTodayBrtStr()
    const dueClean = normalizeDateStr(clinic.subscriptionDueDate)
    const formattedDue = formatDateBr(dueClean) || 'Data não definida'

    // Preview simulation at the moment the banner becomes active
    const previewRefDate = mode === 'scheduled' && activeFrom ? activeFrom : todayStr
    const previewStage: BillingBannerStage =
        mode === 'off'
            ? 'none'
            : dueClean && dueClean > previewRefDate
                ? 'upcoming'
                : dueClean && dueClean === previewRefDate
                    ? 'due_today'
                    : 'overdue'

    const isWarningTone = previewStage === 'due_today' || previewStage === 'upcoming'

    const handleSave = async (overrideMode?: BillingBannerMode) => {
        const finalMode = overrideMode ?? mode
        if (finalMode === 'scheduled' && !normalizeDateStr(activeFrom)) {
            setErrorMsg('Informe uma data válida para iniciar o agendamento.')
            return
        }

        setSaving(true)
        setErrorMsg(null)
        try {
            const res = await fetch(`/api/super-admin/clinics/${clinic.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_billing_banner',
                    mode: finalMode,
                    active_from: finalMode === 'scheduled' ? normalizeDateStr(activeFrom) : null,
                    audience,
                }),
            })
            const result = await res.json()
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Falha ao atualizar configuração do banner.')
            }

            const evaluated = result.data?.evaluated
            onSaved(clinic.id, {
                mode: finalMode,
                activeFrom: finalMode === 'scheduled' ? normalizeDateStr(activeFrom) : null,
                audience,
                shouldShow: Boolean(evaluated?.shouldShow),
                stage: evaluated?.stage ?? 'none',
            })
            onOpenChange(false)
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Erro de comunicação ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-white border border-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-slate-700 shrink-0" />
                        <span>Controle do Banner de Cobrança</span>
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Clínica: <strong className="text-slate-900">{clinic.name}</strong> | Vencimento atual:{' '}
                        <strong className="text-slate-900">{formattedDue}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Modo de Exibição */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Modo de Ativação
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setMode('off')}
                                disabled={saving}
                                className={`min-h-[44px] px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 text-xs font-semibold ${
                                    mode === 'off'
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <EyeOff className="h-4 w-4 shrink-0" />
                                <span>Desligado</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('on')}
                                disabled={saving}
                                className={`min-h-[44px] px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 text-xs font-semibold ${
                                    mode === 'on'
                                        ? 'border-emerald-700 bg-emerald-700 text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Eye className="h-4 w-4 shrink-0" />
                                <span>Ligado Agora</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('scheduled')}
                                disabled={saving}
                                className={`min-h-[44px] px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 text-xs font-semibold ${
                                    mode === 'scheduled'
                                        ? 'border-amber-600 bg-amber-600 text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <CalendarClock className="h-4 w-4 shrink-0" />
                                <span>Agendar Início</span>
                            </button>
                        </div>
                    </div>

                    {/* Data de início quando agendado */}
                    {mode === 'scheduled' && (
                        <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2">
                            <Label htmlFor="banner-active-from" className="text-xs font-semibold text-amber-900">
                                Ativar automaticamente a partir de (00:00 horário de Brasília)
                            </Label>
                            <Input
                                id="banner-active-from"
                                type="date"
                                value={activeFrom}
                                onChange={(e) => setActiveFrom(e.target.value)}
                                disabled={saving}
                                className="min-h-[44px] bg-white border-amber-300 text-slate-900"
                            />
                            <p className="text-xs text-amber-800">
                                {activeFrom && activeFrom > todayStr
                                    ? `Hoje (${formatDateBr(todayStr)}) o banner permanecerá oculto e será exibido automaticamente a partir de ${formatDateBr(activeFrom)}.`
                                    : activeFrom
                                        ? `Como ${formatDateBr(activeFrom)} já foi atingida, o banner ficará visível imediatamente após salvar.`
                                        : 'Selecione a data desejada.'}
                            </p>
                        </div>
                    )}

                    {/* Público-Alvo */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Quem Visualiza o Banner
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setAudience('all')}
                                disabled={saving}
                                className={`min-h-[44px] px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-2.5 ${
                                    audience === 'all'
                                        ? 'border-slate-900 bg-slate-100 text-slate-900'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Users className="h-4 w-4 shrink-0 text-slate-700" />
                                <div>
                                    <p className="text-xs font-semibold">Toda a Equipe (Padrão)</p>
                                    <p className="text-[11px] text-slate-500">Admin, médicos e recepção</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setAudience('admin_only')}
                                disabled={saving}
                                className={`min-h-[44px] px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-2.5 ${
                                    audience === 'admin_only'
                                        ? 'border-slate-900 bg-slate-100 text-slate-900'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Shield className="h-4 w-4 shrink-0 text-slate-700" />
                                <div>
                                    <p className="text-xs font-semibold">Somente Administradores</p>
                                    <p className="text-[11px] text-slate-500">Oculto para equipe clínica</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Pré-visualização */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Pré-visualização na Conta da Clínica
                            {mode === 'scheduled' && activeFrom ? ` (em ${formatDateBr(activeFrom)})` : ''}
                        </Label>
                        {mode === 'off' ? (
                            <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                                Nenhum banner será exibido no dashboard desta clínica. A data de vencimento ({formattedDue}) permanece inalterada.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div
                                    className={
                                        isWarningTone
                                            ? 'bg-amber-500/10 border border-amber-500/30 rounded-lg px-3.5 py-2.5 text-amber-900 text-xs'
                                            : 'bg-red-50 border border-red-300 rounded-lg px-3.5 py-2.5 text-red-900 text-xs'
                                    }
                                >
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                                            <AlertTriangle
                                                className={`h-4 w-4 shrink-0 mt-0.5 ${
                                                    isWarningTone ? 'text-amber-600' : 'text-red-600'
                                                }`}
                                            />
                                            <div>
                                                <p className="font-semibold text-[11px] uppercase tracking-wide opacity-75 mb-0.5">
                                                    Visão do Administrador
                                                </p>
                                                <span className="font-semibold">
                                                    {previewStage === 'due_today'
                                                        ? 'Fatura com Vencimento Hoje: '
                                                        : previewStage === 'upcoming'
                                                            ? 'Aviso de Faturamento: '
                                                            : 'Suspensão de Serviços: '}
                                                </span>
                                                <span>
                                                    {previewStage === 'due_today'
                                                        ? `A mensalidade da sua clínica vence hoje (${formattedDue}). Regularize para manter o acesso contínuo aos serviços.`
                                                        : previewStage === 'upcoming'
                                                            ? `A mensalidade da sua clínica vence em ${formattedDue}. Regularize para manter o acesso contínuo aos serviços.`
                                                            : `Mensalidade vencida em ${formattedDue}. Regularize o pagamento para evitar a suspensão dos serviços.`}
                                                </span>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-3 py-1.5 rounded text-[11px] font-semibold text-white inline-flex items-center gap-1 shrink-0 ${
                                                isWarningTone ? 'bg-amber-600' : 'bg-red-600'
                                            }`}
                                        >
                                            <CreditCard className="h-3.5 w-3.5" />
                                            Pagar Agora
                                        </span>
                                    </div>
                                </div>

                                {audience === 'all' && (
                                    <div className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                                        <span className="font-semibold text-slate-800">Visão de Terapeutas e Recepção: </span>
                                        {previewStage === 'due_today'
                                            ? `Fatura com Vencimento Hoje: A mensalidade da clínica vence hoje (${formattedDue}). Por favor, solicite ao administrador para regularizar.`
                                            : previewStage === 'upcoming'
                                                ? `Aviso de Faturamento: A mensalidade da clínica vence em ${formattedDue}. Por favor, solicite ao administrador para regularizar.`
                                                : 'Suspensão Iminente: O acesso da clínica será restringido por fatura em aberto. Solicite ao administrador que regularize.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {errorMsg && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                            {errorMsg}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-3 border-t border-slate-100">
                    <div>
                        {(clinic.billingBanner?.mode === 'on' || clinic.billingBanner?.mode === 'scheduled') && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={saving}
                                onClick={() => handleSave('off')}
                                className="w-full sm:w-auto min-h-[44px] border-rose-300 text-rose-700 hover:bg-rose-50"
                            >
                                Desligar Banner
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={saving}
                            onClick={() => onOpenChange(false)}
                            className="min-h-[44px] px-4 text-slate-700 border-slate-300 hover:bg-slate-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSave()}
                            className="min-h-[44px] px-5 bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Configuração'
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

