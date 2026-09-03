'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {
    FileText, AlertTriangle, CheckCircle, XCircle, Download, FileSpreadsheet,
    ChevronDown, ChevronUp, TrendingDown, TrendingUp, Activity, Copy, Trash2, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface DailyData {
    date: string
    attended: number
    evolutions: number
    diff: number
}

interface DoctorData {
    doctor_id: string
    doctor_name: string
    total_attended: number
    total_evolutions: number
    with_evolution: number
    without_evolution: number
    compliance_rate: number
    days_with_pending: number
    total_days: number
    daily: DailyData[]
}

interface DuplicateData {
    doctor_id: string
    patient_id: string
    patient_name: string
    date: string
    count: number
    evolution_ids: string[]
}

interface ReportData {
    summary: {
        total_attended: number
        total_evolutions: number
        with_evolution: number
        without_evolution: number
        compliance_rate: number
        total_duplicates: number
    }
    by_doctor: DoctorData[]
    duplicates: DuplicateData[]
    period: { start_date: string; end_date: string }
}

function getStatusBadge(rate: number) {
    if (rate === 0) return <Badge className="bg-red-600 text-white border-0 text-xs font-bold px-2.5 py-0.5">CRÍTICO</Badge>
    if (rate < 50) return <Badge className="bg-red-500 text-white border-0 text-xs font-bold px-2.5 py-0.5">BAIXO</Badge>
    if (rate < 80) return <Badge className="bg-amber-500 text-white border-0 text-xs font-bold px-2.5 py-0.5">ATENÇÃO</Badge>
    if (rate < 100) return <Badge className="bg-blue-500 text-white border-0 text-xs font-bold px-2.5 py-0.5">BOM</Badge>
    return <Badge className="bg-emerald-600 text-white border-0 text-xs font-bold px-2.5 py-0.5">EXCELENTE</Badge>
}

function getBarColor(rate: number) {
    if (rate === 0) return 'bg-red-600'
    if (rate < 50) return 'bg-red-500'
    if (rate < 80) return 'bg-amber-500'
    if (rate < 100) return 'bg-blue-500'
    return 'bg-emerald-600'
}

function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}`
}

export default function ConformidadeEvolucaoPage() {
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null)
    const [cleaningDuplicates, setCleaningDuplicates] = useState(false)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/evolution-compliance?start_date=${startDate}&end_date=${endDate}`)
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [startDate, endDate])

    useEffect(() => { fetchData() }, [fetchData])

    const toggleDoctor = (id: string) => {
        setExpandedDoctor(prev => prev === id ? null : id)
    }

    const handleCleanDuplicates = async () => {
        setCleaningDuplicates(true)
        try {
            const res = await fetch('/api/session-evolutions/duplicates', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auto_clean: true }),
            })
            const result = await res.json()
            if (res.ok) {
                toast.success(result.message || `${result.deleted} duplicata(s) removida(s)`)
                fetchData() // Recarregar dados
            } else {
                toast.error(result.error || 'Erro ao limpar duplicatas')
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao limpar duplicatas')
        } finally {
            setCleaningDuplicates(false)
        }
    }

    const handleRemoveSpecific = async (ids: string[], patientName: string) => {
        try {
            const res = await fetch('/api/session-evolutions/duplicates', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evolution_ids: ids }),
            })
            const result = await res.json()
            if (res.ok) {
                toast.success(`Duplicata(s) de ${patientName} removida(s)!`)
                fetchData()
            } else {
                toast.error(result.error || 'Erro ao remover duplicata')
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao remover duplicata')
        }
    }

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook()

        // Aba resumo
        const ws = wb.addWorksheet('Conformidade Evoluções')
        ws.columns = [
            { header: 'Terapeuta', key: 'doctor_name', width: 35 },
            { header: 'Atendidos', key: 'total_attended', width: 12 },
            { header: 'Evoluções', key: 'total_evolutions', width: 12 },
            { header: 'Conformidade %', key: 'compliance_rate', width: 15 },
            { header: 'Dias com Pendência', key: 'days_with_pending', width: 18 },
        ]
        data.by_doctor.forEach(r => ws.addRow(r))

        // Aba detalhamento diário
        const ws2 = wb.addWorksheet('Detalhamento Diário')
        ws2.columns = [
            { header: 'Terapeuta', key: 'doctor_name', width: 35 },
            { header: 'Data', key: 'date', width: 12 },
            { header: 'Atendidos', key: 'attended', width: 12 },
            { header: 'Evoluções', key: 'evolutions', width: 12 },
            { header: 'Diferença', key: 'diff', width: 12 },
        ]
        data.by_doctor.forEach(doc => {
            doc.daily.forEach(d => {
                ws2.addRow({
                    doctor_name: doc.doctor_name,
                    date: d.date,
                    attended: d.attended,
                    evolutions: d.evolutions,
                    diff: d.diff,
                })
            })
        })

        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conformidade_evolucoes_${startDate}_${endDate}.xlsx`
        a.click()
    }

    const exportPDF = async () => {
        if (!data) return
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Conformidade de Evoluções', 14, 20)
        doc.setFontSize(10)
        doc.text(`Período: ${startDate} a ${endDate}`, 14, 28)

        autoTable(doc, {
            startY: 35,
            head: [['Terapeuta', 'Atendidos', 'Evoluções', 'Conformidade %', 'Dias Pendentes']],
            body: data.by_doctor.map(r => [
                r.doctor_name,
                r.total_attended,
                r.total_evolutions,
                `${r.compliance_rate}%`,
                r.days_with_pending,
            ]),
        })

        doc.save(`conformidade_evolucoes_${startDate}_${endDate}.pdf`)
    }

    const s = data?.summary

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                        Conformidade de Evoluções
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Agendamentos atendidos × evoluções registradas por terapeuta
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                        style={{ fontSize: '16px' }}
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                        style={{ fontSize: '16px' }}
                    />
                    <Button
                        variant="outline"
                        onClick={exportExcel}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xs px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={exportPDF}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xs px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <Download className="w-4 h-4 text-blue-600" />
                        <span>PDF</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold">Atendidos</CardDescription>
                                <CardTitle className="text-xl sm:text-2xl">{s?.total_attended || 0}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Activity className="h-4 w-4 text-slate-400" />
                            </CardContent>
                        </Card>
                        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold">Evoluções</CardDescription>
                                <CardTitle className="text-xl sm:text-2xl text-blue-600">{s?.total_evolutions || 0}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FileText className="h-4 w-4 text-blue-600" />
                            </CardContent>
                        </Card>
                        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold">Sem Evolução</CardDescription>
                                <CardTitle className="text-xl sm:text-2xl text-red-600">{(s?.total_attended || 0) - (s?.total_evolutions || 0) > 0 ? (s?.total_attended || 0) - (s?.total_evolutions || 0) : 0}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <XCircle className="h-4 w-4 text-red-600" />
                            </CardContent>
                        </Card>
                        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold">Conformidade</CardDescription>
                                <CardTitle className={`text-xl sm:text-2xl ${(s?.compliance_rate || 0) >= 80 ? 'text-emerald-600' : (s?.compliance_rate || 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {Math.min(s?.compliance_rate || 0, 100)}%
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CheckCircle className={`h-4 w-4 ${(s?.compliance_rate || 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alerta de Duplicatas */}
                    {data?.duplicates && data.duplicates.length > 0 && (
                        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                            <Copy className="w-5 h-5" />
                                            Possíveis Evoluções Duplicadas ({data.duplicates.length})
                                        </CardTitle>
                                        <CardDescription className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                            Mesma terapeuta + mesmo paciente + mesma data com mais de uma evolução registrada
                                        </CardDescription>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xs h-9 px-4 text-xs font-bold shadow-sm gap-1.5"
                                                disabled={cleaningDuplicates}
                                            >
                                                {cleaningDuplicates ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                Limpar Todas as Duplicatas
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Limpar Evoluções Duplicadas?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta ação irá remover automaticamente as evoluções duplicadas, <strong>mantendo a mais antiga</strong> de cada grupo (mesmo paciente + terapeuta + data).
                                                    <br /><br />
                                                    Serão removidas aproximadamente <strong>{data.duplicates.reduce((sum: number, d: DuplicateData) => sum + (d.count - 1), 0)}</strong> evolução(ões) duplicada(s).
                                                    <br /><br />
                                                    <strong className="text-red-600">⚠️ Esta ação não pode ser desfeita.</strong>
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleCleanDuplicates}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                                >
                                                    Confirmar Limpeza
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs sm:text-sm">
                                        <thead>
                                            <tr className="text-muted-foreground font-bold text-[10px] sm:text-xs border-b border-amber-200 dark:border-amber-800">
                                                <th className="text-left pb-2 pr-3">Paciente</th>
                                                <th className="text-left pb-2 px-2">Data</th>
                                                <th className="text-center pb-2 px-2">Evoluções</th>
                                                <th className="text-center pb-2 pl-2">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.duplicates.map((dup: DuplicateData, idx: number) => {
                                                const docData = data.by_doctor.find((d: DoctorData) => d.doctor_id === dup.doctor_id)
                                                // IDs para remover: todos exceto o primeiro (mais antigo)
                                                const idsToRemove = dup.evolution_ids.slice(1)
                                                return (
                                                    <tr key={idx} className="border-t border-amber-100 dark:border-amber-900/50">
                                                        <td className="py-2 pr-3">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">{dup.patient_name}</div>
                                                            <div className="text-[10px] text-amber-600 dark:text-amber-400">Terapeuta: {docData?.doctor_name || 'N/A'}</div>
                                                        </td>
                                                        <td className="py-2 px-2 font-semibold">{dup.date.split('-').reverse().join('/')}</td>
                                                        <td className="py-2 px-2 text-center">
                                                            <span className="bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 px-2 py-0.5 rounded-full text-xs font-bold">
                                                                {dup.count}x
                                                            </span>
                                                        </td>
                                                        <td className="py-2 pl-2 text-center">
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                        Remover
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Remover duplicata?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Remover {dup.count - 1} evolução(ões) duplicada(s) de <strong>{dup.patient_name}</strong> em {dup.date.split('-').reverse().join('/')}?
                                                                            A evolução mais antiga será mantida.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleRemoveSpecific(idsToRemove, dup.patient_name)}
                                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                                        >
                                                                            Confirmar Exclusão
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Doctors Table */}
                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Por Terapeuta
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Clique em um terapeuta para ver o detalhamento diário
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data?.by_doctor?.map((doc) => (
                                    <div key={doc.doctor_id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-200">
                                        {/* Row principal */}
                                        <button
                                            type="button"
                                            onClick={() => toggleDoctor(doc.doctor_id)}
                                            className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 active:bg-slate-100 dark:active:bg-slate-800/60 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getBarColor(doc.compliance_rate)}`} />
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {doc.doctor_name}
                                                </span>
                                                {getStatusBadge(doc.compliance_rate)}
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm pl-5 sm:pl-0">
                                                <div className="flex flex-col items-center min-w-[3.5rem]">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{doc.total_attended}</span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">Atendidos</span>
                                                </div>
                                                <div className="flex flex-col items-center min-w-[3.5rem]">
                                                    <span className="font-bold text-blue-600">{doc.total_evolutions}</span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">Evoluções</span>
                                                </div>
                                                <div className="flex flex-col items-center min-w-[3.5rem]">
                                                    <span className={`font-bold ${doc.compliance_rate >= 80 ? 'text-emerald-600' : doc.compliance_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {Math.min(doc.compliance_rate, 100)}%
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">Conform.</span>
                                                </div>
                                                <div className="flex items-center min-w-[2rem]">
                                                    {expandedDoctor === doc.doctor_id
                                                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                </div>
                                            </div>

                                            {/* Barra de progresso */}
                                            <div className="w-full sm:w-32 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden sm:mx-2">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(doc.compliance_rate)}`}
                                                    style={{ width: `${Math.min(doc.compliance_rate, 100)}%` }}
                                                />
                                            </div>
                                        </button>

                                        {/* Detalhamento diário expandível */}
                                        {expandedDoctor === doc.doctor_id && (
                                            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-3 sm:p-4 overflow-x-auto">
                                                <table className="w-full min-w-[20rem] text-xs sm:text-sm">
                                                    <thead>
                                                        <tr className="text-muted-foreground font-bold text-[10px] sm:text-xs">
                                                            <th className="text-left pb-2 pr-3">Data</th>
                                                            <th className="text-center pb-2 px-2">Atendidos</th>
                                                            <th className="text-center pb-2 px-2">Evoluções</th>
                                                            <th className="text-center pb-2 pl-2">Diferença</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {doc.daily.map((d) => (
                                                            <tr
                                                                key={d.date}
                                                                className={`border-t border-slate-100 dark:border-slate-800/50 ${
                                                                    d.diff > 0
                                                                        ? 'bg-red-50/60 dark:bg-red-950/10'
                                                                        : d.diff < 0
                                                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/10'
                                                                            : ''
                                                                }`}
                                                            >
                                                                <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">{formatDate(d.date)}</td>
                                                                <td className="py-2 px-2 text-center font-bold">{d.attended}</td>
                                                                <td className="py-2 px-2 text-center font-bold text-blue-600">{d.evolutions}</td>
                                                                <td className="py-2 pl-2 text-center">
                                                                    {d.diff > 0 ? (
                                                                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                                                            <TrendingDown className="w-3.5 h-3.5" />
                                                                            -{d.diff}
                                                                        </span>
                                                                    ) : d.diff < 0 ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                                                            <TrendingUp className="w-3.5 h-3.5" />
                                                                            +{Math.abs(d.diff)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400 font-bold">0</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {doc.days_with_pending > 0 && (
                                                    <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        {doc.days_with_pending} dia{doc.days_with_pending > 1 ? 's' : ''} com mais atendimentos do que evoluções
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!data?.by_doctor || data.by_doctor.length === 0) && (
                                    <p className="text-muted-foreground text-center py-8 text-sm">Nenhum dado encontrado para o período selecionado</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
