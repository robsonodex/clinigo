'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, Users, Plus, Trash2, Edit, Phone, CheckCircle, FileSpreadsheet, X, DollarSign, Briefcase, Layers } from 'lucide-react'
import { toast } from 'sonner'

interface TherapyItem { name: string; qty: number }

const emptyForm = {
    patient_name: '', responsible_name: '', patient_phone: '', patient_email: '',
    therapies: [{ name: '', qty: 1 }] as TherapyItem[],
    preferred_shift: 'any', commercial_notes: '',
    financial_contact_date: '', financial_result: '', financial_notes: ''
}

export default function FilaEsperaPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [form, setForm] = useState(emptyForm)
    const [statusFilter, setStatusFilter] = useState('')
    const [activeTab, setActiveTab] = useState<'comercial' | 'financeiro'>('comercial')

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

    const openNew = () => {
        setEditingItem(null)
        setForm(emptyForm)
        setActiveTab('comercial')
        setDialogOpen(true)
    }

    const openEdit = (item: any) => {
        setEditingItem(item)
        const therapies = item.therapies && Array.isArray(item.therapies) && item.therapies.length > 0
            ? item.therapies
            : item.therapy_type ? [{ name: item.therapy_type, qty: 1 }] : [{ name: '', qty: 1 }]
        setForm({
            patient_name: item.patient_name || '',
            responsible_name: item.responsible_name || '',
            patient_phone: item.patient_phone || '',
            patient_email: item.patient_email || '',
            therapies,
            preferred_shift: item.preferred_shift || 'any',
            commercial_notes: item.commercial_notes || item.notes || '',
            financial_contact_date: item.financial_contact_date || '',
            financial_result: item.financial_result || '',
            financial_notes: item.financial_notes || '',
        })
        setActiveTab('comercial')
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.patient_name.trim()) { toast.error('Nome é obrigatório'); return }
        try {
            const therapyType = form.therapies.filter(t => t.name).map(t => t.name).join(', ')
            const payload: any = {
                patient_name: form.patient_name,
                responsible_name: form.responsible_name,
                patient_phone: form.patient_phone,
                patient_email: form.patient_email,
                therapy_type: therapyType,
                therapies: form.therapies.filter(t => t.name),
                preferred_shift: form.preferred_shift,
                commercial_notes: form.commercial_notes,
                financial_contact_date: form.financial_contact_date || null,
                financial_result: form.financial_result || null,
                financial_notes: form.financial_notes,
            }

            if (editingItem) {
                payload.id = editingItem.id
                const res = await fetch('/api/waiting-list', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                if (res.ok) { toast.success('Atualizado!'); setDialogOpen(false); fetchData() }
                else { const err = await res.json(); toast.error(err.error || 'Erro') }
            } else {
                const res = await fetch('/api/waiting-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                if (res.ok) { toast.success('Adicionado à fila!'); setDialogOpen(false); fetchData() }
                else { const err = await res.json(); toast.error(err.error || 'Erro') }
            }
        } catch (e) { toast.error('Erro ao salvar') }
    }

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/waiting-list', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
            if (res.ok) { toast.success('Status atualizado!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este item da fila? Esta ação não pode ser desfeita.')) return
        try {
            const res = await fetch('/api/waiting-list', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
            if (res.ok) { toast.success('Removido!'); fetchData() }
        } catch (e) { toast.error('Erro') }
    }

    const handleRemoveDuplicates = async () => {
        if (!data?.items?.length) { toast.error('Nenhum item na fila'); return }

        // Agrupar por patient_name normalizado
        const groups: Record<string, any[]> = {}
        for (const item of data.items) {
            const key = (item.patient_name || '').trim().toLowerCase()
            if (!groups[key]) groups[key] = []
            groups[key].push(item)
        }

        // Identificar duplicados (manter o mais antigo por created_at)
        const idsToDelete: string[] = []
        for (const items of Object.values(groups)) {
            if (items.length > 1) {
                items.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                for (let i = 1; i < items.length; i++) {
                    idsToDelete.push(items[i].id)
                }
            }
        }

        if (idsToDelete.length === 0) {
            toast.info('Nenhuma duplicata encontrada! Os dados estão limpos. 🎉')
            return
        }

        const uniqueCount = Object.keys(groups).length
        if (!confirm(
            `⚠️ ATENÇÃO: Foram encontradas ${idsToDelete.length} duplicatas.\n\n` +
            `Total atual: ${data.items.length} registros\n` +
            `Após limpeza: ${uniqueCount} registros únicos\n\n` +
            `Será mantido o registro mais antigo de cada paciente.\n` +
            `Esta ação não pode ser desfeita. Confirmar?`
        )) return

        let deleted = 0
        let errors = 0
        toast.loading('Removendo duplicatas...', { id: 'dedup' })

        for (const id of idsToDelete) {
            try {
                const res = await fetch('/api/waiting-list', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                })
                if (res.ok) deleted++
                else errors++
            } catch { errors++ }
        }

        toast.dismiss('dedup')
        if (errors > 0) {
            toast.warning(`${deleted} duplicatas removidas, ${errors} erros.`)
        } else {
            toast.success(`✅ ${deleted} duplicatas removidas com sucesso!`)
        }
        fetchData()
    }

    const handleDeleteAll = async () => {
        const totalItems = data?.items?.length || 0
        if (totalItems === 0) {
            toast.info('A fila de espera já está vazia.')
            return
        }

        if (!confirm(
            `⚠️ ATENÇÃO: Todos os ${totalItems} itens da Fila de Espera serão excluídos permanentemente.\n\n` +
            `Esta ação NÃO pode ser desfeita. Deseja realmente limpar a fila para reimportar os dados?`
        )) return

        try {
            toast.loading('Limpando fila de espera...', { id: 'clear-all' })
            const res = await fetch('/api/waiting-list', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true })
            })
            toast.dismiss('clear-all')
            if (res.ok) {
                toast.success(`✅ Todos os ${totalItems} itens foram excluídos da fila!`)
                fetchData()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao limpar a fila de espera')
            }
        } catch (e) {
            toast.dismiss('clear-all')
            toast.error('Erro ao conectar ao servidor para limpar a fila')
        }
    }

    const addTherapy = () => setForm(prev => ({ ...prev, therapies: [...prev.therapies, { name: '', qty: 1 }] }))
    const removeTherapy = (idx: number) => setForm(prev => ({ ...prev, therapies: prev.therapies.filter((_, i) => i !== idx) }))
    const updateTherapy = (idx: number, field: 'name' | 'qty', value: string | number) => {
        setForm(prev => ({ ...prev, therapies: prev.therapies.map((t, i) => i === idx ? { ...t, [field]: value } : t) }))
    }

    const exportExcel = async () => {
        if (!data) return
        const ExcelJS = (await import('exceljs')).default
        const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Fila de Espera')
        ws.columns = [
            { header: 'Nome', key: 'patient_name', width: 25 },
            { header: 'Responsável', key: 'responsible_name', width: 25 },
            { header: 'Telefone', key: 'patient_phone', width: 18 },
            { header: 'Terapias', key: 'therapies_text', width: 30 },
            { header: 'Turno', key: 'preferred_shift', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Dias', key: 'wait_days', width: 8 },
            { header: 'Resultado Financeiro', key: 'financial_result', width: 20 },
            { header: 'Data Contato', key: 'financial_contact_date', width: 15 },
        ]
        data.items?.forEach((r: any) => {
            const therapies = r.therapies && Array.isArray(r.therapies) ? r.therapies.map((t: any) => `${t.name} (${t.qty}x)`).join(', ') : r.therapy_type || ''
            ws.addRow({ ...r, therapies_text: therapies })
        })
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'fila_espera.xlsx'; a.click()
    }

    const shiftLabels: Record<string, string> = { any: 'Qualquer', morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite' }
    const statusColors: Record<string, string> = { waiting: 'bg-yellow-100 text-yellow-800', contacted: 'bg-blue-100 text-blue-800', scheduled: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }
    const statusLabels: Record<string, string> = { waiting: 'Aguardando', contacted: 'Contatado', scheduled: 'Agendado', cancelled: 'Cancelado' }
    const financialLabels: Record<string, string> = { converted: 'Convertido', waiting_info: 'Aguardando Informação', not_converted: 'Não Convertido' }
    const financialColors: Record<string, string> = { converted: 'bg-emerald-100 text-emerald-800', waiting_info: 'bg-amber-100 text-amber-800', not_converted: 'bg-red-100 text-red-800' }
    const s = data?.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Fila de Espera</h1>
                    <p className="text-muted-foreground">Gestão de pacientes aguardando vaga</p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer min-h-[44px]" style={{ fontSize: '16px' }}>
                        <option value="">Todos</option>
                        <option value="waiting">Aguardando</option>
                        <option value="contacted">Contatado</option>
                        <option value="scheduled">Agendado</option>
                    </select>
                    <Button variant="outline" onClick={handleRemoveDuplicates}
                        className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-white hover:bg-amber-50 border-amber-200 shadow-sm rounded-xl px-4 font-semibold text-amber-700 dark:text-amber-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-amber-800" title="Detectar e remover registros duplicados">
                        <Layers className="w-4 h-4 text-amber-600" /><span className="hidden sm:inline">Duplicados</span>
                    </Button>
                    <Button variant="outline" onClick={exportExcel}
                        className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-white hover:bg-slate-50 border-slate-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span className="hidden sm:inline">Excel</span>
                    </Button>
                    {data?.items?.length > 0 && (
                        <Button variant="outline" onClick={handleDeleteAll}
                            className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-white hover:bg-red-50 border-red-200 shadow-sm rounded-xl px-4 font-semibold text-red-600 dark:text-red-400 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-red-800" title="Excluir todos os registros da fila de espera">
                            <Trash2 className="w-4 h-4 text-red-500" /><span className="hidden sm:inline">Excluir Todos</span>
                        </Button>
                    )}
                    <Button onClick={openNew}
                        className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold border-0">
                        <Plus className="w-4 h-4" /><span>Adicionar</span>
                    </Button>
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
                                    <thead><tr className="border-b">
                                        <th className="text-left p-2">Nome</th>
                                        <th className="text-left p-2 hidden sm:table-cell">Telefone</th>
                                        <th className="text-left p-2 hidden md:table-cell">Terapias</th>
                                        <th className="text-left p-2">Dias</th>
                                        <th className="text-left p-2 hidden sm:table-cell">Financeiro</th>
                                        <th className="text-left p-2">Status</th>
                                        <th className="text-left p-2">Ações</th>
                                    </tr></thead>
                                    <tbody>
                                        {data?.items?.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Fila vazia 🎉</td></tr>}
                                        {data?.items?.map((item: any) => {
                                            const therapies = item.therapies && Array.isArray(item.therapies) && item.therapies.length > 0
                                                ? item.therapies : (item.therapy_type ? [{ name: item.therapy_type, qty: 1 }] : [])
                                            return (
                                                <tr key={item.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-2">
                                                        <div className="font-semibold text-gray-800 dark:text-gray-200">{item.patient_name}</div>
                                                        {item.responsible_name && (
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded font-semibold border border-indigo-200 dark:border-indigo-800 mt-0.5 inline-block">
                                                                👤 Resp: {item.responsible_name}
                                                            </span>
                                                        )}
                                                        {(item.commercial_notes) && (
                                                            <div className="text-[11px] text-gray-400 mt-1 italic max-w-xs truncate" title={item.commercial_notes}>{item.commercial_notes}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        {item.patient_phone ? <a href={`https://wa.me/55${item.patient_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="text-green-600 hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{item.patient_phone}</a> : '-'}
                                                    </td>
                                                    <td className="p-2 hidden md:table-cell">
                                                        {therapies.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {therapies.map((t: any, i: number) => (
                                                                    <span key={i} className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 px-1.5 py-0.5 rounded font-semibold border border-teal-200 dark:border-teal-800">
                                                                        {t.name} {t.qty > 1 ? `(${t.qty}x)` : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="p-2 font-bold">{item.wait_days}d</td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        {item.financial_result ? (
                                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${financialColors[item.financial_result] || 'bg-gray-100 text-gray-700'}`}>
                                                                {financialLabels[item.financial_result] || item.financial_result}
                                                            </span>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>
                                                    <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${statusColors[item.status] || ''}`}>{statusLabels[item.status] || item.status}</span></td>
                                                    <td className="p-2 flex gap-1">
                                                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(item)}><Edit className="h-4 w-4 text-blue-500" /></Button>
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

            {/* Modal Adicionar/Editar */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar' : 'Adicionar à'} Fila de Espera</DialogTitle>
                    </DialogHeader>

                    {/* Abas Comercial / Financeiro */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        <button type="button" onClick={() => setActiveTab('comercial')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'comercial' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Briefcase className="w-3.5 h-3.5" /> Comercial
                        </button>
                        <button type="button" onClick={() => setActiveTab('financeiro')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'financeiro' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                            <DollarSign className="w-3.5 h-3.5" /> Financeiro
                        </button>
                    </div>

                    {activeTab === 'comercial' && (
                        <div className="space-y-4">
                            <div><Label>Nome do Paciente *</Label><Input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="Nome completo" style={{ fontSize: '16px' }} /></div>
                            <div><Label>Nome do Responsável</Label><Input value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} placeholder="Caso seja menor de idade" style={{ fontSize: '16px' }} /></div>
                            <div><Label>Telefone</Label><Input value={form.patient_phone} onChange={e => setForm({ ...form, patient_phone: e.target.value })} placeholder="(00) 00000-0000" style={{ fontSize: '16px' }} /></div>

                            {/* Terapias Dinâmicas */}
                            <div className="space-y-2">
                                <Label>Terapias e Quantidade</Label>
                                {form.therapies.map((t, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <Input className="flex-1" placeholder="Ex: Fonoaudiologia" value={t.name} onChange={e => updateTherapy(idx, 'name', e.target.value)} style={{ fontSize: '16px' }} />
                                        <Input className="w-20" type="number" min={1} value={t.qty} onChange={e => updateTherapy(idx, 'qty', parseInt(e.target.value) || 1)} style={{ fontSize: '16px' }} />
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">qtd.</span>
                                        {form.therapies.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeTherapy(idx)}>
                                                <X className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={addTherapy} className="text-xs gap-1 h-8 rounded-lg">
                                    <Plus className="h-3 w-3" /> Adicionar Terapia
                                </Button>
                            </div>

                            <div>
                                <Label>Turno Preferido</Label>
                                <select value={form.preferred_shift} onChange={e => setForm({ ...form, preferred_shift: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700" style={{ fontSize: '16px' }}>
                                    <option value="any">Qualquer</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="evening">Noite</option>
                                </select>
                            </div>
                            <div><Label>Observação Comercial</Label><textarea value={form.commercial_notes} onChange={e => setForm({ ...form, commercial_notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20 dark:bg-slate-900 dark:border-slate-700" style={{ fontSize: '16px' }} placeholder="Observações do comercial..." /></div>
                        </div>
                    )}

                    {activeTab === 'financeiro' && (
                        <div className="space-y-4">
                            <div><Label>Data do Contato</Label><Input type="date" value={form.financial_contact_date} onChange={e => setForm({ ...form, financial_contact_date: e.target.value })} style={{ fontSize: '16px' }} /></div>
                            <div>
                                <Label>Resultado</Label>
                                <select value={form.financial_result} onChange={e => setForm({ ...form, financial_result: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700" style={{ fontSize: '16px' }}>
                                    <option value="">Sem resultado</option>
                                    <option value="converted">✅ Convertido</option>
                                    <option value="waiting_info">⏳ Aguardando Informação</option>
                                    <option value="not_converted">❌ Não Convertido</option>
                                </select>
                            </div>
                            <div><Label>Observação Financeira</Label><textarea value={form.financial_notes} onChange={e => setForm({ ...form, financial_notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20 dark:bg-slate-900 dark:border-slate-700" style={{ fontSize: '16px' }} placeholder="Observações do financeiro..." /></div>
                        </div>
                    )}

                    <Button onClick={handleSave}
                        className="w-full flex gap-1.5 h-11 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold border-0 justify-center items-center min-h-[44px]">
                        <span>{editingItem ? 'Salvar Alterações' : 'Adicionar à Fila'}</span>
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
