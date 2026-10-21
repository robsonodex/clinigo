'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    ShieldCheck,
    FileSpreadsheet,
    CloudDownload,
    FileText,
    Copy,
    Check,
    Loader2,
    Database,
    Cloud,
    AlertCircle,
    HardDrive,
    ExternalLink,
} from 'lucide-react'

interface ClinicBackupModalProps {
    isOpen: boolean
    onClose: () => void
    clinicId: string | null
    clinicName: string
}

interface OverviewData {
    clinicId: string
    clinicName: string
    patientsCount: number
    appointmentsCount: number
    medicalRecordsCount: number
    doctorsCount: number
    financialEntriesCount: number
    r2FilesCount: number
    r2TotalSizeBytes: number
}

interface GenerationResult {
    success: boolean
    fileName: string
    fileSizeBytes: number
    formattedSize: string
    hashSha256: string
    downloadUrl: string
    expiresAt: string
}

export function ClinicBackupModal({
    isOpen,
    onClose,
    clinicId,
    clinicName,
}: ClinicBackupModalProps) {
    const [loadingOverview, setLoadingOverview] = useState(false)
    const [overview, setOverview] = useState<OverviewData | null>(null)
    const [overviewError, setOverviewError] = useState<string | null>(null)

    // Opções
    const [includeExcelAndCsv, setIncludeExcelAndCsv] = useState(true)
    const [includeR2Files, setIncludeR2Files] = useState(true)
    const [includeDossiers, setIncludeDossiers] = useState(true)

    // Estado da Geração
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationError, setGenerationError] = useState<string | null>(null)
    const [result, setResult] = useState<GenerationResult | null>(null)
    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedHash, setCopiedHash] = useState(false)

    useEffect(() => {
        if (isOpen && clinicId) {
            setOverview(null)
            setOverviewError(null)
            setResult(null)
            setGenerationError(null)
            loadOverview(clinicId)
        }
    }, [isOpen, clinicId])

    const loadOverview = async (id: string) => {
        setLoadingOverview(true)
        setOverviewError(null)
        try {
            const res = await fetch(`/api/super-admin/clinics/${id}/backup/overview`)
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Falha ao consultar volumetria da clínica')
            }
            setOverview(data.overview)
        } catch (err: any) {
            setOverviewError(err?.message || 'Erro de conexão')
        } finally {
            setLoadingOverview(false)
        }
    }

    const handleGenerate = async () => {
        if (!clinicId) return
        setIsGenerating(true)
        setGenerationError(null)

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/backup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    includeExcelAndCsv,
                    includeR2Files,
                    includeDossiers,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Falha ao compilar pacote de backup')
            }

            setResult(data)
        } catch (err: any) {
            setGenerationError(err?.message || 'Erro ao processar pacote')
        } finally {
            setIsGenerating(false)
        }
    }

    const copyToClipboard = (text: string, type: 'link' | 'hash') => {
        navigator.clipboard.writeText(text)
        if (type === 'link') {
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2500)
        } else {
            setCopiedHash(true)
            setTimeout(() => setCopiedHash(false), 2500)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && !isGenerating && onClose()}>
            <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
                <DialogHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                        <ShieldCheck className="h-6 w-6 text-emerald-700" />
                        <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                            Cofre de Portabilidade & Dossiê LGPD
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-600 text-sm mt-1">
                        Compilação oficial e segura de todos os dados da instituição{' '}
                        <strong className="text-slate-900">{clinicName}</strong> em formatos abertos (Excel, CSV e Documentos R2).
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-5">
                    {/* 1. Raio-X da Clínica */}
                    {loadingOverview ? (
                        <div className="p-8 flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
                            <span className="text-sm">Auditando dados no Banco e Cloudflare R2...</span>
                        </div>
                    ) : overviewError ? (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold">Erro ao carregar auditoria da clínica</p>
                                <p>{overviewError}</p>
                            </div>
                        </div>
                    ) : overview ? (
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5" />
                                Raio-X da Base Identificada
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-xs text-slate-500 block">Pacientes</span>
                                    <span className="text-lg font-bold text-slate-900">
                                        {overview.patientsCount.toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-xs text-slate-500 block">Agendamentos</span>
                                    <span className="text-lg font-bold text-slate-900">
                                        {overview.appointmentsCount.toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-xs text-slate-500 block">Prontuários</span>
                                    <span className="text-lg font-bold text-slate-900">
                                        {overview.medicalRecordsCount.toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <span className="text-xs text-emerald-700 block">Arquivos no R2</span>
                                    <span className="text-lg font-bold text-emerald-900">
                                        {overview.r2FilesCount.toLocaleString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* 2. Seleção de Escopo */}
                    {!result && (
                        <div className="space-y-3 pt-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <HardDrive className="h-3.5 w-3.5" />
                                Escopo do Pacote de Exportação
                            </h4>
                            <div className="space-y-2 text-sm text-slate-700">
                                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeExcelAndCsv}
                                        onChange={e => setIncludeExcelAndCsv(e.target.checked)}
                                        disabled={isGenerating}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                    />
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-700 shrink-0" />
                                    <div>
                                        <p className="font-medium text-slate-900 leading-none">Planilha Consolidada Excel (.xlsx) e Arquivos CSV</p>
                                        <p className="text-xs text-slate-500 mt-1">Pacientes, profissionais, planos, convênios, financeiro e histórico de agendamentos.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeR2Files}
                                        onChange={e => setIncludeR2Files(e.target.checked)}
                                        disabled={isGenerating}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                    />
                                    <Cloud className="h-4 w-4 text-blue-600 shrink-0" />
                                    <div>
                                        <p className="font-medium text-slate-900 leading-none">Arquivos e Laudos Originais do Cloudflare R2</p>
                                        <p className="text-xs text-slate-500 mt-1">Todos os PDFs de relatórios anexados, fotos e comprovantes do bucket em nuvem.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeDossiers}
                                        onChange={e => setIncludeDossiers(e.target.checked)}
                                        disabled={isGenerating}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                    />
                                    <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                                    <div>
                                        <p className="font-medium text-slate-900 leading-none">Dossiês de Prontuários e Evoluções Terapêuticas</p>
                                        <p className="text-xs text-slate-500 mt-1">Histórico clínico cronológico completo agrupado por paciente.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* 3. Erro de Geração */}
                    {generationError && (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold">Erro durante a compilação do pacote</p>
                                <p>{generationError}</p>
                            </div>
                        </div>
                    )}

                    {/* 4. Resultado da Geração Concluída */}
                    {result && (
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                            <div className="flex items-center gap-2 text-emerald-800">
                                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                                <span className="font-bold text-base">Pacote Compilado e Disponível no Cloudflare R2!</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-emerald-100">
                                <div>
                                    <span className="text-slate-400 block">Nome do Arquivo:</span>
                                    <span className="font-mono font-medium text-slate-900 truncate block">
                                        {result.fileName}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Tamanho Compactado:</span>
                                    <span className="font-semibold text-slate-900">{result.formattedSize}</span>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-100">
                                    <span className="text-slate-400 block">Hash de Integridade (SHA-256):</span>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <span className="font-mono text-[11px] text-slate-600 truncate">
                                            {result.hashSha256}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(result.hashSha256, 'hash')}
                                            className="h-6 px-2 text-xs"
                                        >
                                            {copiedHash ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                            <span className="ml-1">{copiedHash ? 'Copiado' : 'Copiar'}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Botões de Ação do Resultado */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                <Button
                                    type="button"
                                    onClick={() => window.open(result.downloadUrl, '_blank')}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-2 flex-1 h-11"
                                >
                                    <CloudDownload className="h-4 w-4" />
                                    Baixar Arquivo ZIP Agora
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => copyToClipboard(result.downloadUrl, 'link')}
                                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium flex items-center justify-center gap-2 flex-1 h-11"
                                >
                                    {copiedLink ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                                    {copiedLink ? 'Link Copiado!' : 'Copiar Link Seguro (Válido por 7 dias)'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="text-slate-600 hover:text-slate-900"
                    >
                        {result ? 'Fechar' : 'Cancelar'}
                    </Button>

                    {!result && (
                        <Button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || loadingOverview || Boolean(overviewError)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-2 min-h-[44px] px-5"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Compilando Dossiê (Aguarde)...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>Compilar Pacote de Portabilidade LGPD</span>
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
