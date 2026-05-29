'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, TrendingUp, Download, FileSpreadsheet } from 'lucide-react'

export default function SazonalidadePage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try { const res = await fetch('/api/reports/seasonality?months=24'); if (res.ok) setData(await res.json()) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Sazonalidade')
        ws.columns = [{ header: 'Mês', key: 'month', width: 12 }, { header: 'Sessões', key: 'total_sessions', width: 10 }, { header: 'Realizadas', key: 'completed', width: 10 }, { header: 'Faltas', key: 'no_shows', width: 8 }, { header: 'Novos Pac.', key: 'new_patients', width: 10 }, { header: 'Pac. Ativos', key: 'active_patients', width: 10 }, { header: 'Aderência %', key: 'adherence_rate', width: 12 }]
        data.monthly?.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sazonalidade.xlsx'; a.click()
    }

    const s = data?.summary
    const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Sazonalidade</h1><p className="text-muted-foreground">Tendência mensal de sessões, faltas e novos pacientes</p></div>
                <Button
                    variant="outline"
                    onClick={exportExcel}
                    className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Excel</span>
                </Button>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Pico (Mês)</CardDescription><CardTitle className="text-lg">{s?.peak_month ? `${monthNames[parseInt(s.peak_month.split('-')[1])]}/${s.peak_month.split('-')[0]}` : '-'}</CardTitle></CardHeader><CardContent><span className="text-sm text-green-600 font-bold">{s?.peak_sessions || 0} sessões</span></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Vale (Mês)</CardDescription><CardTitle className="text-lg">{s?.low_month ? `${monthNames[parseInt(s.low_month.split('-')[1])]}/${s.low_month.split('-')[0]}` : '-'}</CardTitle></CardHeader><CardContent><span className="text-sm text-red-600 font-bold">{s?.low_sessions || 0} sessões</span></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Média Mensal</CardDescription><CardTitle className="text-2xl">{s?.avg_monthly_sessions || 0}</CardTitle></CardHeader><CardContent><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Novos Pac./Mês</CardDescription><CardTitle className="text-2xl">{s?.avg_new_patients_monthly || 0}</CardTitle></CardHeader><CardContent><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                    </div>

                    <Card><CardHeader><CardTitle>Sessões por Mês (24 meses)</CardTitle></CardHeader><CardContent>
                        <div className="flex items-end gap-[2px] h-48">
                            {data?.monthly?.map((m: any) => {
                                const max = Math.max(...(data.monthly?.map((x: any) => x.total_sessions) || [1]))
                                const height = max > 0 ? (m.total_sessions / max) * 100 : 0
                                const [y, mo] = m.month.split('-')
                                return (<div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${monthNames[parseInt(mo)]}/${y}: ${m.total_sessions} sessões`}>
                                    <span className="text-[8px] font-bold">{m.total_sessions > 0 ? m.total_sessions : ''}</span>
                                    <div className="w-full bg-primary/70 rounded-t transition-all hover:bg-primary" style={{ height: `${Math.max(height, 2)}%` }} />
                                    <span className="text-[7px] text-muted-foreground">{monthNames[parseInt(mo)]?.slice(0,1)}</span>
                                </div>)
                            })}
                        </div>
                    </CardContent></Card>

                    <Card><CardHeader><CardTitle>Detalhamento Mensal</CardTitle></CardHeader><CardContent>
                        <div className="overflow-x-auto"><table className="w-full text-sm">
                            <thead><tr className="border-b"><th className="text-left p-2">Mês</th><th className="text-right p-2">Sessões</th><th className="text-right p-2">Realizadas</th><th className="text-right p-2">Faltas</th><th className="text-right p-2">Novos Pac.</th><th className="text-right p-2">Ativos</th><th className="text-right p-2">Aderência</th></tr></thead>
                            <tbody>{data?.monthly?.slice().reverse().map((m: any) => (
                                <tr key={m.month} className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">{monthNames[parseInt(m.month.split('-')[1])]}/{m.month.split('-')[0]}</td>
                                    <td className="p-2 text-right">{m.total_sessions}</td>
                                    <td className="p-2 text-right text-green-600">{m.completed}</td>
                                    <td className="p-2 text-right text-red-600">{m.no_shows}</td>
                                    <td className="p-2 text-right">{m.new_patients}</td>
                                    <td className="p-2 text-right">{m.active_patients}</td>
                                    <td className="p-2 text-right font-bold">{m.adherence_rate}%</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </CardContent></Card>

                    {data?.year_over_year?.length > 0 && (
                        <Card><CardHeader><CardTitle>Comparativo Ano a Ano</CardTitle></CardHeader><CardContent>
                            <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead><tr className="border-b"><th className="text-left p-2">Mês</th><th className="text-right p-2">Ano Atual</th><th className="text-right p-2">Ano Anterior</th><th className="text-right p-2">Crescimento</th></tr></thead>
                                <tbody>{data.year_over_year.map((y: any) => (
                                    <tr key={y.month} className="border-b">
                                        <td className="p-2">{monthNames[parseInt(y.month)]}</td>
                                        <td className="p-2 text-right font-bold">{y.current_year}</td>
                                        <td className="p-2 text-right">{y.previous_year}</td>
                                        <td className={`p-2 text-right font-bold ${(y.growth_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{y.growth_pct !== null ? `${y.growth_pct > 0 ? '+' : ''}${y.growth_pct}%` : '-'}</td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                        </CardContent></Card>
                    )}
                </>
            )}
        </div>
    )
}
