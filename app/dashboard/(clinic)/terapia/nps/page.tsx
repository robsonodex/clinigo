'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Star, Plus, Download, FileSpreadsheet, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { toast } from 'sonner'

export default function NpsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState({ patient_id: '', doctor_id: '', score: 8, comment: '', source: 'manual' })
    const [patients, setPatients] = useState<any[]>([])
    const [doctors, setDoctors] = useState<any[]>([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try { const res = await fetch('/api/nps'); if (res.ok) setData(await res.json()) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSave = async () => {
        try {
            const res = await fetch('/api/nps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (res.ok) { toast.success('NPS registrado!'); setDialogOpen(false); fetchData() }
            else { const err = await res.json(); toast.error(err.error || 'Erro') }
        } catch (e) { toast.error('Erro ao salvar') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir resposta?')) return
        try {
            const res = await fetch('/api/nps', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
            if (res.ok) { toast.success('Excluído!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('NPS')
        ws.columns = [{ header: 'Nota', key: 'score', width: 8 }, { header: 'Categoria', key: 'category', width: 12 }, { header: 'Paciente', key: 'patient_name', width: 25 }, { header: 'Comentário', key: 'comment', width: 40 }, { header: 'Data', key: 'date', width: 15 }]
        data.recent_comments?.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'nps.xlsx'; a.click()
    }

    const s = data?.summary
    const npsColor = (s?.nps_score || 0) >= 50 ? 'text-green-600' : (s?.nps_score || 0) >= 0 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">NPS — Satisfação</h1><p className="text-muted-foreground">Net Promoter Score dos pacientes</p></div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={exportExcel}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Excel</span>
                    </Button>
                    <Button
                        onClick={() => {
                            setForm({ patient_id: '', doctor_id: '', score: 8, comment: '', source: 'manual' });
                            setDialogOpen(true);
                        }}
                        className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar NPS</span>
                    </Button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card className="lg:col-span-1"><CardHeader className="pb-2"><CardDescription>NPS Score</CardDescription><CardTitle className={`text-4xl ${npsColor}`}>{s?.nps_score || 0}</CardTitle></CardHeader><CardContent><Star className="h-5 w-5 text-yellow-500" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Respostas</CardDescription><CardTitle className="text-2xl">{s?.total_responses || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Promotores</CardDescription><CardTitle className="text-2xl text-green-600">{s?.promoters || 0} <span className="text-sm">({s?.promoters_pct || 0}%)</span></CardTitle></CardHeader><CardContent><ThumbsUp className="h-4 w-4 text-green-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Neutros</CardDescription><CardTitle className="text-2xl text-yellow-600">{s?.neutrals || 0}</CardTitle></CardHeader><CardContent><Minus className="h-4 w-4 text-yellow-600" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Detratores</CardDescription><CardTitle className="text-2xl text-red-600">{s?.detractors || 0} <span className="text-sm">({s?.detractors_pct || 0}%)</span></CardTitle></CardHeader><CardContent><ThumbsDown className="h-4 w-4 text-red-600" /></CardContent></Card>
                    </div>

                    {data?.trend?.length > 0 && (
                        <Card><CardHeader><CardTitle>Tendência NPS (6 meses)</CardTitle></CardHeader><CardContent>
                            <div className="flex items-end gap-2 h-32">
                                {data.trend.map((t: any) => {
                                    const maxNps = Math.max(...data.trend.map((x: any) => Math.abs(x.nps)), 1)
                                    const normalizedHeight = Math.abs(t.nps) / maxNps * 80
                                    return (<div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                                        <span className={`text-xs font-bold ${t.nps >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.nps}</span>
                                        <div className={`w-full rounded-t transition-all ${t.nps >= 50 ? 'bg-green-500' : t.nps >= 0 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ height: `${Math.max(normalizedHeight, 4)}%` }} />
                                        <span className="text-[9px] text-muted-foreground">{t.month.split('-')[1]}/{t.month.split('-')[0].slice(2)}</span>
                                    </div>)
                                })}
                            </div>
                        </CardContent></Card>
                    )}

                    <Card><CardHeader><CardTitle>Comentários Recentes</CardTitle></CardHeader><CardContent>
                        <div className="space-y-3">
                            {data?.recent_comments?.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum comentário</p>}
                            {data?.recent_comments?.map((c: any, i: number) => (
                                <div key={i} className={`p-3 rounded-lg border-l-4 ${c.score >= 9 ? 'border-l-green-500 bg-green-50/50' : c.score >= 7 ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-red-500 bg-red-50/50'}`}>
                                    <div className="flex justify-between items-start"><div className="flex items-center gap-2"><span className={`font-bold ${c.score >= 9 ? 'text-green-600' : c.score >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>{c.score}/10</span><span className="text-sm font-medium">{c.patient_name}</span></div><span className="text-xs text-muted-foreground">{c.date ? new Date(c.date).toLocaleDateString('pt-BR') : ''}</span></div>
                                    <p className="text-sm mt-1">{c.comment}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent></Card>
                </>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Registrar NPS</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>ID do Paciente</Label><Input value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} placeholder="UUID do paciente" /></div>
                        <div><Label>Nota (0-10)</Label>
                            <div className="flex gap-1 mt-1">{[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                                <button key={n} onClick={() => setForm({ ...form, score: n })} className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${form.score === n ? (n >= 9 ? 'bg-green-500 text-white' : n >= 7 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'bg-muted hover:bg-muted/80'}`}>{n}</button>
                            ))}</div>
                        </div>
                        <div><Label>Comentário</Label><textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} className="w-full border rounded px-3 py-2 text-sm h-20" placeholder="Feedback do paciente..." /></div>
                        <Button
                            onClick={handleSave}
                            className="w-full flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0 justify-center items-center"
                        >
                            <span>Registrar NPS</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
