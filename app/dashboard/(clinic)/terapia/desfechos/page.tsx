'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowRightLeft, ClipboardList, Download, FileSpreadsheet } from 'lucide-react'

export default function DesfechosPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 12); return d.toISOString().split('T')[0] })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/discharge?start_date=${startDate}&end_date=${endDate}`)
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [startDate, endDate])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Desfechos')
        ws.columns = [
            { header: 'Paciente', key: 'patient_name', width: 25 }, { header: 'Terapeuta', key: 'doctor_name', width: 25 },
            { header: 'Tipo', key: 'discharge_type', width: 20 }, { header: 'Data', key: 'discharge_date', width: 15 },
        ]
        data.discharges.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `desfechos_${startDate}_${endDate}.xlsx`; a.click()
    }

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF(); doc.setFontSize(16); doc.text('Desfechos Terapêuticos', 14, 20)
        doc.setFontSize(10); doc.text(`Período: ${startDate} a ${endDate}`, 14, 28)
        if (data) { autoTable(doc, { startY: 35, head: [['Paciente', 'Terapeuta', 'Tipo', 'Data']], body: data.discharges.map((r: any) => [r.patient_name, r.doctor_name, r.discharge_type, r.discharge_date]) }) }
        doc.save(`desfechos_${startDate}_${endDate}.pdf`)
    }

    const typeLabels: Record<string, string> = { alta_programada: 'Alta Programada', abandono: 'Abandono', encaminhamento: 'Encaminhamento', alta_administrativa: 'Alta Administrativa' }
    const typeColors: Record<string, string> = { alta_programada: 'text-green-600', abandono: 'text-red-600', encaminhamento: 'text-blue-600', alta_administrativa: 'text-orange-600' }
    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Desfechos Terapêuticos</h1><p className="text-muted-foreground">Altas, abandonos e encaminhamentos</p></div>
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
                        <Card><CardHeader className="pb-2"><CardDescription>Total de Altas</CardDescription><CardTitle className="text-2xl">{s?.total_discharges || 0}</CardTitle></CardHeader><CardContent><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Taxa de Sucesso</CardDescription><CardTitle className="text-2xl text-green-600">{s?.success_rate || 0}%</CardTitle></CardHeader><CardContent><CheckCircle className="h-4 w-4 text-green-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Abandonos</CardDescription><CardTitle className="text-2xl text-red-600">{s?.by_type?.abandono || 0}</CardTitle></CardHeader><CardContent><XCircle className="h-4 w-4 text-red-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Encaminhamentos</CardDescription><CardTitle className="text-2xl text-blue-600">{s?.by_type?.encaminhamento || 0}</CardTitle></CardHeader><CardContent><ArrowRightLeft className="h-4 w-4 text-blue-600" /></CardContent></Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Distribuição por Tipo</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {Object.entries(s?.by_type || {}).map(([type, count]: [string, any]) => (
                                    <div key={type} className="text-center p-4 border rounded-lg">
                                        <p className={`text-3xl font-bold ${typeColors[type] || ''}`}>{count}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{typeLabels[type] || type}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Últimas Altas</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b"><th className="text-left p-2">Paciente</th><th className="text-left p-2">Terapeuta</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Data</th></tr></thead>
                                    <tbody>
                                        {data?.discharges?.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">Nenhuma alta registrada no período</td></tr>}
                                        {data?.discharges?.map((d: any) => (
                                            <tr key={d.id} className="border-b hover:bg-muted/50">
                                                <td className="p-2">{d.patient_name}</td>
                                                <td className="p-2">{d.doctor_name}</td>
                                                <td className={`p-2 font-medium ${typeColors[d.discharge_type] || ''}`}>{typeLabels[d.discharge_type] || d.discharge_type}</td>
                                                <td className="p-2">{d.discharge_date ? new Date(d.discharge_date).toLocaleDateString('pt-BR') : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
