'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BookOpen, Clock, Plus, Trash2, Edit, Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

export default function SupervisaoPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState<any>(null)
    const [form, setForm] = useState({ doctor_id: '', supervisor_name: '', supervisor_crp: '', session_date: new Date().toISOString().split('T')[0], duration_minutes: 60, modality: 'individual', format: 'presencial', topic: '', notes: '' })
    const [doctors, setDoctors] = useState<any[]>([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/supervision')
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    const fetchDoctors = useCallback(async () => {
        try {
            const res = await fetch('/api/doctors')
            if (res.ok) { const d = await res.json(); setDoctors(Array.isArray(d) ? d : d.doctors || []) }
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { fetchData(); fetchDoctors() }, [fetchData, fetchDoctors])

    const handleSave = async () => {
        try {
            const method = editingRecord ? 'PUT' : 'POST'
            const body = editingRecord ? { ...form, id: editingRecord.id } : form
            const res = await fetch('/api/supervision', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) { toast.success(editingRecord ? 'Atualizado!' : 'Registrado!'); setDialogOpen(false); setEditingRecord(null); fetchData() }
            else { const err = await res.json(); toast.error(err.error || 'Erro') }
        } catch (e) { toast.error('Erro ao salvar') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este registro?')) return
        try {
            const res = await fetch('/api/supervision', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
            if (res.ok) { toast.success('Excluído!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const openEdit = (record: any) => {
        setEditingRecord(record)
        setForm({ doctor_id: record.doctor_id, supervisor_name: record.supervisor_name, supervisor_crp: record.supervisor_crp || '', session_date: record.session_date, duration_minutes: record.duration_minutes, modality: record.modality, format: record.format, topic: record.topic || '', notes: record.notes || '' })
        setDialogOpen(true)
    }

    const openNew = () => {
        setEditingRecord(null)
        setForm({ doctor_id: '', supervisor_name: '', supervisor_crp: '', session_date: new Date().toISOString().split('T')[0], duration_minutes: 60, modality: 'individual', format: 'presencial', topic: '', notes: '' })
        setDialogOpen(true)
    }

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Supervisão')
        ws.columns = [{ header: 'Terapeuta', key: 'doctor_name', width: 25 }, { header: 'Supervisor', key: 'supervisor_name', width: 25 }, { header: 'Data', key: 'session_date', width: 12 }, { header: 'Duração (min)', key: 'duration_minutes', width: 12 }, { header: 'Tema', key: 'topic', width: 30 }]
        data.records?.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'supervisao.xlsx'; a.click()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Supervisão Clínica</h1><p className="text-muted-foreground">Controle de horas de supervisão por terapeuta</p></div>
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
                        onClick={openNew}
                        className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Supervisão</span>
                    </Button>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {data?.summary?.map((s: any) => (
                            <Card key={s.doctor_id}>
                                <CardHeader className="pb-2"><CardTitle className="text-base">{s.doctor_name}</CardTitle><CardDescription>{s.sessions} sessões · {s.total_hours}h de {s.goal_hours}h</CardDescription></CardHeader>
                                <CardContent>
                                    <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${s.progress_pct >= 100 ? 'bg-green-500' : s.progress_pct >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(s.progress_pct, 100)}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{s.progress_pct}% da meta mensal</p>
                                </CardContent>
                            </Card>
                        ))}
                        {(!data?.summary || data.summary.length === 0) && <Card className="col-span-3"><CardContent className="py-8 text-center text-muted-foreground">Nenhum registro de supervisão</CardContent></Card>}
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b"><th className="text-left p-2">Terapeuta</th><th className="text-left p-2">Supervisor</th><th className="text-left p-2">Data</th><th className="text-left p-2">Duração</th><th className="text-left p-2">Tema</th><th className="text-left p-2">Ações</th></tr></thead>
                                    <tbody>
                                        {data?.records?.map((r: any) => (
                                            <tr key={r.id} className="border-b hover:bg-muted/50">
                                                <td className="p-2">{r.doctor_name}</td>
                                                <td className="p-2">{r.supervisor_name}</td>
                                                <td className="p-2">{r.session_date ? new Date(r.session_date).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="p-2">{r.duration_minutes}min</td>
                                                <td className="p-2 max-w-[200px] truncate">{r.topic || '-'}</td>
                                                <td className="p-2 flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingRecord ? 'Editar' : 'Nova'} Supervisão</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Terapeuta</Label><select value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="">Selecione...</option>{doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Supervisor</Label><Input value={form.supervisor_name} onChange={e => setForm({ ...form, supervisor_name: e.target.value })} /></div>
                            <div><Label>CRP Supervisor</Label><Input value={form.supervisor_crp} onChange={e => setForm({ ...form, supervisor_crp: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Data</Label><Input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} /></div>
                            <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} /></div>
                            <div><Label>Formato</Label><select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="presencial">Presencial</option><option value="online">Online</option></select></div>
                        </div>
                        <div><Label>Tema</Label><Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></div>
                        <div><Label>Observações</Label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded px-3 py-2 text-sm h-20" /></div>
                        <Button
                            onClick={handleSave}
                            className="w-full flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0 justify-center items-center"
                        >
                            <span>{editingRecord ? 'Salvar Alterações' : 'Registrar Supervisão'}</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
