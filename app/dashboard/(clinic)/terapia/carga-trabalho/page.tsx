'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, Users, AlertCircle, Download, FileSpreadsheet } from 'lucide-react'

export default function CargaTrabalhoPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/reports/therapist-workload')
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Carga Trabalho')
        ws.columns = [
            { header: 'Terapeuta', key: 'doctor_name', width: 25 }, { header: 'Sessões Semana', key: 'weekly_appointments', width: 15 },
            { header: 'Máx Semanal', key: 'max_weekly', width: 12 }, { header: 'Ocupação %', key: 'occupancy_rate', width: 12 },
            { header: 'Status', key: 'load_level', width: 15 },
        ]
        data.workload.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'carga_trabalho.xlsx'; a.click()
    }

    const loadColors: Record<string, string> = { overloaded: 'bg-red-100 text-red-800', optimal: 'bg-green-100 text-green-800', underloaded: 'bg-yellow-100 text-yellow-800' }
    const loadLabels: Record<string, string> = { overloaded: 'Sobrecarregado', optimal: 'Ideal', underloaded: 'Ocioso' }
    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Carga de Trabalho</h1><p className="text-muted-foreground">Ocupação semanal dos terapeutas vs capacidade</p></div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Terapeutas</CardDescription><CardTitle className="text-2xl">{s?.total_doctors || 0}</CardTitle></CardHeader><CardContent><Users className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                        <Card className="border-green-200"><CardHeader className="pb-2"><CardDescription>Carga Ideal</CardDescription><CardTitle className="text-2xl text-green-600">{s?.optimal || 0}</CardTitle></CardHeader></Card>
                        <Card className="border-red-200"><CardHeader className="pb-2"><CardDescription>Sobrecarregados</CardDescription><CardTitle className="text-2xl text-red-600">{s?.overloaded || 0}</CardTitle></CardHeader><CardContent><AlertCircle className="h-4 w-4 text-red-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Ocupação Média</CardDescription><CardTitle className="text-2xl">{s?.avg_occupancy || 0}%</CardTitle></CardHeader><CardContent><Activity className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Ocupação por Terapeuta</CardTitle><CardDescription>Semana: {data?.period?.week_start} a {data?.period?.week_end}</CardDescription></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data?.workload?.map((w: any) => (
                                    <div key={w.doctor_id} className="flex items-center gap-4">
                                        <span className="text-sm w-40 truncate font-medium">{w.doctor_name}</span>
                                        <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                                            <div className={`h-full rounded-full transition-all flex items-center justify-end pr-2 ${w.load_level === 'overloaded' ? 'bg-red-500' : w.load_level === 'optimal' ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(w.occupancy_rate, 100)}%` }}>
                                                <span className="text-xs font-bold text-white">{w.weekly_appointments}/{w.max_weekly}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${loadColors[w.load_level]}`}>{loadLabels[w.load_level]}</span>
                                        <span className="text-sm w-12 text-right font-bold">{w.occupancy_rate}%</span>
                                    </div>
                                ))}
                                {(!data?.workload || data.workload.length === 0) && <p className="text-center text-muted-foreground py-4">Nenhum terapeuta ativo</p>}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
