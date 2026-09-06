'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
    XCircle,
    Clock,
    AlertTriangle,
    CreditCard,
    MessageCircle,
    Eye,
    Search,
    Filter,
    Calendar,
    DollarSign,
    User,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Send,
    FileSpreadsheet,
    FileCheck,
    HelpCircle,
    Check,
    X,
    Trash2,
    Calculator
} from 'lucide-react'

// Status labels and styling
const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
    NO_STATEMENT: {
        label: 'Sem Demonstrativo',
        color: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800',
        bg: 'bg-slate-100 dark:bg-slate-800/60'
    },
    PENDING_INVOICE: {
        label: 'Aguardando Nota Fiscal',
        color: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/40',
        bg: 'bg-amber-50 dark:bg-amber-950/30'
    },
    INVOICE_SENT: {
        label: 'NF Enviada (Conferir)',
        color: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/40',
        bg: 'bg-blue-50 dark:bg-blue-950/40'
    },
    INVOICE_APPROVED: {
        label: 'NF Aprovada',
        color: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/40',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    INVOICE_REJECTED: {
        label: 'Correção Solicitada',
        color: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800/40',
        bg: 'bg-rose-50 dark:bg-rose-950/40'
    },
    PAID: {
        label: 'Repasse Pago',
        color: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800/40',
        bg: 'bg-purple-50 dark:bg-purple-950/40'
    }
}

export default function CentralNotasEDemonstrativosPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // Competência selecionada (YYYY-MM)
    const today = new Date()
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')

    // Modais
    const [statementModalOpen, setStatementModalOpen] = useState(false)
    const [selectedDoctorForStatement, setSelectedDoctorForStatement] = useState<any>(null)
    const [statementFile, setStatementFile] = useState<File | null>(null)
    const [statementAmount, setStatementAmount] = useState<string>('')
    const [statementGrossAmount, setStatementGrossAmount] = useState<string>('')
    const [statementDeductions, setStatementDeductions] = useState<string>('')
    const [statementNotes, setStatementNotes] = useState<string>('')
    const [isSubmittingStatement, setIsSubmittingStatement] = useState(false)

    // Modal de Rejeição / Correção
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [selectedDocForReject, setSelectedDocForReject] = useState<any>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [isRejecting, setIsRejecting] = useState(false)

    // Modal de Baixa de Pagamento
    const [payModalOpen, setPayModalOpen] = useState(false)
    const [selectedDocForPay, setSelectedDocForPay] = useState<any>(null)
    const [isPaying, setIsPaying] = useState(false)

    // Modal de Detalhamento e Cálculo de Produção
    const [isCalculatingProduction, setIsCalculatingProduction] = useState(false)
    const [isExportingExcel, setIsExportingExcel] = useState(false)
    const [productionDetailOpen, setProductionDetailOpen] = useState(false)
    const [productionData, setProductionData] = useState<{ summary: any; items: any[] } | null>(null)
    const [selectedDoctorForProduction, setSelectedDoctorForProduction] = useState<any>(null)

    // Consulta documentos e profissionais do mês selecionado
    const { data: responseData, isLoading, refetch } = useQuery({
        queryKey: ['professional-financial-documents', selectedMonth],
        queryFn: async () => {
            const res = await fetch(`/api/financial/professional-documents?month_reference=${selectedMonth}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Erro ao carregar documentos')
            }
            return res.json()
        }
    })

    const documents = responseData?.documents || []
    const doctors = responseData?.doctors || []

    // Mapeamento consolidado: lista de profissionais com seus documentos do mês
    const consolidatedRoster = useMemo(() => {
        if (!doctors || doctors.length === 0) return []

        const docMap = new Map<string, any>()
        documents.forEach((doc: any) => {
            if (doc.doctor_id) docMap.set(doc.doctor_id, doc)
        })

        return doctors.map((doctor: any) => {
            const doc = docMap.get(doctor.id)
            return {
                doctor,
                docId: doc?.id || null,
                document: doc || null,
                status: doc?.status || 'NO_STATEMENT',
                statementAmount: doc?.statement_amount || 0,
                statementFileUrl: doc?.statement_file_url || null,
                statementFileName: doc?.statement_file_name || null,
                invoiceFileUrl: doc?.invoice_file_url || null,
                invoiceFileName: doc?.invoice_file_name || null,
                invoiceNumber: doc?.invoice_number || null,
                invoiceAmount: doc?.invoice_amount || 0,
                invoiceIssueDate: doc?.invoice_issue_date || null,
                rejectionReason: doc?.rejection_reason || null,
                paidAt: doc?.paid_at || null,
            }
        })
    }, [doctors, documents])

    // Filtros de busca e status
    const filteredRoster = useMemo(() => {
        return consolidatedRoster.filter(item => {
            const doctorName = (item.doctor?.user?.full_name || '').toLowerCase()
            const specialty = (item.doctor?.specialty || '').toLowerCase()
            const searchLower = search.toLowerCase().trim()

            const matchesSearch = !searchLower || doctorName.includes(searchLower) || specialty.includes(searchLower)
            const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [consolidatedRoster, search, statusFilter])

    // Métricas para os Cards de KPI
    const metrics = useMemo(() => {
        const totalDoctors = consolidatedRoster.length
        let withStatement = 0
        let waitingInvoice = 0
        let invoiceSent = 0
        let invoiceApproved = 0
        let paid = 0
        let totalAmountToPay = 0

        consolidatedRoster.forEach(item => {
            if (item.status !== 'NO_STATEMENT') withStatement++
            if (item.status === 'PENDING_INVOICE') waitingInvoice++
            if (item.status === 'INVOICE_SENT') invoiceSent++
            if (item.status === 'INVOICE_APPROVED') invoiceApproved++
            if (item.status === 'PAID') paid++
            totalAmountToPay += Number(item.statementAmount || 0)
        })

        return {
            totalDoctors,
            withStatement,
            waitingInvoice,
            invoiceSent,
            invoiceApproved,
            paid,
            totalAmountToPay
        }
    }, [consolidatedRoster])

    // Navegação de mês anterior e próximo
    const handlePrevMonth = () => {
        const [y, m] = selectedMonth.split('-').map(Number)
        const prevDate = new Date(y, m - 2, 1)
        const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
        setSelectedMonth(prevMonthStr)
    }

    const handleNextMonth = () => {
        const [y, m] = selectedMonth.split('-').map(Number)
        const nextDate = new Date(y, m, 1)
        const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
        setSelectedMonth(nextMonthStr)
    }

    // Abertura do modal para anexar demonstrativo
    const handleOpenStatementModal = (item: any) => {
        setSelectedDoctorForStatement(item)
        setStatementAmount(item.statementAmount ? String(item.statementAmount) : '')
        setStatementGrossAmount(item.document?.statement_gross_amount ? String(item.document.statement_gross_amount) : '')
        setStatementDeductions(item.document?.statement_deductions ? String(item.document.statement_deductions) : '')
        setStatementNotes(item.document?.statement_notes || '')
        setStatementFile(null)
        setProductionData(null)
        setStatementModalOpen(true)
    }

    // Buscar resumo de produção do profissional no mês
    const fetchProductionSummary = async (doctorId: string, month: string) => {
        const res = await fetch(`/api/financial/production-summary?doctor_id=${doctorId}&month_reference=${month}`)
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || 'Erro ao calcular produção do profissional')
        }
        return res.json()
    }

    // Calcular produção e preencher formulário do demonstrativo automaticamente
    const handleCalculateForStatement = async () => {
        if (!selectedDoctorForStatement?.doctor?.id) return
        setIsCalculatingProduction(true)
        try {
            const res = await fetchProductionSummary(selectedDoctorForStatement.doctor.id, selectedMonth)
            if (!res.success) throw new Error(res.error || 'Falha no cálculo')

            setProductionData(res)
            setStatementAmount(res.summary.total_net_repasse.toFixed(2))
            setStatementGrossAmount(res.summary.total_gross.toFixed(2))
            if (!statementNotes) {
                setStatementNotes(`Fechamento de ${res.summary.total_appointments} atendimentos no mês (${res.summary.unique_patients_count} pacientes atendidos).`)
            }
            toast({
                title: 'Produção calculada com sucesso!',
                description: `Total de ${res.summary.total_appointments} sessões apuradas. Repasse líquido: ${formatCurrency(res.summary.total_net_repasse)}.`
            })
        } catch (err: any) {
            toast({
                title: 'Erro no cálculo de produção',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsCalculatingProduction(false)
        }
    }

    // Ação rápida: visualizar detalhamento de produção na tabela
    const handleQuickViewProduction = async (item: any) => {
        setSelectedDoctorForProduction(item)
        setIsCalculatingProduction(true)
        setProductionDetailOpen(true)
        try {
            const res = await fetchProductionSummary(item.doctor.id, selectedMonth)
            if (!res.success) throw new Error(res.error || 'Falha ao buscar dados')
            setProductionData(res)
        } catch (err: any) {
            toast({
                title: 'Erro ao carregar produção',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsCalculatingProduction(false)
        }
    }

    // Exportar planilha Excel com produção e repasse detalhado
    const handleExportProductionExcel = async (targetData?: { summary: any; items: any[] } | null) => {
        const activeData = targetData || productionData
        if (!activeData || !activeData.summary) {
            toast({
                title: 'Sem dados para exportar',
                description: 'Nenhum cálculo de produção disponível no momento.',
                variant: 'destructive'
            })
            return
        }

        setIsExportingExcel(true)
        try {
            const ExcelJS = (await import('exceljs')).default
            const wb = new ExcelJS.Workbook()
            wb.creator = 'CliniGo'
            wb.created = new Date()

            const ws = wb.addWorksheet('Demonstrativo de Produção')

            // Título do cabeçalho
            ws.mergeCells('A1:G1')
            const titleCell = ws.getCell('A1')
            titleCell.value = 'CLINIGO — DEMONSTRATIVO DE PRODUÇÃO E REPASSE TERAPÊUTICO'
            titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
            ws.getRow(1).height = 30

            // Informações do Profissional
            ws.getCell('A3').value = 'Profissional:'
            ws.getCell('B3').value = activeData.summary.doctor_name
            ws.getCell('A3').font = { bold: true }

            ws.getCell('D3').value = 'Competência:'
            ws.getCell('E3').value = activeData.summary.month_reference
            ws.getCell('D3').font = { bold: true }

            ws.getCell('A4').value = 'Especialidade:'
            ws.getCell('B4').value = activeData.summary.specialty || 'Não informada'
            ws.getCell('A4').font = { bold: true }

            ws.getCell('D4').value = 'Data de Emissão:'
            ws.getCell('E4').value = new Date().toLocaleDateString('pt-BR')
            ws.getCell('D4').font = { bold: true }

            // Bloco de Totais
            ws.mergeCells('A6:B6')
            ws.getCell('A6').value = 'RESUMO CONSOLIDADO DO MÊS'
            ws.getCell('A6').font = { bold: true, color: { argb: 'FF1E293B' } }

            ws.getCell('A7').value = 'Total de Atendimentos:'
            ws.getCell('B7').value = activeData.summary.total_appointments
            ws.getCell('A8').value = 'Pacientes Únicos Atendidos:'
            ws.getCell('B8').value = activeData.summary.unique_patients_count
            ws.getCell('A9').value = 'Produção Bruta Total (R$):'
            ws.getCell('B9').value = activeData.summary.total_gross
            ws.getCell('B9').numFmt = 'R$ #,##0.00'
            ws.getCell('A10').value = 'Total Líquido a Repassar (R$):'
            ws.getCell('B10').value = activeData.summary.total_net_repasse
            ws.getCell('B10').numFmt = 'R$ #,##0.00'
            ws.getCell('B10').font = { bold: true, color: { argb: 'FF15803D' } }

            // Cabeçalho da Tabela Detalhada
            const startTableRow = 12
            const tableHeaders = [
                'Data',
                'Horário',
                'Paciente',
                'Procedimento / Terapia',
                'Produção Bruta (R$)',
                'Repasse Terapeuta (R$)',
                'Regra de Repasse Aplicada'
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

            // Inserir linhas de atendimentos
            activeData.items.forEach((item, index) => {
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

                // Linhas alternadas
                if (index % 2 === 1) {
                    for (let c = 1; c <= 7; c++) {
                        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
                    }
                }
            })

            // Largura das colunas
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
            const sanitizedDocName = (activeData.summary.doctor_name || 'Profissional').replace(/\s+/g, '_')
            link.href = url
            link.download = `Demonstrativo_Producao_${sanitizedDocName}_${activeData.summary.month_reference}.xlsx`
            link.click()
            window.URL.revokeObjectURL(url)

            toast({
                title: 'Planilha exportada com sucesso!',
                description: `Arquivo Excel gerado para ${activeData.summary.doctor_name}.`
            })
        } catch (err: any) {
            toast({
                title: 'Erro ao exportar Excel',
                description: err.message || 'Falha ao gerar planilha.',
                variant: 'destructive'
            })
        } finally {
            setIsExportingExcel(false)
        }
    }

    // Salvar demonstrativo financeiro
    const handleSaveStatement = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDoctorForStatement) return

        setIsSubmittingStatement(true)
        try {
            const formData = new FormData()
            formData.append('action', 'UPLOAD_STATEMENT')
            formData.append('doctor_id', selectedDoctorForStatement.doctor.id)
            formData.append('month_reference', selectedMonth)
            formData.append('statement_amount', statementAmount || '0')
            formData.append('statement_gross_amount', statementGrossAmount || '0')
            formData.append('statement_deductions', statementDeductions || '0')
            formData.append('statement_notes', statementNotes || '')
            if (statementFile) {
                formData.append('file', statementFile)
            }

            const res = await fetch('/api/financial/professional-documents', {
                method: 'POST',
                body: formData
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao anexar demonstrativo')

            toast({
                title: 'Demonstrativo anexado!',
                description: `O demonstrativo de ${selectedDoctorForStatement.doctor?.user?.full_name} foi disponibilizado.`
            })

            queryClient.invalidateQueries({ queryKey: ['professional-financial-documents', selectedMonth] })
            setStatementModalOpen(false)
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message || 'Falha ao salvar demonstrativo.',
                variant: 'destructive'
            })
        } finally {
            setIsSubmittingStatement(false)
        }
    }

    // Aprovar Nota Fiscal
    const handleApproveInvoice = async (docId: string, doctorName: string) => {
        try {
            const res = await fetch(`/api/financial/professional-documents/${docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'APPROVE' })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao aprovar')

            toast({
                title: 'Nota Fiscal Aprovada!',
                description: `A nota fiscal de ${doctorName} foi aprovada para pagamento.`
            })
            queryClient.invalidateQueries({ queryKey: ['professional-financial-documents', selectedMonth] })
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message,
                variant: 'destructive'
            })
        }
    }

    // Solicitar Correção / Rejeitar NF
    const handleConfirmReject = async () => {
        if (!selectedDocForReject || !rejectionReason.trim()) return

        setIsRejecting(true)
        try {
            const res = await fetch(`/api/financial/professional-documents/${selectedDocForReject.docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'REJECT',
                    rejection_reason: rejectionReason.trim()
                })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao solicitar correção')

            toast({
                title: 'Correção solicitada!',
                description: 'O status foi atualizado e o profissional poderá reenviar a nota corrigida.'
            })
            queryClient.invalidateQueries({ queryKey: ['professional-financial-documents', selectedMonth] })
            setRejectModalOpen(false)
            setRejectionReason('')
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsRejecting(false)
        }
    }

    // Confirmar Baixa / Pagamento
    const handleConfirmPay = async () => {
        if (!selectedDocForPay) return

        setIsPaying(true)
        try {
            const res = await fetch(`/api/financial/professional-documents/${selectedDocForPay.docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'MARK_PAID' })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao marcar como pago')

            toast({
                title: 'Repasse Liquidado!',
                description: `O repasse de ${selectedDocForPay.doctor?.user?.full_name} foi marcado como pago.`
            })
            queryClient.invalidateQueries({ queryKey: ['professional-financial-documents', selectedMonth] })
            setPayModalOpen(false)
        } catch (err: any) {
            toast({
                title: 'Erro',
                description: err.message,
                variant: 'destructive'
            })
        } finally {
            setIsPaying(false)
        }
    }

    // Disparar WhatsApp para o profissional
    const handleSendWhatsApp = (item: any) => {
        const phone = item.doctor?.user?.phone || ''
        if (!phone) {
            toast({
                title: 'Telefone não cadastrado',
                description: 'Este profissional não possui telefone no cadastro.',
                variant: 'destructive'
            })
            return
        }

        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const firstName = (item.doctor?.user?.full_name || 'Profissional').split(' ')[0]
        
        let message = ''
        if (item.status === 'NO_STATEMENT') {
            message = `Olá ${firstName}! Seu repasse de ${selectedMonth} está em processamento pela administração da clínica.`
        } else if (item.status === 'PENDING_INVOICE') {
            message = `Olá ${firstName}! Seu demonstrativo financeiro de repasse referente a ${selectedMonth} já está disponível no Clinigo (Valor: ${formatCurrency(item.statementAmount)}). Por favor, acesse seu painel e anexe sua Nota Fiscal para liberação do pagamento!`
        } else if (item.status === 'INVOICE_REJECTED') {
            message = `Olá ${firstName}! Identificamos uma necessidade de correção na sua Nota Fiscal referente a ${selectedMonth}: "${item.rejectionReason}". Por favor, verifique no painel do Clinigo e reenvie a nota corrigida.`
        } else if (item.status === 'PAID') {
            message = `Olá ${firstName}! Seu repasse de ${selectedMonth} foi pago com sucesso pela clínica. Obrigado pela dedicação!`
        } else {
            message = `Olá ${firstName}! Estamos em contato sobre o repasse do mês ${selectedMonth}.`
        }

        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 py-3">
            {/* Header Corporativo */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                            Central de Notas Fiscais e Demonstrativos
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gestão de demonstrativos de repasse enviados pela clínica e conferência de notas fiscais dos terapeutas
                        </p>
                    </div>
                </div>

                {/* Seletor de Competência com Botões Mês Anterior / Próximo */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevMonth}
                        className="h-8 w-8 rounded-lg min-w-[36px]"
                        title="Mês anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1.5 px-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextMonth}
                        className="h-8 w-8 rounded-lg min-w-[36px]"
                        title="Próximo mês"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profissionais</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{metrics.totalDoctors}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{metrics.withStatement} c/ demonstrativo</p>
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-lg">
                            <User className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando NF</p>
                            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{metrics.waitingInvoice}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Terapeutas a enviar</p>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NF Enviadas</p>
                            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{metrics.invoiceSent}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Prontas p/ conferir</p>
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-lg">
                            <FileCheck className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NF Aprovadas</p>
                            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.invoiceApproved}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Autorizadas p/ pagar</p>
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs col-span-2 lg:col-span-1">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Repasses</p>
                            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{formatCurrency(metrics.totalAmountToPay)}</p>
                            <p className="text-[11px] text-purple-600 font-semibold mt-0.5">{metrics.paid} repasses pagos</p>
                        </div>
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-lg">
                            <CreditCard className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-white dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por profissional ou especialidade..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-9 h-10 text-xs rounded-lg bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filtro de Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[34px]",
                            statusFilter === 'ALL'
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Todos ({consolidatedRoster.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('INVOICE_SENT')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[34px] flex items-center gap-1.5",
                            statusFilter === 'INVOICE_SENT'
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        NF p/ Conferir ({metrics.invoiceSent})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('PENDING_INVOICE')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[34px]",
                            statusFilter === 'PENDING_INVOICE'
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Aguardando NF ({metrics.waitingInvoice})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('INVOICE_APPROVED')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[34px]",
                            statusFilter === 'INVOICE_APPROVED'
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Aprovadas ({metrics.invoiceApproved})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('PAID')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[34px]",
                            statusFilter === 'PAID'
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Pagos ({metrics.paid})
                    </button>
                </div>
            </div>

            {/* Tabela dos Profissionais */}
            <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-xs">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : filteredRoster.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
                                    <TableRow className="border-none">
                                        <TableHead className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Profissional</TableHead>
                                        <TableHead className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Demonstrativo da Clínica</TableHead>
                                        <TableHead className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nota Fiscal do Terapeuta</TableHead>
                                        <TableHead className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</TableHead>
                                        <TableHead className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-slate-850">
                                    {filteredRoster.map((item) => {
                                        const doctorName = item.doctor?.user?.full_name || 'Profissional'
                                        const specialty = item.doctor?.specialty || 'Terapeuta'
                                        const initials = doctorName.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                                        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.NO_STATEMENT

                                        return (
                                            <TableRow key={item.doctor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                {/* Coluna 1: Profissional */}
                                                <TableCell className="py-3 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                                                                {doctorName}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {specialty} {item.doctor?.crm && `• ${item.doctor.crm}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Coluna 2: Demonstrativo da Clínica */}
                                                <TableCell className="py-3 px-5">
                                                    {item.status !== 'NO_STATEMENT' ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                <span>{formatCurrency(item.statementAmount)}</span>
                                                            </div>
                                                            {item.statementFileUrl ? (
                                                                <a
                                                                    href={item.statementFileUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                                                                    title="Baixar demonstrativo anexado"
                                                                >
                                                                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="truncate max-w-[140px]">{item.statementFileName || 'Demonstrativo'}</span>
                                                                    <Download className="w-3 h-3 shrink-0" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">Sem arquivo anexado</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400 italic">Não disponibilizado</span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleOpenStatementModal(item)}
                                                                className="h-7 px-2 text-[11px] border-dashed border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                                            >
                                                                <Upload className="w-3 h-3 mr-1" />
                                                                Anexar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Coluna 3: Nota Fiscal do Terapeuta */}
                                                <TableCell className="py-3 px-5">
                                                    {item.invoiceFileUrl || item.invoiceNumber ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-100">
                                                                <Receipt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                <span>NF nº {item.invoiceNumber || 'S/N'}</span>
                                                                <span className="text-slate-400">({formatCurrency(item.invoiceAmount)})</span>
                                                            </div>
                                                            {item.invoiceFileUrl && (
                                                                <a
                                                                    href={item.invoiceFileUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                                                                    title="Visualizar arquivo da Nota Fiscal"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="truncate max-w-[140px]">{item.invoiceFileName || 'Arquivo da NF'}</span>
                                                                    <Eye className="w-3 h-3 shrink-0" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Aguardando terapeuta</span>
                                                    )}
                                                </TableCell>

                                                {/* Coluna 4: Status do Repasse */}
                                                <TableCell className="py-3 px-5 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
                                                            statusCfg.bg,
                                                            statusCfg.color,
                                                            statusCfg.border
                                                        )}>
                                                            {item.status === 'PAID' && <Check className="w-3 h-3" />}
                                                            {item.status === 'INVOICE_SENT' && <Clock className="w-3 h-3 animate-pulse" />}
                                                            {statusCfg.label}
                                                        </span>
                                                        {item.rejectionReason && (
                                                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium max-w-[160px] truncate" title={item.rejectionReason}>
                                                                Motivo: {item.rejectionReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Coluna 5: Ações */}
                                                <TableCell className="py-3 px-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                        {/* Botão de Produção Rápida */}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleQuickViewProduction(item)}
                                                            className="h-8 px-2.5 text-xs font-medium border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-700 hover:border-emerald-300"
                                                            title="Conferir produção e repasse detalhado do mês"
                                                        >
                                                            <Calculator className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                            Produção
                                                        </Button>

                                                        {/* Botão de Demonstrativo (Criar / Editar) */}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenStatementModal(item)}
                                                            className="h-8 px-2.5 text-xs font-medium border-slate-200 dark:border-slate-800"
                                                            title="Anexar ou editar demonstrativo financeiro"
                                                        >
                                                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                            {item.status === 'NO_STATEMENT' ? 'Anexar' : 'Editar'}
                                                        </Button>

                                                        {/* Ações quando NF foi enviada */}
                                                        {item.status === 'INVOICE_SENT' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleApproveInvoice(item.docId, doctorName)}
                                                                    className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                    title="Aprovar Nota Fiscal"
                                                                >
                                                                    <Check className="w-3.5 h-3.5 mr-1" />
                                                                    Aprovar
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedDocForReject(item)
                                                                        setRejectModalOpen(true)
                                                                    }}
                                                                    className="h-8 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                                                    title="Solicitar correção de NF"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {/* Ação de Confirmar Pagamento (Baixa) */}
                                                        {item.status === 'INVOICE_APPROVED' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedDocForPay(item)
                                                                    setPayModalOpen(true)
                                                                }}
                                                                className="h-8 px-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                                                                title="Confirmar pagamento / dar baixa no repasse"
                                                            >
                                                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                                                Dar Baixa
                                                            </Button>
                                                        )}

                                                        {/* WhatsApp Lembrete Direto */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSendWhatsApp(item)}
                                                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg min-w-[36px]"
                                                            title="Enviar mensagem ou lembrete via WhatsApp"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                <Receipt className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum profissional encontrado</h3>
                            <p className="text-xs text-slate-500 mt-1">Verifique os filtros selecionados ou selecione outra competência.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Anexar Demonstrativo Financeiro */}
            <Dialog open={statementModalOpen} onOpenChange={setStatementModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                            Demonstrativo Financeiro — {selectedDoctorForStatement?.doctor?.user?.full_name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Competência: <strong className="text-slate-800 dark:text-slate-200">{selectedMonth}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveStatement} className="space-y-4 py-2">
                        {/* Bloco de Cálculo Automático por Produção */}
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cálculo Automático por Produção</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCalculateForStatement}
                                    disabled={isCalculatingProduction}
                                    className="h-7 px-2.5 text-[11px] font-semibold bg-white dark:bg-slate-800 border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                                >
                                    {isCalculatingProduction ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Calculando...
                                        </>
                                    ) : (
                                        <>
                                            <Calculator className="w-3 h-3 mr-1" />
                                            Puxar Produção do Mês
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Cruza os atendimentos do mês com as taxas cadastradas por paciente (ou contrato padrão do profissional) e preenche os valores abaixo.
                            </p>
                            {productionData && productionData.summary && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                                    <div className="space-x-1.5">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{productionData.summary.total_appointments} sessões</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-semibold text-emerald-600">Líquido: {formatCurrency(productionData.summary.total_net_repasse)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setProductionDetailOpen(true)}
                                            className="h-6 px-2 text-[10px] font-semibold text-blue-600 hover:underline"
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            Ver sessões
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleExportProductionExcel(productionData)}
                                            disabled={isExportingExcel}
                                            className="h-6 px-2 text-[10px] font-semibold text-emerald-600 hover:underline"
                                        >
                                            <Download className="w-3 h-3 mr-1" />
                                            Excel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label className="text-xs font-semibold">Valor Líquido a Repassar (R$) *</Label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={statementAmount}
                                    onChange={(e) => setStatementAmount(e.target.value)}
                                    required
                                    className="pl-9 h-10 text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Produção Bruta (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={statementGrossAmount}
                                    onChange={(e) => setStatementGrossAmount(e.target.value)}
                                    className="h-9 text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Deduções / Glosas (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={statementDeductions}
                                    onChange={(e) => setStatementDeductions(e.target.value)}
                                    className="h-9 text-xs mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Arquivo do Demonstrativo (PDF, Excel, Imagem)</Label>
                            <div className="mt-1 flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                                    onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
                                    className="h-10 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700"
                                />
                            </div>
                            {selectedDoctorForStatement?.statementFileName && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Arquivo atual: <strong className="text-slate-700 dark:text-slate-300">{selectedDoctorForStatement.statementFileName}</strong>
                                </p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs">Observações para o Terapeuta</Label>
                            <Input
                                placeholder="Ex: Fechamento referente a 32 sessões e 2 faltas justificadas..."
                                value={statementNotes}
                                onChange={(e) => setStatementNotes(e.target.value)}
                                className="h-9 text-xs mt-1"
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStatementModalOpen(false)}
                                disabled={isSubmittingStatement}
                                className="h-9 text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingStatement}
                                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isSubmittingStatement ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Disponibilizar Demonstrativo'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Solicitação de Correção (Rejeitar NF) */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
                            <AlertTriangle className="w-5 h-5" />
                            Solicitar Correção de Nota Fiscal
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Profissional: <strong className="text-slate-800 dark:text-slate-200">{selectedDocForReject?.doctor?.user?.full_name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Informe o motivo da solicitação de correção. O profissional poderá visualizar esta mensagem no painel dele e reenviar a nota corrigida.
                        </p>
                        <div>
                            <Label className="text-xs font-semibold">Motivo da Correção *</Label>
                            <textarea
                                rows={3}
                                placeholder="Ex: Valor da nota difere do valor líquido do demonstrativo. Favor emitir com o valor de R$ X..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full mt-1 p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 outline-none focus:border-rose-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRejectModalOpen(false)}
                            disabled={isRejecting}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmReject}
                            disabled={isRejecting || !rejectionReason.trim()}
                            className="h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isRejecting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                            Solicitar Correção
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Baixa de Pagamento */}
            <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-purple-700">
                            <CreditCard className="w-5 h-5" />
                            Confirmar Baixa do Repasse
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Confirmar que o pagamento deste repasse foi liquidado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Profissional:</span>
                            <span className="font-bold">{selectedDocForPay?.doctor?.user?.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Valor do Repasse:</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(selectedDocForPay?.statementAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Nota Fiscal:</span>
                            <span className="font-mono">nº {selectedDocForPay?.invoiceNumber || 'Anexada'}</span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setPayModalOpen(false)}
                            disabled={isPaying}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmPay}
                            disabled={isPaying}
                            className="h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isPaying ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                            Confirmar Pagamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhamento Completo da Produção */}
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
                                        Produção e Repasse — {productionData?.summary?.doctor_name || selectedDoctorForProduction?.doctor?.user?.full_name || 'Profissional'}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-0.5">
                                        Competência: <strong className="text-slate-800 dark:text-slate-200">{selectedMonth}</strong> • Especialidade: {productionData?.summary?.specialty || selectedDoctorForProduction?.doctor?.specialty || 'Terapeuta'}
                                    </DialogDescription>
                                </div>
                            </div>
                            {productionData?.summary && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExportProductionExcel(productionData)}
                                    disabled={isExportingExcel}
                                    className="h-8 px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 shrink-0"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    {isExportingExcel ? 'Gerando...' : 'Exportar Excel'}
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {isCalculatingProduction ? (
                            <div className="p-12 text-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                                <p className="text-xs text-slate-500 font-medium">Calculando produção e cruzando taxas do mês...</p>
                            </div>
                        ) : !productionData ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                                Nenhum dado carregado para esta competência.
                            </div>
                        ) : (
                            <>
                                {/* Cards de KPI do Mês */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atendimentos</p>
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
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produção Bruta</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                                            {formatCurrency(productionData.summary.total_gross)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Repasse Líquido</p>
                                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                                            {formatCurrency(productionData.summary.total_net_repasse)}
                                        </p>
                                    </div>
                                </div>

                                {/* Tabela detalhada de atendimentos */}
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[380px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10">
                                                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Data / Hora</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Paciente</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Procedimento</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3 text-right">Valor Bruto</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3 text-right">Repasse Terapeuta</TableHead>
                                                    <TableHead className="text-[11px] font-bold py-2.5 px-3">Regra Aplicada</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productionData.items.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400 italic">
                                                            Nenhum atendimento realizado encontrado para este profissional na competência {selectedMonth}.
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
                                                                <TableCell className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                                    {formatCurrency(it.gross_amount)}
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

                    <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shrink-0 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setProductionDetailOpen(false)}
                            className="h-9 text-xs"
                        >
                            Fechar
                        </Button>
                        {productionData?.summary && selectedDoctorForStatement && statementModalOpen && (
                            <Button
                                onClick={() => {
                                    setStatementAmount(productionData.summary.total_net_repasse.toFixed(2))
                                    setStatementGrossAmount(productionData.summary.total_gross.toFixed(2))
                                    setProductionDetailOpen(false)
                                }}
                                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Aplicar no Demonstrativo
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
