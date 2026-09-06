'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Save,
    Printer,
    CheckCircle2,
    ShieldCheck,
    RotateCcw,
    Loader2,
    Lock,
    FileText,
    Sparkles,
    Calendar,
    User,
    Stethoscope
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
    signatureData?: {
        signerName: string
        specialty?: string
        councilNumber?: string
        signedAt?: string
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
        appointment_date?: string
        appointment_time?: string
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
    signatureData,
    doctor,
    patient,
    appointment,
    clinicName = 'World Sensory'
}: WorldSensoryEvolutionFormProps) {
    const printableRef = useRef<HTMLDivElement>(null)
    const [isPrinting, setIsPrinting] = useState(false)

    // Resolução dos dados do profissional para o bloco de assinatura dinâmico
    const doctorFullName = signatureData?.signerName || doctor?.name || 'Profissional'
    const doctorSpecialty = signatureData?.specialty || doctor?.specialty || 'Terapeuta'
    
    const councilPrefix = doctor?.council_name || 'Conselho'
    const councilNum = doctor?.crm || ''
    const councilUF = doctor?.crm_state ? `/${doctor.crm_state}` : ''
    const doctorCouncilString = signatureData?.councilNumber || (councilNum ? `${councilPrefix} - ${councilNum}${councilUF}` : '')

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
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }

            await html2pdf().set(opt).from(printableRef.current).save()
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
                            onClick={onSign}
                            disabled={isLocked || isSaving}
                            className="min-h-[44px] h-11 px-3 text-xs font-semibold border border-emerald-300 text-emerald-800 dark:text-emerald-200"
                        >
                            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                            Assinar
                        </Button>
                    )}

                    <Button
                        type="button"
                        onClick={onSave}
                        disabled={isLocked || isSigned || isSaving}
                        className="min-h-[44px] h-11 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
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

                {/* 1. OBJETIVO DA SESSÃO */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                            1. OBJETIVO DA SESSÃO
                        </Label>
                    </div>
                    <Textarea
                        value={data.objetivo_sessao}
                        onChange={(e) => onChange('objetivo_sessao', e.target.value)}
                        placeholder="Sessão direcionada a..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-lg border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                    />
                </div>

                {/* 2. PROCEDIMENTOS REALIZADOS */}
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                        2. PROCEDIMENTOS REALIZADOS
                    </Label>
                    <Textarea
                        value={data.procedimentos_realizados}
                        onChange={(e) => onChange('procedimentos_realizados', e.target.value)}
                        placeholder="Foram utilizados..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-lg border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                    />
                </div>

                {/* 3. RESPOSTA DO PACIENTE (COM SUB-CAMPOS) */}
                <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase block">
                        3. RESPOSTA DO PACIENTE
                    </Label>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Apresentação e realização geral do paciente
                        </Label>
                        <Textarea
                            value={data.resposta_paciente_geral}
                            onChange={(e) => onChange('resposta_paciente_geral', e.target.value)}
                            placeholder="O paciente realizou/apresentou..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Desempenho observado
                        </Label>
                        <Textarea
                            value={data.desempenho_observado}
                            onChange={(e) => onChange('desempenho_observado', e.target.value)}
                            placeholder="O desempenho observado foi..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Nível de ajuda necessário
                        </Label>
                        <Textarea
                            value={data.nivel_ajuda_necessario}
                            onChange={(e) => onChange('nivel_ajuda_necessario', e.target.value)}
                            placeholder="O nível de ajuda necessário foi..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* 4. INTERPRETAÇÃO CLÍNICA (COM SUB-CAMPOS) */}
                <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase block">
                        4. INTERPRETAÇÃO CLÍNICA
                    </Label>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            O que os dados indicam
                        </Label>
                        <Textarea
                            value={data.interpretacao_dados_indicam}
                            onChange={(e) => onChange('interpretacao_dados_indicam', e.target.value)}
                            placeholder="Os dados indicam que..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Comparação com sessões anteriores
                        </Label>
                        <Textarea
                            value={data.interpretacao_comparacao_anteriores}
                            onChange={(e) => onChange('interpretacao_comparacao_anteriores', e.target.value)}
                            placeholder="Em comparação às sessões anteriores, observa-se..."
                            rows={2}
                            disabled={isLocked || isSigned}
                            className="text-base sm:text-sm resize-y rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* 5. CONDUTA */}
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                        5. CONDUTA
                    </Label>
                    <Textarea
                        value={data.conduta}
                        onChange={(e) => onChange('conduta', e.target.value)}
                        placeholder="Diante do desempenho observado, será..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-lg border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                    />
                </div>

                {/* 6. INTERCORRÊNCIAS */}
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                        6. INTERCORRÊNCIAS
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Descrição da intercorrência, manejo realizado e repercussão clínica:
                    </p>
                    <Textarea
                        value={data.intercorrencias}
                        onChange={(e) => onChange('intercorrencias', e.target.value)}
                        placeholder="Descreva eventuais intercorrências, manejo adotado e repercussão clínica..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-lg border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                    />
                </div>

                {/* 7. ORIENTAÇÕES OU CONTATO COM FAMÍLIA/EQUIPE */}
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                        7. ORIENTAÇÕES OU CONTATO COM FAMÍLIA/EQUIPE
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Orientações, comunicação realizada ou encaminhamentos:
                    </p>
                    <Textarea
                        value={data.orientacoes_contato_familia}
                        onChange={(e) => onChange('orientacoes_contato_familia', e.target.value)}
                        placeholder="Orientações aos responsáveis, comunicação com equipe multidisciplinar ou encaminhamentos..."
                        rows={3}
                        disabled={isLocked || isSigned}
                        className="text-base sm:text-sm resize-y rounded-lg border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500"
                    />
                </div>

                {/* BLOCO DE ASSINATURA DINÂMICO */}
                <div className="pt-8 border-t border-slate-300 dark:border-slate-700">
                    <div className="max-w-md mx-auto text-center space-y-1">
                        <div className="w-56 h-0.5 bg-slate-400 dark:bg-slate-600 mx-auto mb-3" />
                        <p className="font-bold text-base text-slate-900 dark:text-slate-100">
                            {doctorFullName}
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {doctorSpecialty}
                        </p>
                        {doctorCouncilString && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {doctorCouncilString}
                            </p>
                        )}
                        {isSigned && (
                            <div className="mt-3 pt-2 border-t border-dashed border-emerald-300 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                                Assinado Eletronicamente via Plataforma • {signatureData?.signedAt ? format(new Date(signatureData.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Rodapé da Ficha */}
                <div className="text-center pt-4 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-900">
                    Ficha de Evolução Terapêutica • World Sensory
                </div>
            </div>
        </div>
    )
}
