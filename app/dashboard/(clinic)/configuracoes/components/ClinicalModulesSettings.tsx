'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
    ClipboardList,
    FileSignature,
    Video,
    BookOpen,
    FileText,
    ShieldCheck,
    Users,
    Loader2,
    Save,
    RotateCcw,
    Check,
} from 'lucide-react'
import {
    ALL_CLINICAL_SESSION_SPECIALTIES,
    CLINICAL_SPECIALTY_OPTIONS,
    DEFAULT_CLINIC_CLINICAL_MODULES,
    type ClinicClinicalModules,
    type ClinicalSessionSpecialtyKey,
    normalizeClinicClinicalModules,
} from '@/lib/utils/clinic-clinical-modules'

export function ClinicalModulesSettings() {
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [modules, setModules] = useState<ClinicClinicalModules>({
        ...DEFAULT_CLINIC_CLINICAL_MODULES,
        sessionPlanSpecialties: [...ALL_CLINICAL_SESSION_SPECIALTIES],
    })
    const [initialModules, setInitialModules] = useState<ClinicClinicalModules>({
        ...DEFAULT_CLINIC_CLINICAL_MODULES,
        sessionPlanSpecialties: [...ALL_CLINICAL_SESSION_SPECIALTIES],
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [confirmResetOpen, setConfirmResetOpen] = useState(false)

    const loadModules = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/clinics/clinical-modules', { cache: 'no-store' })
            if (!res.ok) {
                throw new Error('Erro ao carregar módulos clínicos')
            }
            const data = await res.json()
            setClinicId(data.clinicId || null)
            const normalized = normalizeClinicClinicalModules(data.modules, data.clinicId)
            setModules(normalized)
            setInitialModules(normalized)
        } catch {
            toast.error('Não foi possível carregar os módulos da clínica.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadModules()
    }, [loadModules])

    const isDirty = JSON.stringify(modules) !== JSON.stringify(initialModules)

    const handleToggleSpecialty = (specialty: ClinicalSessionSpecialtyKey, checked: boolean) => {
        setModules((prev) => {
            const current = new Set(prev.sessionPlanSpecialties)
            if (checked) {
                current.add(specialty)
            } else {
                current.delete(specialty)
            }
            return {
                ...prev,
                sessionPlanSpecialties: Array.from(current),
            }
        })
    }

    const handleSave = async (targetModules: ClinicClinicalModules = modules) => {
        setSaving(true)
        try {
            const res = await fetch('/api/clinics/clinical-modules', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modules: targetModules }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao salvar módulos da clínica')
            }
            const saved = normalizeClinicClinicalModules(data.modules, clinicId)
            setModules(saved)
            setInitialModules(saved)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('clinic-modules-updated', { detail: saved })
                )
            }
            toast.success('Módulos da clínica atualizados com sucesso.')
        } catch (err: any) {
            toast.error(err?.message || 'Não foi possível salvar os módulos.')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmReset = async () => {
        const defaults: ClinicClinicalModules = {
            ...DEFAULT_CLINIC_CLINICAL_MODULES,
            sessionPlanSpecialties: [...ALL_CLINICAL_SESSION_SPECIALTIES],
        }
        setConfirmResetOpen(false)
        await handleSave(defaults)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando módulos da clínica...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 1. Central de Planos de Sessão & Bibliotecas por Especialidade */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <CardTitle className="text-base sm:text-lg font-semibold">
                                        Planos de Sessão e Metas por Especialidade
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/25">
                                        456+ Objetivos
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs sm:text-sm mt-0.5">
                                    Ative a biblioteca estruturada de objetivos, registro de tentativas/acertos e níveis de ajuda para as especialidades atendidas na sua clínica.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                            <Label htmlFor="toggle-session-plans" className="text-xs font-medium text-muted-foreground cursor-pointer">
                                {modules.sessionPlansEnabled ? 'Ativo' : 'Desativado'}
                            </Label>
                            <Switch
                                id="toggle-session-plans"
                                checked={modules.sessionPlansEnabled}
                                onCheckedChange={(checked) =>
                                    setModules((prev) => ({ ...prev, sessionPlansEnabled: checked }))
                                }
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {CLINICAL_SPECIALTY_OPTIONS.map((spec) => {
                            const checked =
                                modules.sessionPlansEnabled &&
                                modules.sessionPlanSpecialties.includes(spec.key)
                            return (
                                <div
                                    key={spec.key}
                                    className={`flex items-start justify-between gap-3 p-3.5 rounded-lg border transition-colors ${
                                        checked
                                            ? 'border-primary/35 bg-primary/[0.03]'
                                            : 'border-border bg-muted/20 opacity-80'
                                    }`}
                                >
                                    <label
                                        htmlFor={`spec-${spec.key}`}
                                        className="space-y-1 cursor-pointer flex-1 min-w-0"
                                    >
                                        <span className="text-sm font-semibold text-foreground block">
                                            {spec.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground block leading-relaxed">
                                            {spec.summary}
                                        </span>
                                    </label>
                                    <Switch
                                        id={`spec-${spec.key}`}
                                        checked={checked}
                                        disabled={!modules.sessionPlansEnabled}
                                        onCheckedChange={(val) => handleToggleSpecialty(spec.key, val)}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-card">
                        <label htmlFor="toggle-evolution-manual" className="flex items-start gap-3 cursor-pointer flex-1">
                            <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                                <span className="text-sm font-semibold text-foreground block">
                                    Manual de Boas Práticas de Evolução Terapêutica
                                </span>
                                <span className="text-xs text-muted-foreground block leading-relaxed">
                                    Disponibiliza para sua equipe o guia completo de escrita clínica (estrutura em 5 frases, exemplos e checklist anti-glosa).
                                </span>
                            </div>
                        </label>
                        <Switch
                            id="toggle-evolution-manual"
                            checked={modules.evolutionManualEnabled}
                            onCheckedChange={(checked) =>
                                setModules((prev) => ({ ...prev, evolutionManualEnabled: checked }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 2. Prontuário, Contratos Digitais e Teleconsulta */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border/60">
                    <CardTitle className="text-base sm:text-lg font-semibold">
                        Prontuário, Contratos Digitais e Atendimento Online
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Personalize o modelo padrão de evolução e escolha quais módulos avançados aparecem no menu lateral da sua clínica.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/20">
                        <label htmlFor="toggle-structured-evolution" className="flex items-start gap-3 cursor-pointer flex-1">
                            <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                                <span className="text-sm font-semibold text-foreground block">
                                    Ficha de Evolução Terapêutica Estruturada (7 Seções) como Padrão
                                </span>
                                <span className="text-xs text-muted-foreground block leading-relaxed">
                                    Abre automaticamente o modelo terapêutico em 7 seções (Objetivo, Procedimentos, Resposta, Interpretação, Conduta, Intercorrências e Família) com rubrica digital e PDF com a marca da sua clínica. Mesmo desativada como padrão, continua acessível no seletor do prontuário.
                                </span>
                            </div>
                        </label>
                        <Switch
                            id="toggle-structured-evolution"
                            checked={modules.structuredEvolutionDefault}
                            onCheckedChange={(checked) =>
                                setModules((prev) => ({ ...prev, structuredEvolutionDefault: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/20">
                        <label htmlFor="toggle-contracts" className="flex items-start gap-3 cursor-pointer flex-1">
                            <FileSignature className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                                <span className="text-sm font-semibold text-foreground block">
                                    Contratos, Termos e Assinatura Digital (Lei 14.063/2020)
                                </span>
                                <span className="text-xs text-muted-foreground block leading-relaxed">
                                    Permite criar modelos de contrato/consentimento, enviar links seguros para os pais ou profissionais assinarem pelo celular e manter registro auditável.
                                </span>
                            </div>
                        </label>
                        <Switch
                            id="toggle-contracts"
                            checked={modules.contractsEnabled}
                            onCheckedChange={(checked) =>
                                setModules((prev) => ({ ...prev, contractsEnabled: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/20">
                        <label htmlFor="toggle-teleconsulta" className="flex items-start gap-3 cursor-pointer flex-1">
                            <Video className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                                <span className="text-sm font-semibold text-foreground block">
                                    Teleconsulta Nativa por Vídeo (WebRTC)
                                </span>
                                <span className="text-xs text-muted-foreground block leading-relaxed">
                                    Habilita a sala de vídeo criptografada integrada ao prontuário para sessões online e orientações de pais.
                                </span>
                            </div>
                        </label>
                        <Switch
                            id="toggle-teleconsulta"
                            checked={modules.teleconsultaEnabled}
                            onCheckedChange={(checked) =>
                                setModules((prev) => ({ ...prev, teleconsultaEnabled: checked }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 3. Governança da Equipe e Fluxo da Recepção */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border/60">
                    <CardTitle className="text-base sm:text-lg font-semibold">
                        Governança da Equipe e Fluxo da Recepção
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Defina controles de conformidade LGPD para sua equipe e o fluxo de etapas utilizado pela recepção.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/20">
                        <label htmlFor="toggle-staff-gate" className="flex items-start gap-3 cursor-pointer flex-1">
                            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                                <span className="text-sm font-semibold text-foreground block">
                                    Exigir Assinatura de Termo de Sigilo / LGPD da Equipe
                                </span>
                                <span className="text-xs text-muted-foreground block leading-relaxed">
                                    Quando houver termo legal pendente para colaboradores, exige leitura e assinatura eletrônica antes de acessar o painel.
                                </span>
                            </div>
                        </label>
                        <Switch
                            id="toggle-staff-gate"
                            checked={modules.staffSignatureGateEnabled}
                            onCheckedChange={(checked) =>
                                setModules((prev) => ({ ...prev, staffSignatureGateEnabled: checked }))
                            }
                        />
                    </div>

                    <div className="space-y-2.5 p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary shrink-0" />
                            <Label className="text-sm font-semibold">Fluxo de Etapas na Recepção</Label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setModules((prev) => ({ ...prev, receptionFlowMode: 'full_4_steps' }))}
                                className={`text-left rounded-lg border-2 p-3.5 transition-colors ${
                                    modules.receptionFlowMode === 'full_4_steps'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-muted/20 hover:border-primary/45'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        Fluxo Completo (4 Etapas + Painel de TV)
                                    </span>
                                    {modules.receptionFlowMode === 'full_4_steps' && (
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3" />
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Check-in → Chamar no Painel de TV → Em Atendimento → Concluído. Ideal para recepções com chamada sonora.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setModules((prev) => ({ ...prev, receptionFlowMode: 'fast_2_steps' }))}
                                className={`text-left rounded-lg border-2 p-3.5 transition-colors ${
                                    modules.receptionFlowMode === 'fast_2_steps'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-muted/20 hover:border-primary/45'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        Fluxo Enxuto (2 Etapas Rápidas)
                                    </span>
                                    {modules.receptionFlowMode === 'fast_2_steps' && (
                                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3" />
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Check-in direto → Concluir atendimento (sem botão intermediário de chamada na TV). Ideal para clínicas sem tela de chamada.
                                </p>
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Barra de Persistência */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmResetOpen(true)}
                    disabled={saving}
                    className="min-h-[44px] gap-2"
                >
                    <RotateCcw className="w-4 h-4" />
                    Restaurar Padrão CliniGo
                </Button>

                <Button
                    type="button"
                    onClick={() => handleSave(modules)}
                    disabled={saving || !isDirty}
                    className="min-h-[44px] px-6 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Módulos da Clínica
                </Button>
            </div>

            <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
                <AlertDialogContent className="max-w-md w-[95vw]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restaurar módulos padrão?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja restaurar a configuração padrão do CliniGo (Planos de Sessão das 6 especialidades, Manual de Evolução, Contratos Digitais e Teleconsulta ativados)?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmReset}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px]"
                        >
                            Restaurar Padrão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
