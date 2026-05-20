'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, Users, Plus, Trash2, Edit, Phone, CheckCircle, Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

export default function FilaEsperaPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [form, setForm] = useState({ patient_name: '', patient_phone: '', patient_email: '', therapy_type: '', modality: 'individual', preferred_shift: 'any', urgency: 'normal', notes: '', lead_source: '', responsible_name: '' })
    const [statusFilter, setStatusFilter] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/waiting-list?${params}`)
            if (res.ok) setData(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSave = async () => {
        try {
            // Estruturar campos de lead_source e responsible_name dentro do notes
            let finalNotes = form.notes;
            if (form.lead_source || form.responsible_name) {
                finalNotes = `[Origem: ${form.lead_source || 'Não informado'}] [Responsável: ${form.responsible_name || 'N/A'}]\n${form.notes}`;
            }

            const res = await fetch('/api/waiting-list', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                    patient_name: form.patient_name,
                    patient_phone: form.patient_phone,
                    patient_email: form.patient_email,
                    therapy_type: form.therapy_type,
                    modality: form.modality,
                    preferred_shift: form.preferred_shift,
                    urgency: form.urgency,
                    notes: finalNotes
                }) 
            })
            if (res.ok) { toast.success('Adicionado à fila!'); setDialogOpen(false); fetchData() }
            else { const err = await res.json(); toast.error(err.error || 'Erro') }
        } catch (e) { toast.error('Erro ao salvar') }
    }

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/waiting-list', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
            if (res.ok) { toast.success('Status atualizado!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Remover da fila?')) return
        try {
            const res = await fetch('/api/waiting-list', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
            if (res.ok) { toast.success('Removido!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Fila de Espera')
        ws.columns = [{ header: 'Nome', key: 'patient_name', width: 25 }, { header: 'Telefone', key: 'patient_phone', width: 18 }, { header: 'Tipo', key: 'therapy_type', width: 15 }, { header: 'Status', key: 'status', width: 12 }, { header: 'Dias', key: 'wait_days', width: 8 }, { header: 'Urgência', key: 'urgency', width: 10 }]
        data.items?.forEach((r: any) => ws.addRow(r))
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'fila_espera.xlsx'; a.click()
    }

    const urgencyColors: Record<string, string> = { urgent: 'bg-red-100 text-red-800', normal: 'bg-gray-100 text-gray-800', low: 'bg-green-100 text-green-800' }
    const statusColors: Record<string, string> = { waiting: 'bg-yellow-100 text-yellow-800', contacted: 'bg-blue-100 text-blue-800', scheduled: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }
    const statusLabels: Record<string, string> = { waiting: 'Aguardando', contacted: 'Contatado', scheduled: 'Agendado', cancelled: 'Cancelado' }
    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold">Fila de Espera</h1><p className="text-muted-foreground">Gestão de pacientes aguardando vaga</p></div>
                <div className="flex gap-2">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="">Todos</option><option value="waiting">Aguardando</option><option value="contacted">Contatado</option><option value="scheduled">Agendado</option></select>
                    <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
                    <Button onClick={() => { setEditingItem(null); setForm({ patient_name: '', patient_phone: '', patient_email: '', therapy_type: '', modality: 'individual', preferred_shift: 'any', urgency: 'normal', notes: '', lead_source: '', responsible_name: '' }); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card><CardHeader className="pb-2"><CardDescription>Na Fila</CardDescription><CardTitle className="text-2xl">{s?.waiting || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Contatados</CardDescription><CardTitle className="text-2xl text-blue-600">{s?.contacted || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Agendados</CardDescription><CardTitle className="text-2xl text-green-600">{s?.scheduled || 0}</CardTitle></CardHeader></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Espera Média</CardDescription><CardTitle className="text-2xl">{s?.avg_wait_days || 0} dias</CardTitle></CardHeader><CardContent><Clock className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardDescription>Conversão</CardDescription><CardTitle className="text-2xl text-primary">{s?.conversion_rate || 0}%</CardTitle></CardHeader></Card>
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Pacientes na Fila</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b"><th className="text-left p-2">Nome</th><th className="text-left p-2">Telefone</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Dias</th><th className="text-left p-2">Urgência</th><th className="text-left p-2">Status</th><th className="text-left p-2">Ações</th></tr></thead>
                                    <tbody>
                                        {data?.items?.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Fila vazia 🎉</td></tr>}
                                        {data?.items?.map((item: any) => {
                                            const notesText = item.notes || ''
                                            const sourceMatch = notesText.match(/\[Origem: (.*?)\]/)
                                            const respMatch = notesText.match(/\[Responsável: (.*?)\]/)
                                            const leadSource = sourceMatch ? sourceMatch[1] : null
                                            const responsibleName = respMatch ? respMatch[1] : null
                                            const cleanNotes = notesText.replace(/\[Origem:.*?\]\s*|\[Responsável:.*?\]\s*/g, '')

                                            return (
                                                <tr key={item.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-2">
                                                        <div className="font-semibold text-gray-800">{item.patient_name}</div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {responsibleName && responsibleName !== 'N/A' && (
                                                                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold border border-purple-200">
                                                                    👤 Resp: {responsibleName}
                                                                </span>
                                                            )}
                                                            {leadSource && (
                                                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold border border-indigo-200">
                                                                    🎯 Lead: {leadSource}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {cleanNotes && (
                                                            <div className="text-[11px] text-gray-400 mt-1 italic max-w-xs truncate" title={cleanNotes}>
                                                                {cleanNotes}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2">{item.patient_phone ? <a href={`https://wa.me/55${item.patient_phone.replace(/\D/g,'')}`} target="_blank" rel="noopener" className="text-green-600 hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{item.patient_phone}</a> : '-'}</td>
                                                    <td className="p-2">{item.therapy_type || '-'}</td>
                                                    <td className="p-2 font-bold">{item.wait_days}d</td>
                                                    <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${urgencyColors[item.urgency] || urgencyColors.normal}`}>{item.urgency}</span></td>
                                                    <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${statusColors[item.status] || ''}`}>{statusLabels[item.status] || item.status}</span></td>
                                                    <td className="p-2 flex gap-1">
                                                        {item.status === 'waiting' && <Button variant="ghost" size="icon" title="Marcar Contatado" onClick={() => updateStatus(item.id, 'contacted')}><Phone className="h-4 w-4 text-blue-500" /></Button>}
                                                        {(item.status === 'waiting' || item.status === 'contacted') && <Button variant="ghost" size="icon" title="Marcar Agendado" onClick={() => updateStatus(item.id, 'scheduled')}><CheckCircle className="h-4 w-4 text-green-500" /></Button>}
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar à Fila de Espera</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Nome</Label><Input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Telefone</Label><Input value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} /></div>
                            <div><Label>Email</Label><Input type="email" value={form.patient_email} onChange={e => setForm({ ...form, patient_email: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Tipo Terapia</Label><Input value={form.therapy_type} onChange={e => setForm({ ...form, therapy_type: e.target.value })} placeholder="Ex: Psicologia" /></div>
                            <div><Label>Modalidade</Label><select value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="individual">Individual</option><option value="casal">Casal</option><option value="familia">Família</option><option value="grupo">Grupo</option></select></div>
                            <div><Label>Urgência</Label><select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="low">Baixa</option><option value="normal">Normal</option><option value="urgent">Urgente</option></select></div>
                        </div>
                        <div><Label>Turno Preferido</Label><select value={form.preferred_shift} onChange={e => setForm({ ...form, preferred_shift: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="any">Qualquer</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="evening">Noite</option></select></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Como conheceu? (Origem do Lead)</Label>
                                <select 
                                    value={form.lead_source} 
                                    onChange={e => setForm({ ...form, lead_source: e.target.value })} 
                                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">Não informado</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Google">Google</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Indicação Médica">Indicação Médica</option>
                                    <option value="Indicação Paciente">Indicação Paciente</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <Label>Responsável pelo Paciente</Label>
                                <Input 
                                    value={form.responsible_name} 
                                    onChange={e => setForm({ ...form, responsible_name: e.target.value })} 
                                    placeholder="Caso seja menor de idade"
                                />
                            </div>
                        </div>
                        <div><Label>Observações</Label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded px-3 py-2 text-sm h-20" /></div>
                        <Button onClick={handleSave} className="w-full">Adicionar à Fila</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
