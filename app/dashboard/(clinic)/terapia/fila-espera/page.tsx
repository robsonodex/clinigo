'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, Users, Plus, Trash2, Edit, Phone, CheckCircle, FileSpreadsheet, X, DollarSign, Briefcase, Upload } from 'lucide-react'
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

    const [importOpen, setImportOpen] = useState(false)
    const [importing, setImporting] = useState(false)
    const [previewItems, setPreviewItems] = useState<any[]>([])
    const [importError, setImportError] = useState<string | null>(null)

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

    const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportError(null)
        setPreviewItems([])

        try {
            const XLSX = await import('xlsx')
            const reader = new FileReader()

            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result
                    const wb = XLSX.read(bstr, { type: 'binary' })
                    const wsname = wb.SheetNames[0]
                    const ws = wb.Sheets[wsname]
                    const rawData = XLSX.utils.sheet_to_json(ws)

                    if (!Array.isArray(rawData) || rawData.length === 0) {
                        setImportError('Nenhum dado encontrado na planilha modelo.')
                        return
                    }

                    const mapped = rawData.map((row: any) => {
                        const keys = Object.keys(row)
                        const getVal = (possibleKeys: string[]) => {
                            const key = keys.find(k => {
                                const normalized = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                                return possibleKeys.some(pk => normalized.includes(pk) || pk.includes(normalized))
                            })
                            return key ? row[key] : null
                        }

                        // Identifica o nome do paciente de forma inteligente
                        // Se houver uma coluna "criança", assume-se que é o paciente principal.
                        let patient_name = getVal(['crianca', 'filho', 'nome da crianca'])
                        let responsible_name = null

                        if (patient_name) {
                            // Se for criança, o contato ou mãe é o responsável
                            responsible_name = getVal(['contato', 'responsavel', 'responsable', 'mae', 'pai'])
                        } else {
                            // Se não tem criança na linha, busca por termos padrão
                            patient_name = getVal(['nome', 'paciente', 'patient', 'lead'])
                            if (patient_name) {
                                responsible_name = getVal(['responsavel', 'responsable', 'mae', 'pai'])
                            } else {
                                // Fallback: se não tiver criança nem paciente mapeado, mas tiver contato preenchido (ex: adultos na coluna Contato),
                                // o próprio contato na linha será o paciente.
                                const contatoVal = getVal(['contato'])
                                if (contatoVal) {
                                    patient_name = contatoVal
                                    responsible_name = null
                                }
                            }
                        }

                        if (!patient_name) return null

                        const phoneVal = getVal(['telefone', 'celular', 'whatsapp', 'fone', 'phone'])
                        const patient_phone = phoneVal ? String(phoneVal).replace(/\D/g, '') : ''

                        const preferredShiftVal = getVal(['turno', 'shift', 'periodo']) || 'any'
                        let preferred_shift = 'any'
                        if (typeof preferredShiftVal === 'string') {
                            const cleanShift = preferredShiftVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                            if (cleanShift.includes('manh') || cleanShift.includes('morn')) preferred_shift = 'morning'
                            else if (cleanShift.includes('tard') || cleanShift.includes('after')) preferred_shift = 'afternoon'
                            else if (cleanShift.includes('noit') || cleanShift.includes('even') || cleanShift.includes('night')) preferred_shift = 'evening'
                        }

                        const therapyTypeVal = getVal(['terapia', 'especialidade', 'therapy', 'therapies']) || ''
                        let therapies: any[] = []
                        if (therapyTypeVal) {
                            const types = String(therapyTypeVal).split(/[,;]/).map(t => t.trim()).filter(Boolean)
                            therapies = types.map(t => ({ name: t, qty: 1 }))
                        }

                        // Se houver parentesco no formato dele (ex: "Mãe"), concatena na observação
                        const parentescoVal = getVal(['parentesco', 'relacao'])
                        const obsOriginal = getVal(['observacao', 'observacoes', 'nota', 'notas', 'notes', 'comercial', 'historico'])
                        let commercial_notes = obsOriginal ? String(obsOriginal).trim() : null
                        if (parentescoVal) {
                            const parentStr = `Parentesco do Responsável: ${parentescoVal}`
                            commercial_notes = commercial_notes ? `${parentStr} | ${commercial_notes}` : parentStr
                        }

                        return {
                            patient_name: String(patient_name).trim(),
                            responsible_name: responsible_name ? String(responsible_name).trim() : null,
                            patient_phone,
                            patient_email: getVal(['email', 'mail']) ? String(getVal(['email', 'mail'])).trim() : null,
                            therapy_type: therapyTypeVal ? String(therapyTypeVal).trim() : null,
                            therapies,
                            preferred_shift,
                            commercial_notes,
                        }
                    }).filter(Boolean)

                    if (mapped.length === 0) {
                        setImportError('Nenhum contato válido encontrado. Certifique-se de que a coluna "Nome do Paciente *" esteja preenchida.')
                        return
                    }

                    setPreviewItems(mapped)
                } catch (err: any) {
                    console.error(err)
                    setImportError('Erro ao ler a estrutura do arquivo. Certifique-se de ser um arquivo .xlsx ou .csv válido.')
                }
            }

            reader.readAsBinaryString(file)
        } catch (err) {
            console.error(err)
            setImportError('Erro ao carregar analisador de planilhas.')
        }
    }

    const handleConfirmImport = async () => {
        if (previewItems.length === 0) return
        setImporting(true)
        try {
            const res = await fetch('/api/waiting-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(previewItems)
            })
            if (res.ok) {
                toast.success(`${previewItems.length} contatos importados com sucesso!`)
                setImportOpen(false)
                setPreviewItems([])
                fetchData()
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao processar importação.')
            }
        } catch (e) {
            toast.error('Erro na requisição de importação.')
        } finally {
            setImporting(false)
        }
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
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer" style={{ fontSize: '16px' }}>
                        <option value="">Todos</option>
                        <option value="waiting">Aguardando</option>
                        <option value="contacted">Contatado</option>
                        <option value="scheduled">Agendado</option>
                    </select>
                    <Button variant="outline" onClick={exportExcel}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 font-semibold">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span>Excel</span>
                    </Button>
                    <Button variant="outline" onClick={() => { setImportOpen(true); setPreviewItems([]); setImportError(null) }}
                        className="flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 min-h-[40px] font-semibold">
                        <Upload className="w-4 h-4 text-blue-600" /><span>Importar</span>
                    </Button>
                    <Button onClick={openNew}
                        className="flex gap-1.5 h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl px-5 font-semibold border-0 font-semibold">
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

            {/* Modal de Importação */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto w-full p-4 md:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Upload className="w-5 h-5 text-blue-650" />
                            Importar Contatos para Fila de Espera
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 my-2 text-sm text-slate-600 dark:text-slate-400">
                        <p>
                            Importe seus contatos/leads diretamente de uma planilha Excel ou CSV. Os contatos serão inseridos automaticamente na fila de espera com status <strong>Aguardando</strong>.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-6 h-6 text-teal-600 shrink-0" />
                                <div>
                                    <div className="font-semibold text-slate-700 dark:text-slate-300">Planilha de Importação</div>
                                    <div className="text-xs">Use o modelo exato para evitar erros.</div>
                                </div>
                            </div>
                            <a href="/modelo_importacao_fila.xlsx" download="modelo_importacao_fila.xlsx"
                                className="w-full md:w-auto h-10 px-4 flex items-center justify-center gap-1.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer min-h-[44px] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                Baixar Planilha Modelo
                            </a>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative flex flex-col items-center justify-center min-h-[120px]">
                            <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                onChange={handleImportFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="font-semibold block text-slate-700 dark:text-slate-300">Selecione ou arraste a planilha</span>
                            <span className="text-xs text-slate-400 block mt-1">Suporta .xlsx, .xls ou .csv</span>
                        </div>

                        {importError && (
                            <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-semibold">
                                ⚠️ {importError}
                            </div>
                        )}

                        {previewItems.length > 0 && (
                            <div className="space-y-3">
                                <div className="text-emerald-755 dark:text-emerald-400 font-semibold flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                                    Pronto! Detectamos {previewItems.length} contato(s) para importação.
                                </div>

                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <div className="max-h-[180px] overflow-y-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-bold sticky top-0 text-slate-700 dark:text-slate-300">
                                                    <th className="p-2">Paciente</th>
                                                    <th className="p-2">Responsável</th>
                                                    <th className="p-2">Telefone</th>
                                                    <th className="p-2">Turno</th>
                                                    <th className="p-2">Terapias</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewItems.slice(0, 10).map((item, idx) => (
                                                    <tr key={idx} className="border-b border-slate-200 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                                        <td className="p-2 truncate max-w-[120px] font-semibold text-slate-800 dark:text-slate-200">{item.patient_name}</td>
                                                        <td className="p-2 truncate max-w-[100px]">{item.responsible_name || '—'}</td>
                                                        <td className="p-2 whitespace-nowrap">{item.patient_phone || '—'}</td>
                                                        <td className="p-2">{shiftLabels[item.preferred_shift] || item.preferred_shift}</td>
                                                        <td className="p-2 truncate max-w-[120px]" title={item.therapy_type}>{item.therapy_type || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {previewItems.length > 10 && (
                                        <div className="p-2 bg-slate-50 dark:bg-slate-900/50 text-[10px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-800">
                                            Exibindo os primeiros 10 de {previewItems.length} contatos.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2.5 mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex-col sm:flex-row">
                        <Button type="button" variant="outline" onClick={() => { setImportOpen(false); setPreviewItems([]); setImportError(null) }}
                            className="flex-1 h-11 text-sm font-semibold rounded-xl min-h-[44px]">
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleConfirmImport} disabled={previewItems.length === 0 || importing}
                            className="flex-1 h-11 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-semibold rounded-xl border-0 justify-center items-center min-h-[44px]">
                            {importing ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Importando...
                                </div>
                            ) : (
                                `Importar ${previewItems.length} Contato(s)`
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
