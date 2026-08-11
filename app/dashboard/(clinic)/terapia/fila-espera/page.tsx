'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Clock, Users, Plus, Trash2, Edit, Phone, CheckCircle, FileSpreadsheet, X, DollarSign, Briefcase, Layers, Upload, Download, MessageSquare, Send, History, Search } from 'lucide-react'
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

    // Estados de Importação
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [importRows, setImportRows] = useState<any[]>([])
    const [importFileName, setImportFileName] = useState('')
    const [isProcessingFile, setIsProcessingFile] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Estados de WhatsApp
    const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)
    const [whatsappItem, setWhatsappItem] = useState<any>(null)
    const [whatsappMessage, setWhatsappMessage] = useState('')
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false)
    const [whatsappLogs, setWhatsappLogs] = useState<any[]>([])
    const [loadingLogs, setLoadingLogs] = useState(false)

    // Estados do Modal de Auditoria Geral
    const [auditModalOpen, setAuditModalOpen] = useState(false)
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
    const [auditSearchTerm, setAuditSearchTerm] = useState('')

    const openAuditModal = async () => {
        setAuditModalOpen(true)
        setLoadingAuditLogs(true)
        try {
            const res = await fetch('/api/whatsapp/logs')
            if (res.ok) {
                const result = await res.json()
                setAuditLogs(result.logs || [])
            }
        } catch (e) {
            console.error('Erro ao buscar auditoria de logs:', e)
        } finally {
            setLoadingAuditLogs(false)
        }
    }
 
    // Função de carregar histórico de mensagens
    const fetchWhatsappLogs = async (phone: string) => {
        setLoadingLogs(true)
        try {
            const res = await fetch(`/api/whatsapp/logs?phone=${encodeURIComponent(phone)}`)
            if (res.ok) {
                const result = await res.json()
                setWhatsappLogs(result.logs || [])
            }
        } catch (e) {
            console.error('Erro ao buscar logs de WhatsApp:', e)
        } finally {
            setLoadingLogs(false)
        }
    }
 
    const openWhatsapp = useCallback((item: any) => {
        setWhatsappItem(item)
        const recipientName = item.responsible_name || item.patient_name || ''
        const therapy = item.therapy_type || 'avaliação'
        
        // Mensagem padrão comercial
        const defaultMsg = `Olá ${recipientName}, tudo bem? Me chamo comercial da clínica Espaço Incluir. Vimos que você está na nossa fila de espera para ${therapy}. Gostaríamos de te convidar para conhecer nosso espaço físico! Qual o melhor dia e horário para agendarmos uma conversa? 😊`
        
        setWhatsappMessage(defaultMsg)
        setWhatsappLogs([])
        setWhatsappDialogOpen(true)
        if (item.patient_phone) {
            fetchWhatsappLogs(item.patient_phone)
        }
    }, [])
 
    const handleSendWhatsapp = async () => {
        if (!whatsappItem?.patient_phone) {
            toast.error('Paciente não possui telefone cadastrado')
            return
        }
        if (!whatsappMessage.trim()) {
            toast.error('A mensagem não pode estar vazia')
            return
        }
 
        setSendingWhatsapp(true)
        try {
            // Disparar WhatsApp via API
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: whatsappItem.patient_phone,
                    message: whatsappMessage,
                    sector: 'default', // comercial
                    trigger_source: 'waiting-list',
                    waiting_list_id: whatsappItem.id
                })
            })
 
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao enviar mensagem')
            }
 
            toast.success('Mensagem enviada com sucesso!')
 
            // Registrar log no histórico do paciente (fila de espera -> commercial_notes)
            const dateStr = new Date().toLocaleString('pt-BR')
            const logAppend = `\n[${dateStr} - WhatsApp]: "${whatsappMessage}"`
            const newNotes = whatsappItem.commercial_notes 
                ? `${whatsappItem.commercial_notes}${logAppend}`
                : logAppend
 
            // Atualizar no banco
            await fetch('/api/waiting-list', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: whatsappItem.id,
                    commercial_notes: newNotes
                })
            })
 
            // Recarregar os dados
            fetchData()
            
            // Recarregar os logs locais no modal
            fetchWhatsappLogs(whatsappItem.patient_phone)
        } catch (e: any) {
            toast.error(e.message || 'Erro ao enviar mensagem por WhatsApp')
        } finally {
            setSendingWhatsapp(false)
        }
    }

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

    // Processar arquivo Excel/CSV selecionado com leitor universal de alta tolerância
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImportFileName(file.name)
        setIsProcessingFile(true)

        try {
            const XLSX = await import('xlsx')
            const buffer = await file.arrayBuffer()
            const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
            
            const firstSheetName = workbook.SheetNames[0]
            if (!firstSheetName) {
                toast.error('Planilha vazia ou sem abas válidas.')
                setIsProcessingFile(false)
                return
            }

            const worksheet = workbook.Sheets[firstSheetName]
            // Converter para matriz de dados brutos (linhas x colunas)
            const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
            
            if (!rawMatrix || rawMatrix.length === 0) {
                toast.error('Nenhum dado encontrado na planilha.')
                setIsProcessingFile(false)
                return
            }

            // Função auxiliar de limpeza e normalização
            const clean = (v: any) => String(v ?? '').trim()
            const norm = (v: any) => clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

            // 1. Encontrar a linha do cabeçalho procurando por termos conhecidos nas primeiras 15 linhas
            let headerRowIndex = -1
            let nameColIdx = -1
            let respColIdx = -1
            let phoneColIdx = -1
            let emailColIdx = -1
            let therapyColIdx = -1
            let shiftColIdx = -1
            let notesColIdx = -1

            const keywordsName = ['nome', 'paciente', 'crianca', 'aluno', 'cliente', 'lead', 'atendido']
            const keywordsResp = ['responsavel', 'mae', 'pai', 'tutor', 'contato responsavel', 'nome responsavel']
            const keywordsPhone = ['telefone', 'celular', 'fone', 'whatsapp', 'tel', 'contato', 'numero']
            const keywordsEmail = ['email', 'e-mail']
            const keywordsTherapy = ['terapia', 'terapias', 'especialidade', 'tratamento', 'servico', 'queixa']
            const keywordsShift = ['turno', 'horario', 'periodo', 'preferencia']
            const keywordsNotes = ['obs', 'observacao', 'observacoes', 'notas', 'historico', 'comentario']

            for (let r = 0; r < Math.min(rawMatrix.length, 15); r++) {
                const row = rawMatrix[r]
                if (!Array.isArray(row)) continue

                let matchCount = 0
                for (let c = 0; c < row.length; c++) {
                    const cellNorm = norm(row[c])
                    if (!cellNorm) continue

                    if (keywordsName.some(k => cellNorm.includes(k))) matchCount++
                    if (keywordsPhone.some(k => cellNorm.includes(k))) matchCount++
                    if (keywordsTherapy.some(k => cellNorm.includes(k))) matchCount++
                }

                if (matchCount >= 1) {
                    headerRowIndex = r
                    // Mapear índices das colunas a partir deste cabeçalho
                    row.forEach((cellVal: any, colIdx: number) => {
                        const cellNorm = norm(cellVal)
                        if (!cellNorm) return

                        if (nameColIdx === -1 && keywordsName.some(k => cellNorm.includes(k))) nameColIdx = colIdx
                        else if (respColIdx === -1 && keywordsResp.some(k => cellNorm.includes(k))) respColIdx = colIdx
                        else if (phoneColIdx === -1 && keywordsPhone.some(k => cellNorm.includes(k))) phoneColIdx = colIdx
                        else if (emailColIdx === -1 && keywordsEmail.some(k => cellNorm.includes(k))) emailColIdx = colIdx
                        else if (therapyColIdx === -1 && keywordsTherapy.some(k => cellNorm.includes(k))) therapyColIdx = colIdx
                        else if (shiftColIdx === -1 && keywordsShift.some(k => cellNorm.includes(k))) shiftColIdx = colIdx
                        else if (notesColIdx === -1 && keywordsNotes.some(k => cellNorm.includes(k))) notesColIdx = colIdx
                    })
                    break
                }
            }

            // Fallback: se nenhuma linha pareceu cabeçalho, assumir que a linha 0 tem o cabeçalho ou dados brutos
            if (headerRowIndex === -1) {
                headerRowIndex = 0
                nameColIdx = 0
                respColIdx = 1
                phoneColIdx = 2
                emailColIdx = 3
                therapyColIdx = 4
                shiftColIdx = 5
                notesColIdx = 6
            } else if (nameColIdx === -1) {
                // Se achou linha de cabeçalho mas não achou coluna exata de nome, pega a primeira coluna com dados
                nameColIdx = 0
            }

            // Extract rows
            const extractedRows: any[] = []
            const startRow = headerRowIndex + 1

            for (let r = startRow; r < rawMatrix.length; r++) {
                const row = rawMatrix[r]
                if (!Array.isArray(row) || row.length === 0) continue

                const patientName = clean(row[nameColIdx])
                // Ignorar linhas vazias ou que repetem o próprio cabeçalho
                if (!patientName || keywordsName.some(k => norm(patientName) === k)) continue

                const responsibleName = respColIdx >= 0 ? clean(row[respColIdx]) : ''
                const phone = phoneColIdx >= 0 ? clean(row[phoneColIdx]) : ''
                const email = emailColIdx >= 0 ? clean(row[emailColIdx]) : ''
                const therapyType = therapyColIdx >= 0 ? clean(row[therapyColIdx]) : ''
                const shift = shiftColIdx >= 0 ? clean(row[shiftColIdx]) : 'any'
                const notes = notesColIdx >= 0 ? clean(row[notesColIdx]) : ''

                extractedRows.push({
                    patient_name: patientName,
                    responsible_name: responsibleName,
                    patient_phone: phone,
                    patient_email: email,
                    therapy_type: therapyType,
                    preferred_shift: shift || 'any',
                    commercial_notes: notes,
                })
            }

            if (extractedRows.length === 0) {
                toast.error('Nenhum registro de paciente encontrado na planilha. Verifique se o arquivo tem dados nas colunas.')
            } else {
                setImportRows(extractedRows)
                toast.success(`✅ ${extractedRows.length} registros reconhecidos e prontos para importação!`)
            }
        } catch (err: any) {
            console.error('Erro ao ler planilha:', err)
            toast.error('Erro ao ler a planilha. Certifique-se de que é um arquivo Excel (.xlsx, .xls) ou CSV válido.')
        } finally {
            setIsProcessingFile(false)
        }
    }

    // Gerar e baixar planilha modelo Excel
    const handleDownloadTemplate = async () => {
        try {
            const ExcelJS = (await import('exceljs')).default
            const wb = new ExcelJS.Workbook()
            const ws = wb.addWorksheet('Modelo Importação Fila')
            
            ws.columns = [
                { header: 'Nome', key: 'nome', width: 30 },
                { header: 'Responsavel', key: 'responsavel', width: 25 },
                { header: 'Telefone', key: 'telefone', width: 18 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Terapias', key: 'terapias', width: 30 },
                { header: 'Turno', key: 'turno', width: 15 },
                { header: 'Observacao', key: 'observacao', width: 35 },
            ]

            // Linhas de exemplo
            ws.addRow({ nome: 'João da Silva', responsavel: 'Maria da Silva', telefone: '(11) 99999-8888', email: 'joao@email.com', terapias: 'Fonoaudiologia, Psicologia', turno: 'Manhã', observacao: 'Paciente necessita de atendimento matutino' })
            ws.addRow({ nome: 'Lucas Oliveira', responsavel: '', telefone: '(11) 97777-6666', email: '', terapias: 'Fisioterapia', turno: 'Tarde', observacao: 'Urgente' })

            const buffer = await wb.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'modelo_importacao_fila.xlsx'
            a.click()
            toast.success('Modelo de planilha baixado!')
        } catch (e) {
            toast.error('Erro ao gerar planilha modelo')
        }
    }

    // Executar importação em lote para o backend
    // Executar importação em lote para o backend fatiado em lotes de 50 para evitar timeouts
    const handleConfirmImport = async () => {
        if (importRows.length === 0) {
            toast.error('Nenhum dado selecionado para importar.')
            return
        }

        try {
            const batchSize = 50
            let importedCount = 0

            toast.loading(`Iniciando importação de ${importRows.length} registros...`, { id: 'bulk-import' })

            for (let i = 0; i < importRows.length; i += batchSize) {
                const chunk = importRows.slice(i, i + batchSize)
                const progressText = `Importando registros... (${Math.min(i + batchSize, importRows.length)} / ${importRows.length})`
                toast.loading(progressText, { id: 'bulk-import' })

                const res = await fetch('/api/waiting-list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chunk)
                })

                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || `Erro ao importar lote iniciando em ${i + 1}`)
                }

                const result = await res.json()
                importedCount += result.count || chunk.length
            }

            toast.dismiss('bulk-import')
            toast.success(`🎉 ${importedCount} registros importados com sucesso!`)
            setImportModalOpen(false)
            setImportRows([])
            setImportFileName('')
            fetchData()
        } catch (e: any) {
            toast.dismiss('bulk-import')
            toast.error(e.message || 'Erro de conexão ao enviar dados da importação')
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
                    <Button variant="outline" onClick={openAuditModal}
                        className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-white hover:bg-emerald-50 border-emerald-200 shadow-sm rounded-xl px-4 font-semibold text-emerald-700 dark:text-emerald-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-emerald-800" title="Auditoria e Histórico Geral de Mensagens Entregues via WhatsApp">
                        <History className="w-4 h-4 text-emerald-600" /><span className="hidden sm:inline">Auditoria WhatsApp</span>
                    </Button>
                    <Button variant="outline" onClick={handleRemoveDuplicates}
                        className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-white hover:bg-amber-50 border-amber-200 shadow-sm rounded-xl px-4 font-semibold text-amber-700 dark:text-amber-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-amber-800" title="Detectar e remover registros duplicados">
                        <Layers className="w-4 h-4 text-amber-600" /><span className="hidden sm:inline">Duplicados</span>
                    </Button>
                    <Button variant="outline" onClick={() => setImportModalOpen(true)}
                        className="flex gap-1.5 h-10 min-h-[44px] text-sm bg-white hover:bg-blue-50 border-blue-200 shadow-sm rounded-xl px-4 font-semibold text-blue-700 dark:text-blue-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-blue-800" title="Importar pacientes para a Fila de Espera via planilha Excel ou CSV">
                        <Upload className="w-4 h-4 text-blue-600" /><span className="hidden sm:inline">Importar</span>
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
                                                        {item.commercial_notes?.includes('WhatsApp') && (
                                                            <div className="mt-1">
                                                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                                                    WhatsApp Disparado
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        {item.patient_phone ? <button onClick={() => openWhatsapp(item)} className="text-green-600 hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 font-medium min-h-[44px]" title="Enviar WhatsApp pelo sistema"><Phone className="h-3 w-3" /><span style={{ fontSize: '16px' }}>{item.patient_phone}</span></button> : '-'}
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
                                                        <Button variant="ghost" size="icon" title="Enviar WhatsApp pelo sistema" onClick={() => openWhatsapp(item)} className="min-h-[44px] min-w-[44px]"><MessageSquare className="h-4 w-4 text-green-500" /></Button>
                                                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(item)} className="min-h-[44px] min-w-[44px]"><Edit className="h-4 w-4 text-blue-500" /></Button>
                                                        {item.status === 'waiting' && <Button variant="ghost" size="icon" title="Marcar Contatado" onClick={() => updateStatus(item.id, 'contacted')} className="min-h-[44px] min-w-[44px]"><Phone className="h-4 w-4 text-blue-500" /></Button>}
                                                        {(item.status === 'waiting' || item.status === 'contacted') && <Button variant="ghost" size="icon" title="Marcar Agendado" onClick={() => updateStatus(item.id, 'scheduled')} className="min-h-[44px] min-w-[44px]"><CheckCircle className="h-4 w-4 text-green-500" /></Button>}
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="min-h-[44px] min-w-[44px]" title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
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

            {/* Modal de Importação de Planilha Excel/CSV */}
            <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Upload className="w-5 h-5 text-blue-600" /> Importar Planilha para Fila de Espera
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            Selecione um arquivo Excel (.xlsx) ou CSV contendo os dados dos pacientes para cadastrá-los em lote.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Botão Baixar Modelo */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 gap-3">
                            <div className="text-xs text-blue-900 dark:text-blue-200">
                                <span className="font-semibold">Dica:</span> Utilize nosso modelo oficial formatado com as colunas recomendadas (Nome, Responsável, Telefone, Email, Terapias, Turno, Observação).
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}
                                className="shrink-0 text-xs font-semibold gap-1.5 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 dark:bg-slate-900 dark:border-blue-800 min-h-[44px]">
                                <Download className="w-3.5 h-3.5" /> Baixar Modelo Excel
                            </Button>
                        </div>

                        {/* Dropzone de Upload */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept=".xlsx,.xls,.csv" 
                                className="hidden" 
                            />
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600 dark:text-blue-400">
                                <FileSpreadsheet className="w-8 h-8" />
                            </div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {importFileName ? `Arquivo: ${importFileName}` : 'Clique para selecionar a planilha (.xlsx ou .csv)'}
                            </div>
                            <p className="text-xs text-slate-500">
                                Suporta arquivos Excel (.xlsx, .xls) e arquivos CSV
                            </p>
                        </div>

                        {/* Prévia dos Dados */}
                        {isProcessingFile && (
                            <div className="flex items-center justify-center py-6 text-sm text-slate-500 gap-2">
                                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                                Processando e validando planilha...
                            </div>
                        )}

                        {importRows.length > 0 && !isProcessingFile && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Prévia dos Pacientes Prontos ({importRows.length} encontrados)
                                    </h4>
                                    <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                                        ✅ {importRows.length} válidos
                                    </span>
                                </div>

                                <div className="max-h-48 overflow-y-auto border rounded-xl bg-white dark:bg-slate-950 text-xs">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                                            <tr>
                                                <th className="p-2 border-b">#</th>
                                                <th className="p-2 border-b">Nome</th>
                                                <th className="p-2 border-b">Responsável</th>
                                                <th className="p-2 border-b">Telefone</th>
                                                <th className="p-2 border-b">Terapias</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importRows.slice(0, 50).map((row, idx) => (
                                                <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                                                    <td className="p-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                                    <td className="p-2 font-semibold text-slate-800 dark:text-slate-200">{row.patient_name}</td>
                                                    <td className="p-2 text-slate-600 dark:text-slate-400">{row.responsible_name || '—'}</td>
                                                    <td className="p-2 text-slate-600 dark:text-slate-400">{row.patient_phone || '—'}</td>
                                                    <td className="p-2 text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={row.therapy_type}>{row.therapy_type || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {importRows.length > 50 && (
                                    <p className="text-[11px] text-slate-400 text-center italic">
                                        Exibindo as primeiras 50 linhas de {importRows.length} registros.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end pt-3 border-t">
                        <Button type="button" variant="outline" onClick={() => { setImportModalOpen(false); setImportRows([]); setImportFileName(''); }} className="min-h-[44px]">
                            Cancelar
                        </Button>
                        <Button 
                            type="button" 
                            disabled={importRows.length === 0 || isProcessingFile} 
                            onClick={handleConfirmImport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 min-h-[44px]"
                        >
                            Confirmar Importação ({importRows.length})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Disparo de WhatsApp */}
            <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <span className="p-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
                                <MessageSquare className="w-5 h-5" />
                            </span>
                            Enviar WhatsApp para {whatsappItem?.patient_name}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            Envie mensagens personalizadas utilizando os templates comerciais cadastrados ou digitando livremente. O histórico ficará registrado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Selector de Templates */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selecione um Modelo de Mensagem (Comercial)</Label>
                            <select
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'default') {
                                        const recipientName = whatsappItem?.responsible_name || whatsappItem?.patient_name || ''
                                        const therapy = whatsappItem?.therapy_type || 'avaliação'
                                        setWhatsappMessage(`Olá ${recipientName}, tudo bem? Me chamo comercial da clínica Espaço Incluir. Vimos que você está na nossa fila de espera para ${therapy}. Gostaríamos de te convidar para conhecer nosso espaço físico! Qual o melhor dia e horário para agendarmos uma conversa? 😊`)
                                    } else if (val === 'followup') {
                                        const recipientName = whatsappItem?.responsible_name || whatsappItem?.patient_name || ''
                                        const therapy = whatsappItem?.therapy_type || 'avaliação'
                                        setWhatsappMessage(`Olá ${recipientName}, tudo bem? Me chamo comercial da clínica Espaço Incluir. Estou passando para verificar se você ainda teria interesse em iniciar os atendimentos de ${therapy} conosco. Estão surgindo novos horários na nossa agenda! Caso queira agendar, me responda por aqui. Obrigado!`)
                                    } else if (val === 'visit') {
                                        const recipientName = whatsappItem?.responsible_name || whatsappItem?.patient_name || ''
                                        setWhatsappMessage(`Olá ${recipientName}, temos ótimas notícias! Ocorreu uma abertura de vaga em nossa agenda. Gostaria de agendar uma visita comercial ao nosso espaço para alinharmos e iniciarmos as sessões? Ficamos à total disposição. Até breve!`)
                                    } else if (val === 'custom') {
                                        setWhatsappMessage('')
                                    }
                                }}
                                className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 min-h-[44px]"
                                style={{ fontSize: '16px' }}
                            >
                                <option value="default">Modelo 1: Convite para Visita (Padrão)</option>
                                <option value="followup">Modelo 2: Follow-up de Interesse</option>
                                <option value="visit">Modelo 3: Abertura de Vaga / Agendamento</option>
                                <option value="custom">Mensagem em Branco / Personalizada</option>
                            </select>
                        </div>

                        {/* Corpo da Mensagem */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corpo da Mensagem</Label>
                            <textarea
                                value={whatsappMessage}
                                onChange={(e) => setWhatsappMessage(e.target.value)}
                                className="w-full border rounded-xl p-3 text-sm h-32 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-900 dark:border-slate-700"
                                style={{ fontSize: '16px' }}
                                placeholder="Digite sua mensagem aqui..."
                            />
                        </div>

                        {/* Informações Auxiliares */}
                        <div className="flex gap-2 items-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Número de Destino:</span>
                            <span>{whatsappItem?.patient_phone}</span>
                            {whatsappItem?.responsible_name && (
                                <>
                                    <span className="mx-1">•</span>
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Responsável:</span>
                                    <span>{whatsappItem.responsible_name}</span>
                                </>
                            )}
                        </div>

                        {/* Histórico Local de Mensagens */}
                        <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                Histórico de Envio WhatsApp
                                {loadingLogs && <span className="text-[10px] text-slate-400 animate-pulse normal-case font-normal">buscando...</span>}
                            </Label>
                            
                            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 border rounded-lg p-2 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
                                {whatsappLogs.length === 0 ? (
                                    <div className="text-slate-400 italic text-center py-4">Nenhum envio registrado anteriormente para este número.</div>
                                ) : (
                                    whatsappLogs.map((log) => (
                                        <div key={log.id} className="border-b last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                                                <span>📅 {log.sent_at ? new Date(log.sent_at).toLocaleString('pt-BR') : 'Sem data'}</span>
                                                <span className={`px-1.5 py-0.5 rounded font-mono uppercase text-[9px] ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                    {log.status === 'sent' ? 'Enviado' : 'Falhou'}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-300 italic whitespace-pre-wrap">{log.message_preview}...</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-between pt-3 border-t">
                        {/* Botão de WhatsApp Web como fallback/alternativa */}
                        <a
                            href={`https://wa.me/55${whatsappItem?.patient_phone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold h-11 px-3 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors uppercase tracking-wider"
                        >
                            Abrir WhatsApp Web Externo ↗
                        </a>

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setWhatsappDialogOpen(false)} className="min-h-[44px]">
                                Fechar
                            </Button>
                            <Button
                                type="button"
                                disabled={sendingWhatsapp || !whatsappMessage.trim()}
                                onClick={handleSendWhatsapp}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 min-h-[44px] gap-1.5"
                            >
                                {sendingWhatsapp ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        Disparar WhatsApp
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Auditoria de Envio de WhatsApp */}
            <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <History className="w-5 h-5 text-emerald-600" /> Auditoria de Entregas do WhatsApp
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            Histórico completo de mensagens disparadas pelo sistema, status de entrega e confirmações do servidor Meta WhatsApp.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex gap-2 items-center flex-wrap">
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <Input
                                    placeholder="Buscar por telefone, mensagem ou status..."
                                    value={auditSearchTerm}
                                    onChange={e => setAuditSearchTerm(e.target.value)}
                                    className="pl-9 min-h-[44px]"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <Button variant="outline" onClick={openAuditModal} className="min-h-[44px]">
                                Recarregar Logs
                            </Button>
                        </div>

                        {loadingAuditLogs ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto border rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                                        <tr>
                                            <th className="p-3 text-left font-semibold">Telefone</th>
                                            <th className="p-3 text-left font-semibold">Data / Hora</th>
                                            <th className="p-3 text-left font-semibold">Status</th>
                                            <th className="p-3 text-left font-semibold">Origem</th>
                                            <th className="p-3 text-left font-semibold">Mensagem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.filter(l =>
                                            !auditSearchTerm ||
                                            l.recipient_phone?.includes(auditSearchTerm) ||
                                            l.message_preview?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                                            l.status?.toLowerCase().includes(auditSearchTerm.toLowerCase())
                                        ).length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                                    Nenhum log de WhatsApp encontrado para a pesquisa.
                                                </td>
                                            </tr>
                                        ) : (
                                            auditLogs
                                                .filter(l =>
                                                    !auditSearchTerm ||
                                                    l.recipient_phone?.includes(auditSearchTerm) ||
                                                    l.message_preview?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                                                    l.status?.toLowerCase().includes(auditSearchTerm.toLowerCase())
                                                )
                                                .map(log => (
                                                    <tr key={log.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                                        <td className="p-3 font-medium whitespace-nowrap">{log.recipient_phone}</td>
                                                        <td className="p-3 whitespace-nowrap text-slate-500 text-xs">
                                                            {new Date(log.sent_at).toLocaleString('pt-BR')}
                                                        </td>
                                                        <td className="p-3 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                log.status === 'sent'
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                            }`}>
                                                                {log.status === 'sent' ? '✅ Entregue' : '❌ Falhou'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 whitespace-nowrap text-xs text-slate-500">
                                                            {log.trigger_source || 'manual'}
                                                        </td>
                                                        <td className="p-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.message_preview}>
                                                            {log.message_preview}
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
