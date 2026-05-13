'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, CalendarX, Download, FileSpreadsheet } from 'lucide-react'

export default function AderenciaPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0] })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/adherence?start_date=${startDate}&end_date=${endDate}`)
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [startDate, endDate])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Aderência')
        ws.columns = [
            { header: 'Terapeuta', key: 'doctor_name', width: 25 }, { header: 'Compareceram', key: 'attended', width: 15 },
            { header: 'Total', key: 'total', width: 10 }, { header: 'Aderência %', key: 'adherence_rate', width: 12 },
        ]
        data.by_doctor.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `aderencia_${startDate}_${endDate}.xlsx`; a.click()
    }

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF(); doc.setFontSize(16); doc.text('Aderência ao Tratamento', 14, 20)
        if (data) { autoTable(doc, { startY: 30, head: [['Terapeuta', 'Compareceram', 'Total', '%']], body: data.by_doctor.map((r: any) => [r.doctor_name, r.attended, r.total, `${r.adherence_rate}%`]) }) }
        doc.save(`aderencia_${startDate}_${endDate}.pdf`)
    }

    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Aderência ao Tratamento</h1><p className="text-muted-foreground">Comparecimento vs faltas e cancelamentos</p></div>
                <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                    <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
                    <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Total Agendamentos</CardDescription><CardTitle className="text-2xl">{s?.total_appointments || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Compareceram</CardDescription><CardTitle className="text-2xl text-green-600">{s?.attended || 0}</CardTitle></CardHeader><CardContent><CheckCircle className="h-4 w-4 text-green-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Faltas</CardDescription><CardTitle className="text-2xl text-red-600">{s?.no_show || 0}</CardTitle></CardHeader><CardContent><XCircle className="h-4 w-4 text-red-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Aderência</CardDescription><CardTitle className="text-2xl text-primary">{s?.adherence_rate || 0}%</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Cancel. Tardio</CardDescription><CardTitle className="text-2xl text-orange-600">{s?.late_cancelled || 0}</CardTitle></CardHeader><CardContent><CalendarX className="h-4 w-4 text-orange-600" /></CardContent></Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card><CardHeader><CardTitle>Por Terapeuta</CardTitle></CardHeader><CardContent>
                            <div className="space-y-3">
                                {data?.by_doctor?.map((d: any) => (
                                    <div key={d.doctor_id} className="flex items-center gap-3">
                                        <span className="text-sm w-40 truncate">{d.doctor_name}</span>
                                        <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                                            <div className="h-full bg-green-500/80 rounded-full transition-all" style={{ width: `${d.adherence_rate}%` }} />
                                        </div>
                                        <span className="text-sm font-bold w-12 text-right">{d.adherence_rate}%</span>
                                    </div>
                                ))}
                                {(!data?.by_doctor || data.by_doctor.length === 0) && <p className="text-muted-foreground text-center py-4">Sem dados</p>}
                            </div>
                        </CardContent></Card>
                        <Card><CardHeader><CardTitle>Por Modalidade</CardTitle></CardHeader><CardContent>
                            <div className="space-y-3">
                                {data?.by_modality?.map((m: any) => (
                                    <div key={m.modality} className="flex items-center gap-3">
                                        <span className="text-sm w-28 capitalize">{m.modality}</span>
                                        <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                                            <div className="h-full bg-blue-500/80 rounded-full transition-all" style={{ width: `${m.adherence_rate}%` }} />
                                        </div>
                                        <span className="text-sm font-bold w-12 text-right">{m.adherence_rate}%</span>
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
