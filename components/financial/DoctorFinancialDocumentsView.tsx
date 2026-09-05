'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
    Receipt,
    FileText,
    Upload,
    Download,
    CheckCircle2,
    Clock,
    AlertTriangle,
    CreditCard,
    Eye,
    Calendar,
    DollarSign,
    Loader2,
    FileSpreadsheet,
    FileCheck,
    Check,
    X,
    Sparkles
} from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
    NO_STATEMENT: {
        label: 'Em Processamento pela Clínica',
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700'
    },
    PENDING_INVOICE: {
        label: 'Aguardando Sua Nota Fiscal',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/40'
    },
    INVOICE_SENT: {
        label: 'Nota Enviada (Em Análise pela Clínica)',
        color: 'text-blue-700 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/40'
    },
    INVOICE_APPROVED: {
        label: 'Nota Fiscal Aprovada',
        color: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-800/40'
    },
    INVOICE_REJECTED: {
        label: 'Correção Necessária na Nota',
        color: 'text-rose-700 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-800/40'
    },
    PAID: {
        label: 'Repasse Pago pela Clínica',
        color: 'text-purple-700 dark:text-purple-300',
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        border: 'border-purple-200 dark:border-purple-800/40'
    }
}

export function DoctorFinancialDocumentsView() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

    // Modal de upload da NF pelo profissional
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
    const [selectedDoc, setSelectedDoc] = useState<any>(null)
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [invoiceAmount, setInvoiceAmount] = useState('')
    const [invoiceIssueDate, setInvoiceIssueDate] = useState(new Date().toISOString().split('T')[0])
    const [isUploading, setIsUploading] = useState(false)

    // Busca os documentos do terapeuta logado
    const { data: responseData, isLoading, refetch } = useQuery({
        queryKey: ['my-professional-financial-documents', selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/financial/professional-documents?year=${selectedYear}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Erro ao carregar demonstrativos')
            }
            return res.json()
        }
    })

    const documents = responseData?.documents || []

    // Abrir modal de upload de nota fiscal
    const handleOpenInvoiceModal = (doc: any) => {
        setSelectedDoc(doc)
        setInvoiceNumber(doc?.invoice_number || '')
        setInvoiceAmount(doc?.statement_amount ? String(doc.statement_amount) : (doc?.invoice_amount ? String(doc.invoice_amount) : ''))
        setInvoiceIssueDate(doc?.invoice_issue_date || new Date().toISOString().split('T')[0])
        setInvoiceFile(null)
        setInvoiceModalOpen(true)
    }

    // Salvar nota fiscal
    const handleSubmitInvoice = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDoc) return

        if (!invoiceFile && !selectedDoc.invoice_file_url) {
            toast({
                title: 'Arquivo obrigatório',
                description: 'Por favor, selecione o arquivo da sua Nota Fiscal (PDF ou XML).',
                variant: 'destructive'
            })
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('action', 'UPLOAD_INVOICE')
            formData.append('doctor_id', selectedDoc.doctor_id)
            formData.append('month_reference', selectedDoc.month_reference)
            formData.append('invoice_number', invoiceNumber)
            formData.append('invoice_amount', invoiceAmount || '0')
            formData.append('invoice_issue_date', invoiceIssueDate)
            if (invoiceFile) {
                formData.append('file', invoiceFile)
            }

            const res = await fetch('/api/financial/professional-documents', {
                method: 'POST',
                body: formData
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao enviar nota fiscal')

            toast({
                title: 'Nota Fiscal Enviada!',
                description: 'Sua nota fiscal foi enviada com sucesso para conferência da clínica.'
            })

            queryClient.invalidateQueries({ queryKey: ['my-professional-financial-documents', selectedYear] })
            setInvoiceModalOpen(false)
        } catch (err: any) {
            toast({
                title: 'Erro no envio',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header da Seção */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-foreground">
                            Notas Fiscais & Demonstrativos Mensais de Repasse
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Acesse o demonstrativo disponibilizado pela clínica e anexe sua Nota Fiscal (NFS-e) para liberação do pagamento
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Ano:</span>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px] h-9 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {[0, 1, 2, 3].map(i => {
                                const y = (new Date().getFullYear() - i).toString()
                                return <SelectItem key={y} value={y}>{y}</SelectItem>
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Lista dos Demonstrativos e Notas Fiscais */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                    ))}
                </div>
            ) : documents.length === 0 ? (
                <Card className="rounded-2xl border-dashed border-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 text-center py-12 px-4">
                    <CardContent className="space-y-3">
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            Nenhum demonstrativo disponibilizado para o ano de {selectedYear}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Assim que a administração da clínica disponibilizar seu demonstrativo mensal de repasse, ele aparecerá aqui para download e envio da sua Nota Fiscal.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3.5">
                    {documents.map((doc: any) => {
                        const statusCfg = STATUS_MAP[doc.status] || STATUS_MAP.NO_STATEMENT
                        const [yearStr, monthStr] = (doc.month_reference || '').split('-')
                        const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                        const monthFormatted = monthName.charAt(0).toUpperCase() + monthName.slice(1)

                        const canUploadInvoice = ['PENDING_INVOICE', 'INVOICE_REJECTED', 'INVOICE_SENT'].includes(doc.status)

                        return (
                            <Card 
                                key={doc.id}
                                className={cn(
                                    "rounded-2xl border transition-all duration-200 hover:shadow-md bg-white dark:bg-slate-900/40",
                                    doc.status === 'INVOICE_REJECTED' 
                                        ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20" 
                                        : doc.status === 'PENDING_INVOICE'
                                        ? "border-amber-300 dark:border-amber-900/60"
                                        : "border-slate-200/80 dark:border-slate-800"
                                )}
                            >
                                <CardContent className="p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        {/* Informações da Competência e Status */}
                                        <div className="space-y-1.5 min-w-[220px]">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                                    {monthFormatted}
                                                </h3>
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                                    statusCfg.bg,
                                                    statusCfg.color,
                                                    statusCfg.border
                                                )}>
                                                    {doc.status === 'PAID' && <Check className="w-3 h-3" />}
                                                    {doc.status === 'INVOICE_SENT' && <Clock className="w-3 h-3 animate-pulse" />}
                                                    {doc.status === 'INVOICE_REJECTED' && <AlertTriangle className="w-3 h-3" />}
                                                    {statusCfg.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">
                                                Competência: <span className="font-mono">{doc.month_reference}</span>
                                            </p>
                                        </div>

                                        {/* Dados Financeiros e Demonstrativo */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-y sm:border-y-0 sm:border-x border-slate-100 dark:border-slate-800/80 py-3 sm:py-0 sm:px-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repasse Líquido</p>
                                                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {formatCurrency(doc.statement_amount)}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demonstrativo</p>
                                                {doc.statement_file_url ? (
                                                    <a
                                                        href={doc.statement_file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-1 hover:underline"
                                                        title="Baixar demonstrativo da clínica"
                                                    >
                                                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate max-w-[120px]">{doc.statement_file_name || 'Baixar Arquivo'}</span>
                                                        <Download className="w-3 h-3 shrink-0" />
                                                    </a>
                                                ) : (
                                                    <p className="text-xs text-slate-400 mt-0.5 italic">Aguardando arquivo</p>
                                                )}
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sua Nota Fiscal</p>
                                                {doc.invoice_number ? (
                                                    <div className="mt-0.5">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                            NF nº {doc.invoice_number}
                                                        </p>
                                                        {doc.invoice_file_url && (
                                                            <a
                                                                href={doc.invoice_file_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                Ver anexo da nota
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-amber-600 font-medium mt-0.5">Não enviada</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ações do Profissional */}
                                        <div className="flex items-center gap-2 justify-end">
                                            {canUploadInvoice && (
                                                <Button
                                                    onClick={() => handleOpenInvoiceModal(doc)}
                                                    className={cn(
                                                        "h-9 px-3.5 text-xs font-bold shadow-xs transition-all",
                                                        doc.status === 'PENDING_INVOICE' || doc.status === 'INVOICE_REJECTED'
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                                    )}
                                                >
                                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                                    {doc.invoice_file_url ? 'Substituir Nota Fiscal' : 'Anexar Nota Fiscal'}
                                                </Button>
                                            )}

                                            {doc.statement_file_url && (
                                                <Button
                                                    variant="outline"
                                                    asChild
                                                    className="h-9 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800"
                                                >
                                                    <a href={doc.statement_file_url} target="_blank" rel="noreferrer">
                                                        <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                                        Demonstrativo
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Alerta de Correção Necessária */}
                                    {doc.status === 'INVOICE_REJECTED' && doc.rejection_reason && (
                                        <div className="mt-3.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="font-semibold">Correção solicitada pela administração da clínica:</strong>
                                                <p className="mt-0.5">{doc.rejection_reason}</p>
                                                <p className="text-[11px] text-rose-600/80 dark:text-rose-400 mt-1">
                                                    Por favor, emita ou anexe a nota corrigida clicando no botão &quot;Anexar Nota Fiscal&quot; acima.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Observações da clínica sobre o repasse */}
                                    {doc.statement_notes && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                                            <strong className="text-slate-700 dark:text-slate-300">Observações da clínica:</strong> {doc.statement_notes}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Modal de Anexo de Nota Fiscal pelo Profissional */}
            <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Receipt className="w-5 h-5 text-emerald-600" />
                            Anexar Nota Fiscal de Serviços (NFS-e)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Competência: <strong className="text-slate-800 dark:text-slate-200">{selectedDoc?.month_reference}</strong> • Valor do repasse: <strong className="text-emerald-600">{formatCurrency(selectedDoc?.statement_amount)}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitInvoice} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Número da NF *</Label>
                                <Input
                                    placeholder="Ex: 2026/042"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    required
                                    className="h-10 text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Valor da NF (R$) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={invoiceAmount}
                                    onChange={(e) => setInvoiceAmount(e.target.value)}
                                    required
                                    className="h-10 text-xs font-bold mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Data de Emissão da Nota</Label>
                            <Input
                                type="date"
                                value={invoiceIssueDate}
                                onChange={(e) => setInvoiceIssueDate(e.target.value)}
                                className="h-10 text-xs mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Arquivo da Nota Fiscal (PDF ou XML) *</Label>
                            <Input
                                type="file"
                                accept=".pdf,.xml,.png,.jpg,.jpeg"
                                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                className="h-10 text-xs mt-1 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700"
                            />
                            {selectedDoc?.invoice_file_name && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Nota atual: <strong className="text-slate-700 dark:text-slate-300">{selectedDoc.invoice_file_name}</strong>
                                </p>
                            )}
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setInvoiceModalOpen(false)}
                                disabled={isUploading}
                                className="h-9 text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUploading}
                                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar Nota Fiscal'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
