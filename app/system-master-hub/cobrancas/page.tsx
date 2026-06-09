'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Receipt, ArrowLeft, RefreshCw, AlertTriangle, DollarSign,
    Send, Mail, MessageCircle, Lock, CheckCircle2, Loader2,
    ChevronDown, ChevronUp, Clock, Search, Link2, Copy, ExternalLink,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface OverdueClinic {
    id: string; name: string; planType: string; amount: number
    dueDate: string | null; daysOverdue: number; isOverdue: boolean
    lastContact: string | null; phone: string | null; email: string | null
}

interface ContactLog {
    id: string; channel: string; message: string; sent_at: string
}

export default function CobrancasPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [metrics, setMetrics] = useState({ totalOverdue: 0, overdueCount: 0, atRiskCount: 0 })
    const [overdueClinics, setOverdueClinics] = useState<OverdueClinic[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedClinic, setExpandedClinic] = useState<string | null>(null)
    const [contactHistory, setContactHistory] = useState<Record<string, ContactLog[]>>({})
    const [loadingHistory, setLoadingHistory] = useState<string | null>(null)

    // Sheet states
    const [contactSheet, setContactSheet] = useState<{
        open: boolean; clinicId: string; clinicName: string; channel: 'whatsapp' | 'email'
    }>({ open: false, clinicId: '', clinicName: '', channel: 'whatsapp' })
    const [contactMessage, setContactMessage] = useState('')
    const [sendingContact, setSendingContact] = useState(false)

    // Confirm dialogs
    const [confirmAction, setConfirmAction] = useState<{
        open: boolean; type: 'mark_paid' | 'block'; clinicId: string; clinicName: string
    }>({ open: false, type: 'mark_paid', clinicId: '', clinicName: '' })
    const [processing, setProcessing] = useState(false)

    // Payment link states
    const [generatingLink, setGeneratingLink] = useState<string | null>(null)
    const [paymentLinkResult, setPaymentLinkResult] = useState<{
        open: boolean; link: string; linhaDigitavel: string; clinicName: string; amount: number
    }>({ open: false, link: '', linhaDigitavel: '', clinicName: '', amount: 0 })

    const loadData = useCallback(async () => {
        setIsLoading(true); setError(null)
        try {
            const res = await fetch('/api/super-admin/billing')
            if (!res.ok) throw new Error('Erro ao carregar dados')
            const result = await res.json()
            setMetrics(result.data?.metrics || { totalOverdue: 0, overdueCount: 0, atRiskCount: 0 })
            setOverdueClinics(result.data?.overdueClinics || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido')
        } finally { setIsLoading(false) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const loadContactHistory = async (clinicId: string) => {
        if (expandedClinic === clinicId) { setExpandedClinic(null); return }
        setExpandedClinic(clinicId); setLoadingHistory(clinicId)
        try {
            const res = await fetch('/api/super-admin/billing', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_contact_history', clinic_id: clinicId }),
            })
            if (res.ok) {
                const result = await res.json()
                setContactHistory(prev => ({ ...prev, [clinicId]: result.data?.history || [] }))
            }
        } catch { } finally { setLoadingHistory(null) }
    }

    const openContactSheet = (clinicId: string, clinicName: string, channel: 'whatsapp' | 'email') => {
        setContactSheet({ open: true, clinicId, clinicName, channel })
        const clinic = overdueClinics.find(c => c.id === clinicId)
        const template = channel === 'whatsapp'
            ? `Olá! Aqui é a equipe CliniGo. Identificamos que o pagamento da clínica "${clinicName}" no valor de R$ ${clinic?.amount?.toFixed(2) || '0,00'} está com ${clinic?.daysOverdue || 0} dias em atraso. Por favor, regularize para evitar interrupção do serviço.`
            : `Prezado(a),\n\nIdentificamos que a assinatura da clínica "${clinicName}" encontra-se com pagamento pendente no valor de R$ ${clinic?.amount?.toFixed(2) || '0,00'}.\n\nPor favor, regularize o pagamento para evitar a suspensão dos serviços.\n\nAtenciosamente,\nEquipe CliniGo`
        setContactMessage(template)
    }

    const handleSendContact = async () => {
        if (!contactMessage.trim()) return
        setSendingContact(true)
        try {
            await fetch('/api/super-admin/billing', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'contact_log', clinic_id: contactSheet.clinicId,
                    channel: contactSheet.channel, message: contactMessage.trim(),
                }),
            })
            alert(`✅ Contato via ${contactSheet.channel} registrado com sucesso!`)
            setContactSheet({ open: false, clinicId: '', clinicName: '', channel: 'whatsapp' })
            loadData()
        } catch { alert('Erro ao registrar contato') }
        finally { setSendingContact(false) }
    }

    const handleConfirmAction = async () => {
        setProcessing(true)
        try {
            await fetch('/api/super-admin/billing', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: confirmAction.type, clinic_id: confirmAction.clinicId,
                    reason: 'Inadimplência',
                }),
            })
            alert(`✅ ${confirmAction.type === 'mark_paid' ? 'Pagamento confirmado' : 'Clínica bloqueada'}!`)
            setConfirmAction({ open: false, type: 'mark_paid', clinicId: '', clinicName: '' })
            loadData()
        } catch { alert('Erro ao processar ação') }
        finally { setProcessing(false) }
    }

    const handleGeneratePaymentLink = async (clinicId: string, clinicName: string) => {
        setGeneratingLink(clinicId)
        try {
            const res = await fetch('/api/billing/generate-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinic_id: clinicId }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao gerar link')

            setPaymentLinkResult({
                open: true,
                link: result.link,
                linhaDigitavel: result.linha_digitavel || '',
                clinicName: result.clinic_name || clinicName,
                amount: result.amount || 0,
            })
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erro ao gerar link de pagamento')
        } finally {
            setGeneratingLink(null)
        }
    }

    const handleCopyLink = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            alert('✅ Copiado!')
        } catch {
            // Fallback
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            alert('✅ Copiado!')
        }
    }

    const getDaysOverdueBadge = (days: number) => {
        if (days <= 3) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{days}d</Badge>
        if (days <= 7) return <Badge className="bg-orange-100 text-orange-700 border-orange-300">{days}d</Badge>
        return <Badge className="bg-red-100 text-red-700 border-red-300">{days}d</Badge>
    }

    const filtered = overdueClinics.filter(c =>
        !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <Skeleton className="h-12 w-80 bg-gray-200" />
                <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 bg-gray-200" />)}</div>
                <Skeleton className="h-96 bg-gray-200" />
            </div>
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Card className="max-w-md"><CardContent className="pt-6 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <p className="text-red-600">{error}</p>
                <Button onClick={loadData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente</Button>
            </CardContent></Card>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Receipt className="h-7 w-7 text-amber-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Central de Cobranças</h1>
                            <p className="text-xs text-gray-500">Gestão de inadimplência</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar</Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/system-master-hub')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white border-gray-200"><CardHeader className="pb-2"><CardDescription>Total em Atraso</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-red-500">R$ {metrics.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <DollarSign className="h-8 w-8 text-red-500" />
                        </div></CardContent></Card>
                    <Card className="bg-white border-gray-200"><CardHeader className="pb-2"><CardDescription>Clínicas Inadimplentes</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-orange-500">{metrics.overdueCount}</span>
                            <AlertTriangle className="h-8 w-8 text-orange-500" />
                        </div></CardContent></Card>
                    <Card className="bg-white border-gray-200"><CardHeader className="pb-2"><CardDescription>Em Risco (7 dias)</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-yellow-500">{metrics.atRiskCount}</span>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div></CardContent></Card>
                </div>

                <Tabs defaultValue="inadimplentes">
                    <TabsList className="bg-white border"><TabsTrigger value="inadimplentes">Inadimplentes</TabsTrigger><TabsTrigger value="regua">Régua Automática</TabsTrigger></TabsList>

                    <TabsContent value="inadimplentes" className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Buscar clínica..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>

                        {filtered.length === 0 ? (
                            <Card><CardContent className="py-12 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">{searchTerm ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica inadimplente! 🎉'}</p>
                            </CardContent></Card>
                        ) : (
                            <Card><CardContent className="p-0">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Clínica</TableHead><TableHead>Plano</TableHead>
                                        <TableHead>Valor</TableHead><TableHead>Vencimento</TableHead>
                                        <TableHead>Atraso</TableHead><TableHead>Último Contato</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {filtered.map(clinic => (
                                            <>
                                                <TableRow key={clinic.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium">{clinic.name}</TableCell>
                                                    <TableCell><Badge variant="outline">{clinic.planType}</Badge></TableCell>
                                                    <TableCell className="font-semibold">R$ {clinic.amount.toFixed(2)}</TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {clinic.dueDate ? format(new Date(clinic.dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
                                                    </TableCell>
                                                    <TableCell>{getDaysOverdueBadge(clinic.daysOverdue)}</TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {clinic.lastContact ? format(new Date(clinic.lastContact), 'dd/MM HH:mm', { locale: ptBR }) : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => handleGeneratePaymentLink(clinic.id, clinic.name)} disabled={generatingLink === clinic.id} className="text-violet-600 hover:bg-violet-50" title="Gerar Link de Pagamento">
                                                                {generatingLink === clinic.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => openContactSheet(clinic.id, clinic.name, 'whatsapp')} className="text-green-600 hover:bg-green-50" title="WhatsApp">
                                                                <MessageCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => openContactSheet(clinic.id, clinic.name, 'email')} className="text-blue-600 hover:bg-blue-50" title="Email">
                                                                <Mail className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ open: true, type: 'mark_paid', clinicId: clinic.id, clinicName: clinic.name })} className="text-emerald-600 hover:bg-emerald-50" title="Marcar como pago">
                                                                <DollarSign className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ open: true, type: 'block', clinicId: clinic.id, clinicName: clinic.name })} className="text-red-600 hover:bg-red-50" title="Bloquear">
                                                                <Lock className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => loadContactHistory(clinic.id)} className="text-gray-500">
                                                                {expandedClinic === clinic.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedClinic === clinic.id && (
                                                    <TableRow key={`${clinic.id}-history`}>
                                                        <TableCell colSpan={7} className="bg-gray-50 p-4">
                                                            <p className="text-sm font-medium mb-2">Histórico de Contatos</p>
                                                            {loadingHistory === clinic.id ? (
                                                                <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
                                                            ) : (contactHistory[clinic.id] || []).length === 0 ? (
                                                                <p className="text-sm text-gray-400">Nenhum contato registrado</p>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {(contactHistory[clinic.id] || []).map(log => (
                                                                        <div key={log.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-300 pl-3">
                                                                            <Badge variant="outline" className="shrink-0">{log.channel}</Badge>
                                                                            <span className="text-gray-600 flex-1 line-clamp-2">{log.message}</span>
                                                                            <span className="text-gray-400 text-xs shrink-0">{format(new Date(log.sent_at), 'dd/MM HH:mm')}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent></Card>
                        )}
                    </TabsContent>

                    <TabsContent value="regua">
                        <Card><CardHeader>
                            <CardTitle>Régua Automática de Cobrança</CardTitle>
                            <CardDescription>Configure mensagens automáticas para D+1, D+3 e D+7 de atraso</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 py-8 text-center">
                                ⚙️ A régua automática será configurada via <strong>platform_settings</strong> no ITEM 5.
                                <br />Templates e toggles serão editáveis na aba Configurações Globais.
                            </p>
                        </CardContent></Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Sheet de contato */}
            <Sheet open={contactSheet.open} onOpenChange={open => { if (!open) setContactSheet(prev => ({ ...prev, open: false })) }}>
                <SheetContent className="sm:max-w-[480px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            {contactSheet.channel === 'whatsapp' ? <MessageCircle className="h-5 w-5 text-green-600" /> : <Mail className="h-5 w-5 text-blue-600" />}
                            Contato via {contactSheet.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </SheetTitle>
                        <SheetDescription>Enviando para <strong>{contactSheet.clinicName}</strong></SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Mensagem</Label>
                            <Textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} rows={8} className="resize-y" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSendContact} disabled={sendingContact || !contactMessage.trim()} className={contactSheet.channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}>
                            {sendingContact ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4 mr-2" /> Enviar e Registrar</>}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Confirm Dialog */}
            <Dialog open={confirmAction.open} onOpenChange={open => { if (!open) setConfirmAction(prev => ({ ...prev, open: false })) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{confirmAction.type === 'mark_paid' ? '✅ Confirmar Pagamento' : '🔒 Bloquear Clínica'}</DialogTitle>
                        <DialogDescription>
                            {confirmAction.type === 'mark_paid'
                                ? `Confirmar pagamento da clínica "${confirmAction.clinicName}"? O vencimento será atualizado para +30 dias.`
                                : `⚠️ Tem certeza que deseja bloquear "${confirmAction.clinicName}"? Todos os usuários perderão acesso ao sistema.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(prev => ({ ...prev, open: false }))} disabled={processing}>Cancelar</Button>
                        <Button onClick={handleConfirmAction} disabled={processing} className={confirmAction.type === 'mark_paid' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>
                            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {confirmAction.type === 'mark_paid' ? 'Confirmar Pagamento' : 'Bloquear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Link Result Dialog */}
            <Dialog open={paymentLinkResult.open} onOpenChange={open => { if (!open) setPaymentLinkResult(prev => ({ ...prev, open: false })) }}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-violet-600" />
                            Link de Pagamento Gerado
                        </DialogTitle>
                        <DialogDescription>
                            Link para <strong>{paymentLinkResult.clinicName}</strong> — R$ {paymentLinkResult.amount.toFixed(2)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Link público */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase">Link público (enviar para o cliente)</Label>
                            <div className="flex gap-2">
                                <Input readOnly value={paymentLinkResult.link} className="text-sm font-mono" />
                                <Button variant="outline" size="sm" onClick={() => handleCopyLink(paymentLinkResult.link)} className="shrink-0">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Linha digitável */}
                        {paymentLinkResult.linhaDigitavel && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase">Linha Digitável</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={paymentLinkResult.linhaDigitavel} className="text-xs font-mono" />
                                    <Button variant="outline" size="sm" onClick={() => handleCopyLink(paymentLinkResult.linhaDigitavel)} className="shrink-0">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Msg pronta para WhatsApp */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase">Mensagem pronta para WhatsApp</Label>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-900 whitespace-pre-line">
                                    {`Olá! 👋\n\nSegue o boleto da sua assinatura CliniGo no valor de R$ ${paymentLinkResult.amount.toFixed(2)}:\n\n🔗 ${paymentLinkResult.link}\n\nClique no link para visualizar e baixar o boleto.\n\nQualquer dúvida, estamos à disposição!`}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full text-green-700 border-green-300 hover:bg-green-100"
                                    onClick={() => handleCopyLink(`Olá! 👋\n\nSegue o boleto da sua assinatura CliniGo no valor de R$ ${paymentLinkResult.amount.toFixed(2)}:\n\n🔗 ${paymentLinkResult.link}\n\nClique no link para visualizar e baixar o boleto.\n\nQualquer dúvida, estamos à disposição!`)}
                                >
                                    <Copy className="h-3.5 w-3.5 mr-2" /> Copiar Mensagem
                                </Button>
                            </div>
                        </div>

                        {/* Abrir preview */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(paymentLinkResult.link, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" /> Visualizar página do cliente
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
