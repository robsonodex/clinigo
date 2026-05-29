'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Phone, Download, FileSpreadsheet } from 'lucide-react'

export default function RiscoEvasaoPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [riskFilter, setRiskFilter] = useState<string>('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (riskFilter) params.set('risk_level', riskFilter)
            const res = await fetch(`/api/patients/evasion-risk?${params}`)
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [riskFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Risco Evasão')
        ws.columns = [
            { header: 'Paciente', key: 'patient_name', width: 25 }, { header: 'Terapeuta', key: 'doctor_name', width: 25 },
            { header: 'Última Consulta', key: 'last_appointment', width: 15 }, { header: 'Dias Sem Agendar', key: 'days_since_last', width: 15 },
            { header: 'Risco', key: 'risk_level', width: 10 }, { header: 'Telefone', key: 'patient_phone', width: 18 },
        ]
        data.patients.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'risco_evasao.xlsx'; a.click()
    }

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF(); doc.setFontSize(16); doc.text('Pacientes em Risco de Evasão', 14, 20)
        if (data) { autoTable(doc, { startY: 30, head: [['Paciente', 'Terapeuta', 'Última Consulta', 'Dias', 'Risco']], body: data.patients.slice(0, 50).map((r: any) => [r.patient_name, r.doctor_name, r.last_appointment, r.days_since_last, r.risk_level]) }) }
        doc.save('risco_evasao.pdf')
    }

    const riskColors: Record<string, string> = { high: 'bg-red-100 text-red-800 border-red-200', medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', low: 'bg-green-100 text-green-800 border-green-200' }
    const riskLabels: Record<string, string> = { high: 'Alto', medium: 'Médio', low: 'Baixo' }
    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Risco de Evasão</h1><p className="text-muted-foreground">Pacientes sem agendar há mais de 14 dias</p></div>
                <div className="flex gap-2 items-center">
                    <select
                        value={riskFilter}
                        onChange={e => setRiskFilter(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer transition-all duration-200"
                    >
                        <option value="">Todos os riscos</option>
                        <option value="high">Alto (45+ dias)</option>
                        <option value="medium">Médio (21-44 dias)</option>
                        <option value="low">Baixo (14-20 dias)</option>
                    </select>
                    <Button
                        variant="outline"
                        onClick={exportExcel}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={exportPDF}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <Download className="w-4 h-4 text-blue-600" />
                        <span>PDF</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Total em Risco</CardDescription><CardTitle className="text-2xl">{s?.total_at_risk || 0}</CardTitle></CardHeader><CardContent><AlertTriangle className="h-4 w-4 text-yellow-600" /></CardContent></Card>
                        <Card className="border-red-200"><CardHeader className="pb-2"><CardDescription>Risco Alto</CardDescription><CardTitle className="text-2xl text-red-600">{s?.high_risk || 0}</CardTitle></CardHeader><CardContent><span className="text-xs text-muted-foreground">45+ dias sem agendar</span></CardContent></Card>
                        <Card className="border-yellow-200"><CardHeader className="pb-2"><CardDescription>Risco Médio</CardDescription><CardTitle className="text-2xl text-yellow-600">{s?.medium_risk || 0}</CardTitle></CardHeader><CardContent><span className="text-xs text-muted-foreground">21-44 dias</span></CardContent></Card>
                        <Card className="border-green-200"><CardHeader className="pb-2"><CardDescription>Risco Baixo</CardDescription><CardTitle className="text-2xl text-green-600">{s?.low_risk || 0}</CardTitle></CardHeader><CardContent><span className="text-xs text-muted-foreground">14-20 dias</span></CardContent></Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Pacientes em Risco</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b"><th className="text-left p-2">Paciente</th><th className="text-left p-2">Terapeuta</th><th className="text-left p-2">Última Consulta</th><th className="text-left p-2">Dias</th><th className="text-left p-2">Risco</th><th className="text-left p-2">Contato</th></tr></thead>
                                    <tbody>
                                        {data?.patients?.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">Nenhum paciente em risco de evasão 🎉</td></tr>}
                                        {data?.patients?.map((p: any) => (
                                            <tr key={p.patient_id} className="border-b hover:bg-muted/50">
                                                <td className="p-2 font-medium">{p.patient_name}</td>
                                                <td className="p-2">{p.doctor_name}</td>
                                                <td className="p-2">{p.last_appointment ? new Date(p.last_appointment).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="p-2 font-bold">{p.days_since_last}d</td>
                                                <td className="p-2"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${riskColors[p.risk_level]}`}>{riskLabels[p.risk_level]}</span></td>
                                                <td className="p-2">{p.patient_phone ? <a href={`https://wa.me/55${p.patient_phone.replace(/\D/g,'')}`} target="_blank" rel="noopener" className="text-green-600 hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{p.patient_phone}</a> : '-'}</td>
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
