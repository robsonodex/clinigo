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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
    Sparkles,
    Calculator
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

    // Modal de Conferência de Produção do Terapeuta
    const [productionDetailOpen, setProductionDetailOpen] = useState(false)
    const [productionData, setProductionData] = useState<{ summary: any; items: any[] } | null>(null)
    const [isLoadingProduction, setIsLoadingProduction] = useState(false)
    const [isExportingExcel, setIsExportingExcel] = useState(false)
    const [selectedMonthForProduction, setSelectedMonthForProduction] = useState('')

    // Buscar e abrir produção do mês para o terapeuta
    const handleViewMyProduction = async (doc: any) => {
        setSelectedMonthForProduction(doc.month_reference)
        setIsLoadingProduction(true)
        setProductionDetailOpen(true)
        try {
            const res = await fetch(`/api/financial/production-summary?doctor_id=${doc.doctor_id}&month_reference=${doc.month_reference}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Erro ao consultar sua produção')
            }
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Falha no cálculo')
            setProductionData(data)
        } catch (err: any) {
            toast({
                title: 'Erro ao carregar produção',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsLoadingProduction(false)
        }
    }

    // Exportar planilha Excel da produção do terapeuta
    const handleExportMyProductionExcel = async () => {
        if (!productionData || !productionData.summary) return

        setIsExportingExcel(true)
        try {
            const ExcelJS = (await import('exceljs')).default
            const wb = new ExcelJS.Workbook()
            wb.creator = 'CliniGo'
            wb.created = new Date()

            const ws = wb.addWorksheet('Minha Produção')

            // Título
            ws.mergeCells('A1:G1')
            const titleCell = ws.getCell('A1')
            titleCell.value = 'DEMONSTRATIVO INDIVIDUAL DE PRODUÇÃO E REPASSE'
            titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
            ws.getRow(1).height = 30

            // Informações
            ws.getCell('A3').value = 'Profissional:'
            ws.getCell('B3').value = productionData.summary.doctor_name
            ws.getCell('A3').font = { bold: true }

            ws.getCell('D3').value = 'Competência:'
            ws.getCell('E3').value = productionData.summary.month_reference
            ws.getCell('D3').font = { bold: true }

            ws.getCell('A4').value = 'Especialidade:'
            ws.getCell('B4').value = productionData.summary.specialty || 'Não informada'
            ws.getCell('A4').font = { bold: true }

            ws.getCell('D4').value = 'Data de Emissão:'
            ws.getCell('E4').value = new Date().toLocaleDateString('pt-BR')
            ws.getCell('D4').font = { bold: true }

            // Bloco de Totais
            ws.mergeCells('A6:B6')
            ws.getCell('A6').value = 'RESUMO DO MÊS'
            ws.getCell('A6').font = { bold: true, color: { argb: 'FF1E293B' } }

            ws.getCell('A7').value = 'Total de Atendimentos:'
            ws.getCell('B7').value = productionData.summary.total_appointments
            ws.getCell('A8').value = 'Pacientes Atendidos:'
            ws.getCell('B8').value = productionData.summary.unique_patients_count
            ws.getCell('A9').value = 'Produção Bruta (R$):'
            ws.getCell('B9').value = productionData.summary.total_gross
            ws.getCell('B9').numFmt = 'R$ #,##0.00'
            ws.getCell('A10').value = 'Repasse Líquido (R$):'
            ws.getCell('B10').value = productionData.summary.total_net_repasse
            ws.getCell('B10').numFmt = 'R$ #,##0.00'
            ws.getCell('B10').font = { bold: true, color: { argb: 'FF15803D' } }

            // Tabela Detalhada
            const startTableRow = 12
            const tableHeaders = [
                'Data',
                'Horário',
                'Paciente',
                'Procedimento / Terapia',
                'Produção Bruta (R$)',
                'Seu Repasse (R$)',
                'Regra Aplicada'
            ]

            const headerRow = ws.getRow(startTableRow)
            tableHeaders.forEach((header, idx) => {
                const cell = headerRow.getCell(idx + 1)
                cell.value = header
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
                cell.alignment = { vertical: 'middle', horizontal: idx >= 4 && idx <= 5 ? 'right' : 'left' }
            })
            headerRow.height = 24

            productionData.items.forEach((item, index) => {
                const currentRowNum = startTableRow + 1 + index
                const row = ws.getRow(currentRowNum)

                let formattedDate = ''
                if (item.date) {
                    const parts = item.date.split('-')
                    formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.date
                }

                row.getCell(1).value = formattedDate
                row.getCell(2).value = item.time || ''
                row.getCell(3).value = item.patient_name
                row.getCell(4).value = item.procedure
                row.getCell(5).value = item.gross_amount
                row.getCell(5).numFmt = 'R$ #,##0.00'
                row.getCell(6).value = item.repasse_amount
                row.getCell(6).numFmt = 'R$ #,##0.00'
                row.getCell(6).font = { bold: true, color: { argb: 'FF15803D' } }
                row.getCell(7).value = item.rule_description

                if (index % 2 === 1) {
                    for (let c = 1; c <= 7; c++) {
                        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
                    }
                }
            })

            ws.getColumn(1).width = 14
            ws.getColumn(2).width = 10
            ws.getColumn(3).width = 32
            ws.getColumn(4).width = 26
            ws.getColumn(5).width = 20
            ws.getColumn(6).width = 22
            ws.getColumn(7).width = 38

            const buffer = await wb.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Minha_Producao_${productionData.summary.month_reference}.xlsx`
            link.click()
            window.URL.revokeObjectURL(url)

            toast({
                title: 'Planilha exportada!',
                description: 'Arquivo Excel baixado com sucesso.'
            })
        } catch (err: any) {
            toast({
                title: 'Erro ao exportar',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsExportingExcel(false)
        }
    }

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
                                        <div className="flex items-center gap-2 justify-end flex-wrap">
                                            {/* Conferir Produção do Mês */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewMyProduction(doc)}
                                                className="h-9 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-700 hover:border-emerald-300"
                                                title="Conferir todas as suas sessões realizadas e o cálculo de repasse deste mês"
                                            >
                                                <Calculator className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                                Conferir Produção
                                            </Button>

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

            {/* Modal de Conferência de Produção do Terapeuta */}
            <Dialog open={productionDetailOpen} onOpenChange={setProductionDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                                    <Calculator className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold text-foreground">
                                        Minha Produção — Competência {selectedMonthForProduction}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-0.5">
                                        Conferência detalhada das suas sessões e valores calculados de repasse
                                    </DialogDescription>
                                </div>
                            </div>
                            {productionData?.summary && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportMyProductionExcel}
                                    disabled={isExportingExcel}
                                    className="h-8 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 shrink-0"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    {isExportingExcel ? 'Gerando...' : 'Baixar Planilha (.xlsx)'}
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {isLoadingProduction ? (
                            <div className="p-12 text-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                                <p className="text-xs text-slate-500 font-medium">Carregando suas sessões do mês...</p>
                            </div>
                        ) : !productionData ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                                Nenhum dado disponível para este mês.
                            </div>
                        ) : (
                            <>
                                {/* Cards de KPI */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Atendimentos</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                                            {productionData.summary.total_appointments}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pacientes Atendidos</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                                            {productionData.summary.unique_patients_count}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 col-span-2 sm:col-span-1">
                                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Seu Repasse Líquido</p>
                                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                                            {formatCurrency(productionData.summary.total_net_repasse)}
                                        </p>
                                    </div>
                                </div>

                                {/* Tabela de atendimentos */}
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[380px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10">
                                                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Data / Hora</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Paciente</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Procedimento</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3 text-right">Seu Repasse</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Regra de Repasse</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productionData.items.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400 italic">
                                                            Nenhuma sessão realizada encontrada para a competência {selectedMonthForProduction}.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    productionData.items.map((it: any, idx: number) => {
                                                        const dateFormatted = it.date ? it.date.split('-').reverse().join('/') : ''
                                                        return (
                                                            <TableRow key={it.appointment_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-xs border-b border-slate-100 dark:border-slate-800/60">
                                                                <TableCell className="py-2.5 px-3 font-medium whitespace-nowrap">
                                                                    <span>{dateFormatted}</span>
                                                                    {it.time && <span className="text-slate-400 ml-1.5 font-mono text-[11px]">{it.time}</span>}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                                                    {it.patient_name}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                                                    {it.procedure}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                                    {formatCurrency(it.repasse_amount)}
                                                                </TableCell>
                                                                <TableCell className="py-2.5 px-3">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "text-[10px] font-normal px-1.5 py-0.5 rounded-md",
                                                                            it.is_custom_rate
                                                                                ? "border-emerald-300 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                                                                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                                                                        )}
                                                                    >
                                                                        {it.rule_description}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setProductionDetailOpen(false)}
                            className="h-9 text-xs"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
