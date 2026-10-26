'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ShieldCheck,
    Download,
    Copy,
    Check,
    Loader2,
    AlertCircle,
    Users,
    FileText,
    Calendar,
    DollarSign,
    FolderArchive,
    ExternalLink,
} from 'lucide-react'
import { BackupOverviewResult, BackupExecutionResult } from '@/lib/services/clinic-backup-service'

interface ClinicBackupModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    clinicId: string
    clinicName: string
}

export function ClinicBackupModal({
    open,
    onOpenChange,
    clinicId,
    clinicName,
}: ClinicBackupModalProps) {
    const [loadingOverview, setLoadingOverview] = useState(false)
    const [overview, setOverview] = useState<BackupOverviewResult | null>(null)
    const [generating, setGenerating] = useState(false)
    const [result, setResult] = useState<BackupExecutionResult | null>(null)
    const [copied, setCopied] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !clinicId) {
            setOverview(null)
            setResult(null)
            setErrorMsg(null)
            setCopied(false)
            return
        }

        async function fetchOverview() {
            setLoadingOverview(true)
            setErrorMsg(null)
            try {
                const res = await fetch(`/api/super-admin/clinics/${clinicId}/backup/overview`)
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || 'Falha ao obter dados da clínica.')
                }
                const data = await res.json()
                setOverview(data)
            } catch (err: any) {
                setErrorMsg(err.message || 'Erro ao carregar visão geral.')
            } finally {
                setLoadingOverview(false)
            }
        }

        fetchOverview()
    }, [open, clinicId])

    const handleGenerateBackup = async () => {
        if (generating || !clinicId) return
        setGenerating(true)
        setErrorMsg(null)

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}/backup`, {
                method: 'POST',
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Falha na compilação do backup.')
            }

            const data: BackupExecutionResult = await res.json()
            setResult(data)
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro durante a geração do backup.')
        } finally {
            setGenerating(false)
        }
    }

    const handleCopyLink = () => {
        if (!result?.downloadUrl) return
        navigator.clipboard.writeText(result.downloadUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    const handleDirectDownload = () => {
        if (!result?.downloadUrl) return
        window.open(result.downloadUrl, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
                <DialogHeader className="border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-slate-900">
                                Cofre de Portabilidade e Backup LGPD
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                {clinicName} • Amparo legal Art. 18, V (LGPD) e Resolução CFM nº 1.821/2007
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-3 space-y-4">
                    {errorMsg && (
                        <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Erro operacional:</p>
                                <p>{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {loadingOverview ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-2 text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                            <p className="text-xs">Auditando bases de dados e arquivos no Cloudflare R2...</p>
                        </div>
                    ) : overview && !result ? (
                        <div className="space-y-3.5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>Pacientes</span>
                                    </div>
                                    <p className="text-base font-semibold text-slate-800">{overview.patientsCount}</p>
                                    <p className="text-[11px] text-slate-400">cadastros ativos</p>
                                </div>

                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>Prontuários</span>
                                    </div>
                                    <p className="text-base font-semibold text-slate-800">{overview.medicalRecordsCount}</p>
                                    <p className="text-[11px] text-slate-400">evoluções clínicas</p>
                                </div>

                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Atendimentos</span>
                                    </div>
                                    <p className="text-base font-semibold text-slate-800">{overview.pastAppointmentsCount}</p>
                                    <p className="text-[11px] text-slate-400">histórico realizado</p>
                                </div>

                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                                        <FolderArchive className="h-3.5 w-3.5" />
                                        <span>Anexos / Nuvem</span>
                                    </div>
                                    <p className="text-base font-semibold text-slate-800">{overview.estimatedAttachmentsCount}</p>
                                    <p className="text-[11px] text-slate-400">PDFs e laudos R2</p>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-md space-y-1.5 text-xs text-slate-700">
                                <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                                    Diretrizes da Entrega Oficial:
                                </p>
                                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                    <li>Formatos interoperáveis: Planilhas Excel (.xlsx/.csv UTF-8) e JSON estruturado.</li>
                                    <li><strong>Histórico Realizado:</strong> {overview.pastAppointmentsCount} agendamentos passados incluídos. ({overview.futureAppointmentsExcludedCount} agendamentos futuros excluídos conforme alinhado).</li>
                                    <li><strong>Segurança LGPD:</strong> Biometria facial permanece protegida e excluída.</li>
                                    <li><strong>Garantia Probatória:</strong> Manifesto de integridade criptográfica SHA-256 e Termo de Entrega inclusos no pacote.</li>
                                </ul>
                            </div>
                        </div>
                    ) : null}

                    {generating && (
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center space-y-3 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <div>
                                <p className="font-semibold text-sm text-slate-800">Compilando Pacote de Portabilidade LGPD...</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                    Extraindo tabelas, gerando CSVs com BOM, baixando anexos do Cloudflare R2 e calculando assinaturas SHA-256. Aguarde alguns instantes.
                                </p>
                            </div>
                        </div>
                    )}

                    {result && !generating && (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                                        <Check className="h-4 w-4 text-emerald-600" />
                                        Pacote Oficial Compilado com Sucesso!
                                    </span>
                                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-white text-xs">
                                        Válido por 7 dias
                                    </Badge>
                                </div>
                                <div className="text-xs text-slate-700 space-y-1">
                                    <p><strong>Arquivo:</strong> <code className="bg-emerald-100/60 px-1 py-0.5 rounded text-[11px]">{result.fileName}</code></p>
                                    <p><strong>Tamanho total:</strong> {result.fileSizeFormatted}</p>
                                    <p><strong>Anexos digitais:</strong> {result.attachmentsSummary?.total || 0} arquivos ({result.attachmentsSummary?.pagamentosProfissionaisCount || 0} notas e recibos de pagamento de profissionais, {result.attachmentsSummary?.laudosEProntuariosCount || 0} laudos e prontuários clínicos, {result.attachmentsSummary?.identidadeVisualCount || 0} assets)</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">Link Seguro de Download (Cloudflare R2):</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={result.downloadUrl}
                                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-600 truncate focus:outline-none"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopyLink}
                                        className="min-h-[38px] px-3 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                                Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                                Copiar Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Este link permite o download direto do arquivo compactado e expira automaticamente em 7 dias.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs text-slate-600 hover:text-slate-900"
                    >
                        Fechar
                    </Button>

                    <div className="flex items-center gap-2">
                        {result ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyLink}
                                    className="text-xs border-slate-300 text-slate-700"
                                >
                                    {copied ? 'Link Copiado!' : 'Copiar Link para E-mail'}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleDirectDownload}
                                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                                >
                                    <Download className="h-3.5 w-3.5 mr-1" />
                                    Baixar ZIP Agora
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleGenerateBackup}
                                disabled={generating || loadingOverview || !overview}
                                className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                        Processando Pacote...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                                        Compilar Pacote LGPD
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
