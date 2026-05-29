'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowRightLeft, Plus, Trash2, Edit, Download, FileSpreadsheet, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function EncaminhamentosPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState({ patient_id: '', referring_external_name: '', referring_external_specialty: '', target_specialty: '', reason: '', notes: '' })
    const [patients, setPatients] = useState<any[]>([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/referrals')
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSave = async () => {
        try {
            const res = await fetch('/api/referrals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (res.ok) { toast.success('Encaminhamento registrado!'); setDialogOpen(false); fetchData() }
            else { const err = await res.json(); toast.error(err.error || 'Erro') }
        } catch (e) { toast.error('Erro ao salvar') }
    }

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/referrals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
            if (res.ok) { toast.success('Atualizado!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir encaminhamento?')) return
        try {
            const res = await fetch('/api/referrals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
            if (res.ok) { toast.success('Excluído!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Encaminhamentos')
        ws.columns = [{ header: 'Paciente', key: 'patient_name', width: 25 }, { header: 'Referenciador', key: 'referring_doctor_name', width: 25 }, { header: 'Destino', key: 'target_specialty', width: 20 }, { header: 'Status', key: 'status', width: 12 }, { header: 'Motivo', key: 'reason', width: 30 }]
        data.referrals?.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'encaminhamentos.xlsx'; a.click()
    }

    const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', scheduled: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }
    const statusLabels: Record<string, string> = { pending: 'Pendente', scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado' }
    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Encaminhamentos</h1><p className="text-muted-foreground">Gestão de encaminhamentos internos e externos</p></div>
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
                            setForm({ patient_id: '', referring_external_name: '', referring_external_specialty: '', target_specialty: '', reason: '', notes: '' });
                            setDialogOpen(true);
                        }}
                        className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Novo Encaminhamento</span>
                    </Button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{s?.total || 0}</CardTitle></CardHeader><CardContent><ArrowRightLeft className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Convertidos</CardDescription><CardTitle className="text-2xl text-green-600">{s?.converted || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Taxa Conversão</CardDescription><CardTitle className="text-2xl text-primary">{s?.conversion_rate || 0}%</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Pendentes</CardDescription><CardTitle className="text-2xl text-yellow-600">{s?.by_status?.pending || 0}</CardTitle></CardHeader></Card>
                    </div>
                    {data?.top_referrers?.length > 0 && (
                        <Card><CardHeader><CardTitle>Top Referenciadores</CardTitle></CardHeader><CardContent>
                            <div className="space-y-2">{data.top_referrers.map((r: any, i: number) => (
                                <div key={i} className="flex items-center gap-3"><span className="text-sm w-6 font-bold text-muted-foreground">#{i+1}</span><span className="text-sm flex-1">{r.name}</span><span className="text-sm font-bold">{r.count}</span></div>
                            ))}</div>
                        </CardContent></Card>
                    )}
                    <Card><CardHeader><CardTitle>Lista de Encaminhamentos</CardTitle></CardHeader><CardContent>
                        <div className="overflow-x-auto"><table className="w-full text-sm">
                            <thead><tr className="border-b"><th className="text-left p-2">Paciente</th><th className="text-left p-2">Referenciador</th><th className="text-left p-2">Especialidade Destino</th><th className="text-left p-2">Motivo</th><th className="text-left p-2">Status</th><th className="text-left p-2">Ações</th></tr></thead>
                            <tbody>
                                {data?.referrals?.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">Nenhum encaminhamento</td></tr>}
                                {data?.referrals?.map((r: any) => (
                                    <tr key={r.id} className="border-b hover:bg-muted/50">
                                        <td className="p-2 font-medium">{r.patient_name}</td>
                                        <td className="p-2">{r.referring_doctor_name}</td>
                                        <td className="p-2">{r.target_specialty || '-'}</td>
                                        <td className="p-2 max-w-[200px] truncate">{r.reason || '-'}</td>
                                        <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${statusColors[r.status] || ''}`}>{statusLabels[r.status] || r.status}</span></td>
                                        <td className="p-2 flex gap-1">
                                            {r.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'scheduled')}>Agendar</Button>}
                                            {r.status === 'scheduled' && <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'completed')}>Concluir</Button>}
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    </CardContent></Card>
                </>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Novo Encaminhamento</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Nome do Referenciador Externo</Label><Input value={form.referring_external_name} onChange={e => setForm({ ...form, referring_external_name: e.target.value })} placeholder="Dr. João Silva" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Especialidade Origem</Label><Input value={form.referring_external_specialty} onChange={e => setForm({ ...form, referring_external_specialty: e.target.value })} /></div>
                            <div><Label>Especialidade Destino</Label><Input value={form.target_specialty} onChange={e => setForm({ ...form, target_specialty: e.target.value })} /></div>
                        </div>
                        <div><Label>Motivo</Label><textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border rounded px-3 py-2 text-sm h-20" /></div>
                        <div><Label>Observações</Label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded px-3 py-2 text-sm h-16" /></div>
                        <Button
                            onClick={handleSave}
                            className="w-full flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold transition-all duration-200 border-0 justify-center items-center"
                        >
                            <Send className="w-4 h-4" />
                            <span>Registrar Encaminhamento</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
