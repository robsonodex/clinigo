'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { SignaturePad } from '@/components/signature/SignaturePad'
import { cn } from '@/lib/utils'
import {
    Save,
    Printer,
    CheckCircle2,
    ShieldCheck,
    RotateCcw,
    Loader2,
    Lock,
    FileText,
    Calendar,
    User,
    Stethoscope,
    PenLine,
    Camera,
    AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface WorldSensoryData {
    objetivo_sessao: string
    procedimentos_realizados: string
    resposta_paciente_geral: string
    desempenho_observado: string
    nivel_ajuda_necessario: string
    interpretacao_dados_indicam: string
    interpretacao_comparacao_anteriores: string
    conduta: string
    intercorrencias: string
    orientacoes_contato_familia: string
}

export const initialWorldSensoryData: WorldSensoryData = {
    objetivo_sessao: '',
    procedimentos_realizados: '',
    resposta_paciente_geral: '',
    desempenho_observado: '',
    nivel_ajuda_necessario: '',
    interpretacao_dados_indicam: '',
    interpretacao_comparacao_anteriores: '',
    conduta: '',
    intercorrencias: '',
    orientacoes_contato_familia: '',
}

interface WorldSensoryEvolutionFormProps {
    data: WorldSensoryData
    onChange: (field: keyof WorldSensoryData, value: string) => void
    onSave: () => Promise<void>
    onSign?: () => void
    isSaving: boolean
    isLocked: boolean
    isSigned: boolean
    sessionStatus?: string
    onSessionStatusChange?: (status: string) => void
    sessionStatusNotes?: string
    onSessionStatusNotesChange?: (notes: string) => void
    signatureImageUrl?: string | null
    onSaveDigitalSignature?: (dataUrl: string, meta: { signerName: string; councilNumber: string; signedAt: string; hash: string }) => Promise<void>
    signatureData?: {
        signerName: string
        specialty?: string
        councilNumber?: string
        signedAt?: string
        signatureImageUrl?: string
        hash?: string
    } | null
    doctor?: {
        name?: string
        specialty?: string
        crm?: string
        crm_state?: string
        council_name?: string
    } | null
    patient?: {
        full_name?: string
        birth_date?: string
        cpf?: string
    } | null
    appointment?: {
        id?: string
        appointment_date?: string
        appointment_time?: string
        doctor_checkin_method?: string
        verification_level?: string
        session_status_notes?: string
        checkin_confirmed_at?: string | null
        checkin_method?: string | null
        checked_in_at?: string | null
        manual_checkin_unlocked_at?: string | null
    } | null
    clinicName?: string
}

export function WorldSensoryEvolutionForm({
    data,
    onChange,
    onSave,
    onSign,
    isSaving,
    isLocked,
    isSigned,
    sessionStatus = 'Presente',
    onSessionStatusChange,
    sessionStatusNotes = '',
    onSessionStatusNotesChange,
    signatureImageUrl,
    onSaveDigitalSignature,
    signatureData,
    doctor,
    patient,
    appointment,
    clinicName = 'World Sensory'
}: WorldSensoryEvolutionFormProps) {
    const printableRef = useRef<HTMLDivElement>(null)
    const [isPrinting, setIsPrinting] = useState(false)
    const [showSignatureModal, setShowSignatureModal] = useState(false)
    const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null)
    const [isSavingSignature, setIsSavingSignature] = useState(false)

    // Resolução dos dados do profissional para o bloco de assinatura dinâmico
    const doctorFullName = signatureData?.signerName || doctor?.name || 'Profissional'
    const doctorSpecialty = signatureData?.specialty || doctor?.specialty || 'Terapeuta'
    
    let doctorCouncilString = signatureData?.councilNumber || ''
    if (!doctorCouncilString && doctor?.crm && doctor.crm.trim().toLowerCase() !== 'não tem' && doctor.crm.trim().toLowerCase() !== 'nao tem') {
        const prefix = doctor.council_name || 'Conselho'
        const crmNum = doctor.crm.trim()
        const state = doctor.crm_state ? doctor.crm_state.trim().toUpperCase() : ''
        
        if (prefix.toUpperCase().includes('CREFITO')) {
            const regiao = state === 'SP' ? '3' : (state === 'RJ' ? '2' : (state === 'MG' ? '4' : ''))
            const regiaoStr = regiao ? ` ${regiao}` : ''
            doctorCouncilString = `Crefito${regiaoStr} – ${crmNum}`
        } else {
            doctorCouncilString = `${prefix} – ${crmNum}${state ? `/${state}` : ''}`
        }
    }

    // Validacao biometrica e controle de evolucao
    const isBiometricsValidated = Boolean(
        appointment?.doctor_checkin_method === 'FACIAL_DOCTOR' || 
        appointment?.verification_level === 'DOUBLE_VERIFIED' || 
        appointment?.verification_level === 'FACIAL_DOCTOR' ||
        appointment?.checkin_method === 'facial' ||
        appointment?.checkin_confirmed_at ||
        appointment?.checked_in_at ||
        appointment?.manual_checkin_unlocked_at ||
        sessionStatusNotes?.toLowerCase().includes('biometria')
    )
    const isPresenceSession = sessionStatus === 'Presente' || sessionStatus === 'Reposição'
    const isEvolutionBlockedByBiometrics = isPresenceSession && !isBiometricsValidated

    const generateAuditHash = async (content: string) => {
        try {
            const msgBuffer = new TextEncoder().encode(content)
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        } catch {
            return 'SIG-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase()
        }
    }

    const handleConfirmSignature = async () => {
        if (!pendingDataUrl) {
            toast.error('Por favor, desenhe sua rubrica no quadro antes de confirmar')
            return
        }
        setIsSavingSignature(true)
        try {
            const timestamp = new Date().toISOString()
            const payloadToHash = `${patient?.full_name || ''}_${doctorFullName}_${doctorCouncilString}_${timestamp}_${pendingDataUrl.length}`
            const hash = await generateAuditHash(payloadToHash)

            if (onSaveDigitalSignature) {
                await onSaveDigitalSignature(pendingDataUrl, {
                    signerName: doctorFullName,
                    councilNumber: doctorCouncilString,
                    signedAt: timestamp,
                    hash
                })
            }
            setShowSignatureModal(false)
            toast.success('Assinatura digital gravada com sucesso! O prontuário foi autenticado e bloqueado.')
        } catch (e: any) {
            toast.error(e.message || 'Erro ao gravar assinatura')
        } finally {
            setIsSavingSignature(false)
        }
    }

    const handlePrint = async () => {
        if (!printableRef.current) return
        setIsPrinting(true)
        try {
            const html2pdf = (await import('html2pdf.js')).default
            const patientName = (patient?.full_name || 'paciente').replace(/\s+/g, '_')
            const dateStr = appointment?.appointment_date || format(new Date(), 'yyyy-MM-dd')
            const filename = `Evolucao_WorldSensory_${patientName}_${dateStr}.pdf`

            const opt = {
                margin: [10, 10, 10, 10],
                filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            }

            await (html2pdf() as any).set(opt).from(printableRef.current).save()
            toast.success('Documento PDF gerado com sucesso')
        } catch (error) {
            console.error('Erro ao gerar PDF:', error)
            toast.error('Erro ao gerar PDF da evolução')
        } finally {
            setIsPrinting(false)
        }
    }

    const handleClearFields = () => {
        if (isLocked || isSigned) return
        if (window.confirm('Deseja limpar todos os campos desta evolução terapêutica?')) {
            Object.keys(initialWorldSensoryData).forEach((k) => {
                onChange(k as keyof WorldSensoryData, '')
            })
            toast.info('Campos limpos com sucesso')
        }
    }

    return (
        <div className="space-y-6">
            {/* Barra Superior de Ações com Feedback */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-xs font-semibold">
                            Ficha Exclusiva World Sensory
                        </Badge>
                        {isSigned ? (
                            <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Assinado Eletronicamente
                            </Badge>
                        ) : isLocked ? (
                            <Badge variant="destructive" className="gap-1 text-xs">
                                <Lock className="w-3.5 h-3.5" />
                                Registro Bloqueado (48h)
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-xs">
                                Em Edição
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Modelo oficial de Evolução Terapêutica em 7 seções com assinatura e conselho profissional integrados.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearFields}
                        disabled={isLocked || isSigned || isSaving}
                        className="min-h-[44px] h-11 px-3 text-xs"
                    >
                        <RotateCcw className="w-4 h-4 mr-1 text-muted-foreground" />
                        Limpar
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="min-h-[44px] h-11 px-3 text-xs"
                    >
                        {isPrinting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1 text-slate-600" />}
                        Imprimir / PDF
                    </Button>

                    {!isSigned && onSign && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                if (isEvolutionBlockedByBiometrics) {
                                    alert('A evolução está bloqueada: é obrigatório realizar a biometria facial do paciente para atendimentos presenciais.')
                                    return
                                }
                                onSign()
                            }}
                            disabled={isLocked || isSaving || isEvolutionBlockedByBiometrics}
                            className="min-h-[44px] h-11 px-3 text-xs font-semibold border border-emerald-300 text-emerald-800 dark:text-emerald-200 disabled:opacity-50"
                        >
                            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                            Assinar
                        </Button>
                    )}

                    <Button
                        type="button"
                        onClick={() => {
                            if (isEvolutionBlockedByBiometrics) {
                                alert('A evolução está bloqueada: é obrigatório realizar a biometria facial do paciente para atendimentos presenciais.')
                                return
                            }
                            onSave()
                        }}
                        disabled={isLocked || isSigned || isSaving || isEvolutionBlockedByBiometrics}
                        className="min-h-[44px] h-11 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                        Salvar Evolução
                    </Button>
                </div>
            </div>

            {/* FORMULÁRIO PRINCIPAL DE EVOLUÇÃO TERAPÊUTICA (7 SEÇÕES) */}
            <div ref={printableRef} className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 space-y-7 shadow-xs">
                {/* Cabeçalho da Ficha */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>WORLD SENSORY • USO INTERNO</span>
                        <span>Ficha de Evolução Terapêutica • World Sensory</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-center mt-3">
                        EVOLUÇÃO TERAPÊUTICA
                    </h2>

                    {/* Resumo do Atendimento */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Paciente:</span>
                            <span className="truncate">{patient?.full_name || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Data:</span>
                            <span>
                                {appointment?.appointment_date
                                    ? format(new Date(appointment.appointment_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                                    : format(new Date(), 'dd/MM/yyyy')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Profissional:</span>
                            <span className="truncate">{doctorFullName} ({doctorSpecialty})</span>
                        </div>
                    </div>
                </div>

                {/* 0. STATUS DA SESSÃO & CONTROLE DE COMPARECIMENTO (EXCLUSÃO DE FATURAMENTO SE NÃO COMPARECEU) */}
                <div data-html2canvas-ignore="true" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3 print:hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            Status do Atendimento / Presença *
                        </Label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {isBiometricsValidated && (
                                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 text-xs font-semibold gap-1">
                                    <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                    <span>Biometria Facial Validada</span>
                                </Badge>
                            )}
                            {isPresenceSession ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold">
                                    Atendimento Faturável ({sessionStatus})
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold">
                                    Não Faturável ({sessionStatus})
                                </Badge>
                            )}
                        </div>
                    </div>

                    {isEvolutionBlockedByBiometrics && (
                        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block text-sm">Bloqueio de Evolução • Biometria Facial Obrigatória</span>
                                O paciente ainda não realizou a biometria facial para este atendimento. A evolução clínica só pode ser salva após a confirmação biométrica do paciente na recepção ou liberação manual autorizada pela administração.
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                            { value: 'Presente', label: 'Presente', desc: 'Faturável' },
                            { value: 'Falta justificada', label: 'Falta justificada', desc: 'Sem repasse' },
                            { value: 'Falta injustificada', label: 'Falta injustificada', desc: 'Sem repasse' },
                            { value: 'Cancelamento pelo terapeuta', label: 'Canc. Terapeuta', desc: 'Sem repasse' },
                            { value: 'Cancelamento pelo paciente', label: 'Canc. Paciente', desc: 'Sem repasse' },
                            { value: 'Reposição', label: 'Reposição', desc: 'Faturável' },
                        ].map((item) => {
                            const isSelected = (sessionStatus || 'Presente') === item.value
                            const isFaturavelItem = item.value === 'Presente' || item.value === 'Reposição'
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    disabled={isLocked || isSigned}
                                    onClick={() => onSessionStatusChange && onSessionStatusChange(item.value)}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all min-h-[44px]",
                                        isSelected 
                                            ? isFaturavelItem
                                                ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                                                : "bg-amber-600 text-white border-amber-600 font-semibold shadow-xs"
                                            : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
                                    )}
                                >
                                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                                    <span className={cn(
                                        "text-[10px] mt-1",
                                        isSelected ? "text-white/80" : "text-muted-foreground"
                                    )}>
                                        {item.desc}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {!isPresenceSession && sessionStatus && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                            <p className="font-semibold">
                                Regra de Faturamento: Como a sessão está registrada como "{sessionStatus}", esta evolução ficará registrada no histórico clínico do paciente, mas está automaticamente EXCLUÍDA de cobrança e repasse financeiro. Apenas atendimentos com status "Presente" ou "Reposição" geram faturamento.
                            </p>
                            <div className="space-y-1">
                                <Label htmlFor="session_status_notes" className="text-xs font-medium text-amber-900 dark:text-amber-200">
                                    Motivo / Justificativa (opcional):
                                </Label>
                                <Input
                                    id="session_status_notes"
                                    value={sessionStatusNotes || ''}
                                    onChange={(e) => onSessionStatusNotesChange && onSessionStatusNotesChange(e.target.value)}
                                    placeholder="Ex: Atestado médico apresentado / aviso prévio de 24h..."
                                    disabled={isLocked || isSigned}
                                    className="bg-white dark:bg-slate-900 min-h-[40px] text-xs border-amber-300 dark:border-amber-800"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 1. OBJETIVO DA SESSÃO */}
                <div className="space-y-1.5">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            1. OBJETIVO DA SESSÃO
                        </Label>
                    </div>
                    <Textarea
                        value={data.objetivo_sessao}
                        onChange={(e) => onChange('objetivo_sessao', e.target.value)}
                        placeholder="Sessão direcionada a..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                    />
                </div>

                {/* 2. PROCEDIMENTOS REALIZADOS */}
                <div className="space-y-1.5">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            2. PROCEDIMENTOS REALIZADOS
                        </Label>
                    </div>
                    <Textarea
                        value={data.procedimentos_realizados}
                        onChange={(e) => onChange('procedimentos_realizados', e.target.value)}
                        placeholder="Foram utilizados..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                    />
                </div>

                {/* 3. RESPOSTA DO PACIENTE (COM SUB-CAMPOS) */}
                <div className="space-y-2">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            3. RESPOSTA DO PACIENTE
                        </Label>
                    </div>
                    <div className="space-y-2 pt-1">
                        <Textarea
                            value={data.resposta_paciente_geral}
                            onChange={(e) => onChange('resposta_paciente_geral', e.target.value)}
                            placeholder="O paciente realizou/apresentou..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                        />
                        <Textarea
                            value={data.desempenho_observado}
                            onChange={(e) => onChange('desempenho_observado', e.target.value)}
                            placeholder="O desempenho observado foi..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                        />
                        <Textarea
                            value={data.nivel_ajuda_necessario}
                            onChange={(e) => onChange('nivel_ajuda_necessario', e.target.value)}
                            placeholder="O nível de ajuda necessário foi..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>

                {/* 4. INTERPRETAÇÃO CLÍNICA (COM SUB-CAMPOS) */}
                <div className="space-y-2">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            4. INTERPRETAÇÃO CLÍNICA
                        </Label>
                    </div>
                    <div className="space-y-2 pt-1">
                        <Textarea
                            value={data.interpretacao_dados_indicam}
                            onChange={(e) => onChange('interpretacao_dados_indicam', e.target.value)}
                            placeholder="Os dados indicam que..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                        />
                        <Textarea
                            value={data.interpretacao_comparacao_anteriores}
                            onChange={(e) => onChange('interpretacao_comparacao_anteriores', e.target.value)}
                            placeholder="Em comparação às sessões anteriores, observa-se..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>

                {/* 5. CONDUTA */}
                <div className="space-y-1.5">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            5. CONDUTA
                        </Label>
                    </div>
                    <Textarea
                        value={data.conduta}
                        onChange={(e) => onChange('conduta', e.target.value)}
                        placeholder="Diante do desempenho observado, será..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                    />
                </div>

                {/* Rodapé da Página 1 na Impressão/PDF */}
                <div className="hidden print:block text-center pt-6 text-[11px] text-slate-500 border-t border-slate-200">
                    Ficha de Evolução Terapêutica • World Sensory
                </div>

                {/* Quebra de Página Exata para o PDF (Página 2) */}
                <div className="html2pdf__page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }} />

                {/* Cabeçalho da Página 2 na Impressão/PDF */}
                <div className="hidden print:flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-200">
                    <span>WORLD SENSORY • USO INTERNO</span>
                    <span>Ficha de Evolução Terapêutica • World Sensory</span>
                </div>

                {/* 6. INTERCORRÊNCIAS */}
                <div className="space-y-1.5 pt-2">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            6. INTERCORRÊNCIAS
                        </Label>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                        Descrição da intercorrência, manejo realizado e repercussão clínica:
                    </p>
                    <Textarea
                        value={data.intercorrencias}
                        onChange={(e) => onChange('intercorrencias', e.target.value)}
                        placeholder="Descreva eventuais intercorrências, manejo adotado e repercussão clínica..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                    />
                </div>

                {/* 7. ORIENTAÇÕES OU CONTATO COM FAMÍLIA/EQUIPE */}
                <div className="space-y-1.5">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            7. ORIENTAÇÕES OU CONTATO COM FAMÍLIA/EQUIPE
                        </Label>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                        Orientações, comunicação realizada ou encaminhamentos:
                    </p>
                    <Textarea
                        value={data.orientacoes_contato_familia}
                        onChange={(e) => onChange('orientacoes_contato_familia', e.target.value)}
                        placeholder="Orientações aos responsáveis, comunicação com equipe multidisciplinar ou encaminhamentos..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-sm border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 bg-white dark:bg-slate-950"
                    />
                </div>

                {/* BLOCO DE ASSINATURA DINÂMICO & ASSINATURA DIGITAL */}
                <div className="pt-8 border-t border-slate-300 dark:border-slate-700">
                    <div className="max-w-md mx-auto text-center space-y-1.5">
                        {/* Imagem da assinatura desenhada ou traço */}
                        {(signatureImageUrl || signatureData?.signatureImageUrl) ? (
                            <div className="py-2">
                                <img
                                    src={signatureImageUrl || signatureData?.signatureImageUrl}
                                    alt="Assinatura Digital"
                                    className="h-16 max-w-[220px] mx-auto object-contain border-b border-slate-400 dark:border-slate-600 pb-1"
                                />
                            </div>
                        ) : (
                            <div className="w-56 h-0.5 bg-slate-400 dark:bg-slate-600 mx-auto mb-3" />
                        )}

                        <p className="font-bold text-base text-slate-900 dark:text-slate-100">
                            {doctorFullName}
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {doctorSpecialty}
                        </p>
                        {doctorCouncilString && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                {doctorCouncilString}
                            </p>
                        )}

                        {(isSigned || signatureImageUrl || signatureData?.signedAt) ? (
                            <div className="mt-3 pt-2 border-t border-dashed border-emerald-300 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium space-y-1">
                                <div>
                                    Assinado Eletronicamente via Plataforma - {signatureData?.signedAt ? format(new Date(signatureData.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                                {signatureData?.hash && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                        Hash de Autenticidade: {signatureData.hash.slice(0, 24)}...
                                    </div>
                                )}
                            </div>
                        ) : (
                            !isLocked && (
                                <div className="pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowSignatureModal(true)}
                                        className="min-h-[44px] px-4 text-xs font-semibold gap-2 border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
                                    >
                                        <PenLine className="w-4 h-4 text-emerald-600" />
                                        Assinar com Rubrica Digital
                                    </Button>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Rodapé da Ficha */}
                <div className="text-center pt-4 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-900">
                    Ficha de Evolução Terapêutica • World Sensory
                </div>
            </div>

            {/* Modal de Assinatura Digital Touch / Mouse */}
            <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <PenLine className="w-5 h-5 text-emerald-600" />
                            Assinatura Digital do Profissional
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Desenhe sua rubrica no quadro abaixo. Ao confirmar, o prontuário será carimbado com seus dados profissionais, data/hora e hash de integridade, tornando-se imutável.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1 border border-slate-200 dark:border-slate-800">
                            <div><strong>Profissional:</strong> {doctorFullName}</div>
                            <div><strong>Especialidade:</strong> {doctorSpecialty}</div>
                            {doctorCouncilString && <div><strong>Conselho:</strong> {doctorCouncilString}</div>}
                        </div>

                        <div className="border rounded-xl p-2 bg-white dark:bg-slate-950">
                            <SignaturePad
                                onSave={(dataUrl) => setPendingDataUrl(dataUrl)}
                                onClear={() => setPendingDataUrl(null)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSignatureModal(false)}
                            className="min-h-[44px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSignature}
                            disabled={!pendingDataUrl || isSavingSignature}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[44px] gap-2"
                        >
                            {isSavingSignature ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Autenticando...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4" />
                                    Confirmar e Assinar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
