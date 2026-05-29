'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Download, FileSpreadsheet } from 'lucide-react'

export default function ReceitaModalidadePage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().split('T')[0] })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try { const res = await fetch(`/api/reports/modality-revenue?start_date=${startDate}&end_date=${endDate}`); if (res.ok) setData(await res.json()) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [startDate, endDate])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Receita Modalidade')
        ws.columns = [{ header: 'Modalidade', key: 'modality', width: 20 }, { header: 'Sessões', key: 'sessions', width: 10 }, { header: 'Receita', key: 'revenue', width: 15 }, { header: 'Ticket Médio', key: 'avg_ticket', width: 15 }, { header: '%', key: 'percentage', width: 8 }]
        data.by_modality?.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `receita_modalidade_${startDate}_${endDate}.xlsx`; a.click()
    }

    const s = data?.summary
    const modColors: Record<string, string> = { individual: 'bg-blue-500', casal: 'bg-pink-500', familia: 'bg-green-500', grupo: 'bg-purple-500' }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Receita por Modalidade</h1><p className="text-muted-foreground">Faturamento por tipo de sessão e formato</p></div>
                <div className="flex gap-2 items-center">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                    />
                    <Button
                        variant="outline"
                        onClick={exportExcel}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Excel</span>
                    </Button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Total Sessões</CardDescription><CardTitle className="text-2xl">{s?.total_sessions || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Receita Total</CardDescription><CardTitle className="text-2xl text-green-600">R$ {(s?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader><CardContent><DollarSign className="h-4 w-4 text-green-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Ticket Médio</CardDescription><CardTitle className="text-2xl">R$ {(s?.avg_revenue_per_session || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</CardTitle></CardHeader></Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card><CardHeader><CardTitle>Por Modalidade</CardTitle></CardHeader><CardContent>
                            <div className="space-y-4">
                                {data?.by_modality?.map((m: any) => (
                                    <div key={m.modality} className="space-y-1">
                                        <div className="flex justify-between text-sm"><span className="font-medium capitalize">{m.modality}</span><span className="text-muted-foreground">{m.sessions} sessões · R$ {m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                        <div className="w-full bg-muted rounded-full h-5 overflow-hidden"><div className={`h-full rounded-full ${modColors[m.modality] || 'bg-gray-500'}`} style={{ width: `${m.percentage}%` }} /></div>
                                        <p className="text-xs text-muted-foreground">Ticket médio: R$ {m.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {m.percentage}% do total</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent></Card>
                        <Card><CardHeader><CardTitle>Por Formato</CardTitle></CardHeader><CardContent>
                            <div className="space-y-4">
                                {data?.by_format?.map((f: any) => (
                                    <div key={f.format} className="space-y-1">
                                        <div className="flex justify-between text-sm"><span className="font-medium capitalize">{f.format}</span><span className="text-muted-foreground">{f.sessions} sessões</span></div>
                                        <div className="w-full bg-muted rounded-full h-5 overflow-hidden"><div className="h-full rounded-full bg-primary/70" style={{ width: `${f.percentage}%` }} /></div>
                                        <p className="text-xs text-muted-foreground">R$ {f.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {f.percentage}%</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent></Card>
                    </div>
                </>
            )}
        </div>
    )
}
