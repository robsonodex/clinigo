'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Download, FileSpreadsheet } from 'lucide-react'

export default function DemograficoPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try { const res = await fetch('/api/reports/demographics'); if (res.ok) setData(await res.json()) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook()
        const ws1 = wb.addWorksheet('Gênero'); ws1.columns = [{ header: 'Gênero', key: 'label', width: 20 }, { header: 'Qtd', key: 'count', width: 10 }, { header: '%', key: 'percentage', width: 10 }]; data.by_gender?.forEach((r: any) => ws1.addRow(r))
        const ws2 = wb.addWorksheet('Faixa Etária'); ws2.columns = [{ header: 'Faixa', key: 'label', width: 20 }, { header: 'Qtd', key: 'count', width: 10 }, { header: '%', key: 'percentage', width: 10 }]; data.by_age_group?.forEach((r: any) => ws2.addRow(r))
        const ws3 = wb.addWorksheet('Origem'); ws3.columns = [{ header: 'Origem', key: 'label', width: 25 }, { header: 'Qtd', key: 'count', width: 10 }, { header: '%', key: 'percentage', width: 10 }]; data.by_origin?.forEach((r: any) => ws3.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'demografico.xlsx'; a.click()
    }

    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500']

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Perfil Demográfico</h1><p className="text-muted-foreground">Distribuição de pacientes por gênero, idade, origem e queixa</p></div>
                <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <Card><CardHeader className="pb-2"><CardDescription>Total de Pacientes</CardDescription><CardTitle className="text-3xl">{data?.summary?.total_patients || 0}</CardTitle></CardHeader><CardContent><Users className="h-5 w-5 text-muted-foreground" /></CardContent></Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card><CardHeader><CardTitle>Por Gênero</CardTitle></CardHeader><CardContent><div className="space-y-2">{data?.by_gender?.map((g: any, i: number) => (
                            <div key={g.label} className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} /><span className="text-sm flex-1 capitalize">{g.label}</span><span className="text-sm font-bold">{g.count}</span><span className="text-xs text-muted-foreground">{g.percentage}%</span></div>
                        ))}</div></CardContent></Card>

                        <Card><CardHeader><CardTitle>Por Faixa Etária</CardTitle></CardHeader><CardContent><div className="space-y-2">{data?.by_age_group?.map((g: any, i: number) => (
                            <div key={g.label} className="flex items-center gap-3"><span className="text-sm flex-1 capitalize">{g.label}</span><div className="w-24 bg-muted rounded-full h-4 overflow-hidden"><div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${g.percentage}%` }} /></div><span className="text-sm font-bold w-8 text-right">{g.count}</span></div>
                        ))}</div></CardContent></Card>

                        <Card><CardHeader><CardTitle>Por Origem</CardTitle></CardHeader><CardContent><div className="space-y-2">{data?.by_origin?.map((g: any, i: number) => (
                            <div key={g.label} className="flex items-center gap-3"><span className="text-sm flex-1 capitalize">{g.label}</span><span className="text-sm font-bold">{g.count}</span><span className="text-xs text-muted-foreground">{g.percentage}%</span></div>
                        ))}</div></CardContent></Card>
                    </div>

                    {data?.top_complaints?.length > 0 && (
                        <Card><CardHeader><CardTitle>Queixas Mais Frequentes</CardTitle><CardDescription>Top 15 queixas apresentadas</CardDescription></CardHeader><CardContent>
                            <div className="space-y-2">{data.top_complaints.map((c: any, i: number) => (
                                <div key={i} className="flex items-center gap-3"><span className="text-sm w-6 font-bold text-muted-foreground">#{i+1}</span><span className="text-sm flex-1 capitalize">{c.complaint}</span><div className="w-32 bg-muted rounded-full h-4 overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${(c.count / (data.top_complaints[0]?.count || 1)) * 100}%` }} /></div><span className="text-sm font-bold">{c.count}</span></div>
                            ))}</div>
                        </CardContent></Card>
                    )}

                    <Card><CardHeader><CardTitle>Novos Pacientes por Mês</CardTitle></CardHeader><CardContent>
                        <div className="flex items-end gap-1 h-40">
                            {data?.monthly_new?.map((m: any) => {
                                const max = Math.max(...(data.monthly_new?.map((x: any) => x.count) || [1]))
                                const height = max > 0 ? (m.count / max) * 100 : 0
                                return (<div key={m.month} className="flex-1 flex flex-col items-center gap-1"><span className="text-[10px] font-bold">{m.count > 0 ? m.count : ''}</span><div className="w-full bg-primary/70 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} /><span className="text-[9px] text-muted-foreground -rotate-45 origin-top-left mt-1">{m.month.split('-')[1]}</span></div>)
                            })}
                        </div>
                    </CardContent></Card>
                </>
            )}
        </div>
    )
}
