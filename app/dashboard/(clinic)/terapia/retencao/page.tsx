'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, TrendingDown, TrendingUp, BarChart3, Download, FileSpreadsheet } from 'lucide-react'

export default function RetencaoPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 12)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/retention?start_date=${startDate}&end_date=${endDate}`)
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [startDate, endDate])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Retenção')
        ws.columns = [
            { header: 'Faixa', key: 'label', width: 20 },
            { header: 'Pacientes', key: 'count', width: 15 },
            { header: '%', key: 'percentage', width: 10 },
        ]
        data.funnel.forEach((row: any) => ws.addRow(row))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `retencao_${startDate}_${endDate}.xlsx`; a.click()
    }

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        doc.setFontSize(16); doc.text('Relatório de Retenção', 14, 20)
        doc.setFontSize(10); doc.text(`Período: ${startDate} a ${endDate}`, 14, 28)
        if (data) {
            autoTable(doc, {
                startY: 35,
                head: [['Faixa', 'Pacientes', '%']],
                body: data.funnel.map((r: any) => [r.label, r.count, `${r.percentage}%`]),
            })
        }
        doc.save(`retencao_${startDate}_${endDate}.pdf`)
    }

    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Retenção de Pacientes</h1>
                    <p className="text-muted-foreground">Funil de abandono por faixa de sessões realizadas</p>
                </div>
                <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                    <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
                    <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Total Pacientes</CardDescription><CardTitle className="text-2xl">{s?.total_patients || 0}</CardTitle></CardHeader><CardContent><Users className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Taxa de Retenção</CardDescription><CardTitle className="text-2xl text-green-600">{s?.retention_rate || 0}%</CardTitle></CardHeader><CardContent><TrendingUp className="h-4 w-4 text-green-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Taxa de Churn</CardDescription><CardTitle className="text-2xl text-red-600">{s?.churn_rate || 0}%</CardTitle></CardHeader><CardContent><TrendingDown className="h-4 w-4 text-red-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Média Sessões/Paciente</CardDescription><CardTitle className="text-2xl">{s?.avg_sessions_per_patient || 0}</CardTitle></CardHeader><CardContent><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Funil de Retenção</CardTitle><CardDescription>Distribuição de pacientes por faixa de sessões</CardDescription></CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data?.funnel?.map((band: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <span className="text-sm w-32 text-right font-medium">{band.label}</span>
                                        <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                                            <div className="h-full bg-primary/80 rounded-full flex items-center justify-end pr-2 transition-all duration-500" style={{ width: `${Math.max(band.percentage, 3)}%` }}>
                                                <span className="text-xs font-bold text-primary-foreground">{band.count}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm w-12 text-muted-foreground">{band.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
