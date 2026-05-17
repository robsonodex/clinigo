'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { MessageCircle, Headphones, Building2, Megaphone, ArrowLeft, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

type TabType = 'all' | 'support'

export default function SuperAdminChatPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [broadcastOpen, setBroadcastOpen] = useState(false)
    const [broadcastMessage, setBroadcastMessage] = useState('')
    const [broadcastTitle, setBroadcastTitle] = useState('')
    const [sendingBroadcast, setSendingBroadcast] = useState(false)

    const handleBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) return
        setSendingBroadcast(true)
        try {
            const res = await fetch('/api/super-admin/notifications/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: broadcastTitle.trim(),
                    message: broadcastMessage.trim(),
                }),
            })
            if (res.ok) {
                alert('✅ Mensagem de broadcast enviada para todas as clínicas!')
                setBroadcastOpen(false)
                setBroadcastTitle('')
                setBroadcastMessage('')
            } else {
                const err = await res.json()
                alert(`Erro: ${err.error?.message || 'Falha ao enviar broadcast'}`)
            }
        } catch {
            alert('Erro de conexão ao enviar broadcast')
        } finally {
            setSendingBroadcast(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-6 h-6 text-sky-600" />
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Central de Chat</h1>
                                <p className="text-xs text-gray-500">Comunicação com clínicas e suporte</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => setBroadcastOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Megaphone className="h-4 w-4 mr-2" /> Broadcast
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => router.push('/system-master-hub')}>
                                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'all' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Building2 className="w-4 h-4" /> Todas as Conversas
                        </button>
                        <button
                            onClick={() => setActiveTab('support')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'support' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Headphones className="w-4 h-4" /> Suporte
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                <ChatLayout isSuperAdmin={true} />
            </main>

            {/* Broadcast Dialog */}
            <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-indigo-600" /> Broadcast para Todas as Clínicas
                        </DialogTitle>
                        <DialogDescription>
                            Envie uma mensagem para <strong>todas as clínicas ativas</strong> no chat.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <input
                                type="text"
                                value={broadcastTitle}
                                onChange={e => setBroadcastTitle(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Ex: ⚠️ Manutenção programada"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mensagem</Label>
                            <Textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={5} placeholder="Mensagem para todas as clínicas..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBroadcastOpen(false)} disabled={sendingBroadcast}>Cancelar</Button>
                        <Button onClick={handleBroadcast} disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {sendingBroadcast ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4 mr-2" /> Enviar Broadcast</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
