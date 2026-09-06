'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
    HelpCircle,
    Send,
    X,
    RotateCcw,
    Loader2,
    Copy,
    Check,
    Building2,
    User,
    Mail,
    Phone,
    FileText,
    ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

export interface SupportWidgetUser {
    id: string
    name: string
    role?: string
    email?: string
    phone?: string
    clinic: {
        id: string
        name: string
        plan_type?: string
    }
}

interface Message {
    id: string
    sender: 'user' | 'assistant'
    text: string
    clickPath?: string
    hasFeature?: boolean
    suggestFeature?: boolean
    suggestedTitle?: string
    createdAt: string
}

interface SupportAssistantWidgetProps {
    user?: SupportWidgetUser | null
}

const QUICK_ACTIONS = [
    { label: 'Agendamento de Paciente', query: 'Como realizar um agendamento na agenda?' },
    { label: 'Cadastro de Paciente e Endereço', query: 'Como cadastrar um novo paciente com endereço completo?' },
    { label: 'Repasse Profissional', query: 'Onde encontro o relatório de repasse dos profissionais?' },
    { label: 'Gestão de Convênios e Operadoras', query: 'Como gerenciar ou excluir operadoras cadastradas?' }
]

export function SupportAssistantWidget({ user }: SupportAssistantWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputQuestion, setInputQuestion] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [copiedPathId, setCopiedPathId] = useState<string | null>(null)

    // Modal de Sugestão de Funcionalidade
    const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false)
    const [suggestLoading, setSuggestLoading] = useState(false)
    const [suggestForm, setSuggestForm] = useState({
        clinicName: user?.clinic?.name || '',
        userName: user?.name || '',
        userEmail: user?.email || '',
        userPhone: user?.phone || '',
        title: '',
        description: ''
    })

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (user) {
            setSuggestForm((prev) => ({
                ...prev,
                clinicName: user.clinic?.name || prev.clinicName,
                userName: user.name || prev.userName,
                userEmail: user.email || prev.userEmail,
                userPhone: user.phone || prev.userPhone
            }))
        }
    }, [user])

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isOpen])

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 150)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend || inputQuestion).trim()
        if (!text || isLoading) return

        const userMsg: Message = {
            id: `usr-${Date.now()}`,
            sender: 'user',
            text,
            createdAt: new Date().toISOString()
        }

        setMessages((prev) => [...prev, userMsg])
        if (!textToSend) setInputQuestion('')
        setIsLoading(true)

        try {
            const res = await fetch('/api/support/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao consultar a base de instruções.')
            }

            if (data.userContext) {
                setSuggestForm((prev) => ({
                    ...prev,
                    clinicName: data.userContext.clinicName || prev.clinicName,
                    userName: data.userContext.userName || prev.userName,
                    userEmail: data.userContext.userEmail || prev.userEmail,
                    userPhone: data.userContext.userPhone || prev.userPhone
                }))
            }

            const aiMsg: Message = {
                id: `ai-${Date.now()}`,
                sender: 'assistant',
                text: data.answer || 'Informação processada com sucesso.',
                clickPath: data.clickPath || undefined,
                hasFeature: data.hasFeature,
                suggestFeature: data.suggestFeature,
                suggestedTitle: data.suggestedTitle,
                createdAt: new Date().toISOString()
            }

            setMessages((prev) => [...prev, aiMsg])
        } catch (error: any) {
            console.error('[CliniGo Support Error]:', error)
            setMessages((prev) => [
                ...prev,
                {
                    id: `ai-err-${Date.now()}`,
                    sender: 'assistant',
                    text: 'O serviço de atendimento está temporariamente indisponível. Por favor, repita a consulta em alguns instantes.',
                    createdAt: new Date().toISOString()
                }
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleCopyPath = async (path: string, msgId: string) => {
        try {
            await navigator.clipboard.writeText(path)
            setCopiedPathId(msgId)
            toast.success('Caminho copiado para a área de transferência.')
            setTimeout(() => setCopiedPathId(null), 2000)
        } catch {
            toast.error('Não foi possível copiar.')
        }
    }

    const handleOpenSuggestModal = (suggestedTitle?: string) => {
        setSuggestForm((prev) => ({
            ...prev,
            title: suggestedTitle || prev.title || '',
            clinicName: user?.clinic?.name || prev.clinicName,
            userName: user?.name || prev.userName,
            userEmail: user?.email || prev.userEmail,
            userPhone: user?.phone || prev.userPhone
        }))
        setIsSuggestModalOpen(true)
    }

    const handleSubmitSuggestion = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!suggestForm.title.trim() || !suggestForm.description.trim()) {
            toast.error('Informe o título e a descrição da solicitação.')
            return
        }

        setSuggestLoading(true)
        try {
            const res = await fetch('/api/support/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: user?.clinic?.id || null,
                    clinic_name: suggestForm.clinicName,
                    user_name: suggestForm.userName,
                    user_email: suggestForm.userEmail,
                    user_phone: suggestForm.userPhone,
                    title: suggestForm.title,
                    description: suggestForm.description
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao registrar solicitação.')
            }

            toast.success('Solicitação registrada com sucesso.')
            setIsSuggestModalOpen(false)

            setMessages((prev) => [
                ...prev,
                {
                    id: `ai-sug-${Date.now()}`,
                    sender: 'assistant',
                    text: `A solicitação "${suggestForm.title}" foi protocolada para avaliação da equipe de desenvolvimento.`,
                    createdAt: new Date().toISOString()
                }
            ])

            setSuggestForm((prev) => ({
                ...prev,
                title: '',
                description: ''
            }))
        } catch (error: any) {
            toast.error(error.message || 'Falha ao registrar solicitação.')
        } finally {
            setSuggestLoading(false)
        }
    }

    const handleResetChat = () => {
        if (messages.length === 0) return
        setMessages([])
        toast.info('Histórico de mensagens reiniciado.')
    }

    return (
        <>
            {/* BOTAO FLUTUANTE SOBRIO (Padrao Corporativo Sem Emojis e Sem Efeitos Chamativos) */}
            <div className="fixed z-[99999] bottom-5 right-5 lg:bottom-6 lg:right-6">
                <button
                    id="btn-open-clinigo-ai-assistant"
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-label={isOpen ? 'Fechar Suporte' : 'Abrir Suporte CliniGo'}
                    className={`flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 rounded-full shadow-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer ${
                        isOpen
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                >
                    {isOpen ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <HelpCircle className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* PAINEL DE ASSISTENCIA SOBRIO E RESPONSIVO */}
            {isOpen && (
                <div
                    id="panel-clinigo-ai-assistant"
                    className="fixed z-[100000] inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-20 sm:right-6 w-full sm:w-[380px] h-[80vh] sm:h-[480px] max-h-[85vh] sm:max-h-[calc(100vh-7rem)] bg-white rounded-t-xl sm:rounded-xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
                    style={{
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
                    }}
                >
                    {/* CABECALHO SOBRIO */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-slate-300" />
                            <span className="font-medium text-xs tracking-tight text-slate-100">
                                Suporte Operacional CliniGo
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    id="btn-reset-ai-chat"
                                    type="button"
                                    onClick={handleResetChat}
                                    title="Limpar histórico"
                                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                id="btn-close-ai-chat"
                                type="button"
                                onClick={() => setIsOpen(false)}
                                title="Fechar"
                                className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* CORPO DE MENSAGENS */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50 text-slate-800 text-xs">
                        {messages.length === 0 && (
                            <div className="space-y-3 pt-1">
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-600 leading-relaxed">
                                    Consulte orientações sobre rotas, procedimentos e funcionalidades do sistema.
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block px-0.5">
                                        Perguntas Frequentes
                                    </span>
                                    <div className="grid grid-cols-1 gap-1">
                                        {QUICK_ACTIONS.map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSendMessage(item.query)}
                                                className="w-full text-left text-xs px-3 py-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors flex items-center justify-between group cursor-pointer"
                                            >
                                                <span>{item.label}</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                {msg.sender === 'user' ? (
                                    <div className="max-w-[85%] bg-slate-900 text-white px-3 py-2 rounded-lg text-xs leading-relaxed">
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                ) : (
                                    <div className="max-w-[95%] bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2.5">
                                        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {msg.text}
                                        </div>

                                        {msg.clickPath && (
                                            <div className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-medium text-slate-700">
                                                        Caminho no Sistema:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPath(msg.clickPath!, msg.id)}
                                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-1.5 py-0.5 rounded cursor-pointer"
                                                    >
                                                        {copiedPathId === msg.id ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-slate-700" />
                                                                <span>Copiado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" />
                                                                <span>Copiar</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-900 bg-white p-1.5 rounded border border-slate-200 break-words">
                                                    {msg.clickPath}
                                                </div>
                                            </div>
                                        )}

                                        {msg.suggestFeature && (
                                            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-2">
                                                <p className="text-[11px] text-slate-600 leading-snug">
                                                    Esta funcionalidade não está implementada na versão atual do sistema.
                                                </p>

                                                <button
                                                    id="btn-suggest-feature-action"
                                                    type="button"
                                                    onClick={() => handleOpenSuggestModal(msg.suggestedTitle)}
                                                    className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>Sugerir Funcionalidade</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded border border-slate-200 w-fit">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                                <span className="text-[11px]">Localizando instruções...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ENTRADA DE DADOS */}
                    <div className="p-2.5 bg-white border-t border-slate-200">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSendMessage()
                            }}
                            className="flex items-center gap-1.5"
                        >
                            <input
                                ref={inputRef}
                                id="input-ai-support-question"
                                type="text"
                                value={inputQuestion}
                                onChange={(e) => setInputQuestion(e.target.value)}
                                placeholder="Digite sua dúvida sobre o sistema..."
                                disabled={isLoading}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 min-h-[38px]"
                            />

                            <button
                                id="btn-send-ai-question"
                                type="submit"
                                disabled={!inputQuestion.trim() || isLoading}
                                aria-label="Enviar"
                                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white p-2 rounded transition-colors flex items-center justify-center min-w-[38px] min-h-[38px] cursor-pointer"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE SUGESTAO DE FUNCIONALIDADE */}
            <Dialog open={isSuggestModalOpen} onOpenChange={setIsSuggestModalOpen}>
                <DialogContent className="sm:max-w-md w-[92vw] max-h-[85vh] overflow-y-auto p-5 rounded-xl">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-base font-semibold text-slate-900">
                            Sugerir Funcionalidade
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Registre sua necessidade diretamente para a equipe técnica do sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitSuggestion} className="space-y-3 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    Clínica
                                </label>
                                <input
                                    type="text"
                                    value={suggestForm.clinicName}
                                    onChange={(e) => setSuggestForm({ ...suggestForm, clinicName: e.target.value })}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white min-h-[34px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    Solicitante
                                </label>
                                <input
                                    type="text"
                                    value={suggestForm.userName}
                                    onChange={(e) => setSuggestForm({ ...suggestForm, userName: e.target.value })}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white min-h-[34px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    E-mail de Contato
                                </label>
                                <input
                                    type="email"
                                    value={suggestForm.userEmail}
                                    onChange={(e) => setSuggestForm({ ...suggestForm, userEmail: e.target.value })}
                                    placeholder="contato@clinica.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white min-h-[34px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    Telefone / WhatsApp
                                </label>
                                <input
                                    type="text"
                                    value={suggestForm.userPhone}
                                    onChange={(e) => setSuggestForm({ ...suggestForm, userPhone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white min-h-[34px]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                Título da Solicitação <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="input-suggest-title"
                                type="text"
                                value={suggestForm.title}
                                onChange={(e) => setSuggestForm({ ...suggestForm, title: e.target.value })}
                                placeholder="Descreva o recurso desejado de forma sucinta"
                                required
                                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-slate-400 min-h-[36px]"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                Descrição e Justificativa <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="input-suggest-description"
                                value={suggestForm.description}
                                onChange={(e) => setSuggestForm({ ...suggestForm, description: e.target.value })}
                                placeholder="Explique a rotina operacional e os benefícios desta melhoria..."
                                rows={3}
                                required
                                className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-slate-400"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                id="btn-cancel-suggestion"
                                type="button"
                                onClick={() => setIsSuggestModalOpen(false)}
                                disabled={suggestLoading}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded transition-colors cursor-pointer min-h-[34px]"
                            >
                                Cancelar
                            </button>

                            <button
                                id="btn-submit-suggestion"
                                type="submit"
                                disabled={suggestLoading}
                                className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-1.5 rounded transition-colors active:scale-95 disabled:opacity-50 min-h-[34px] cursor-pointer"
                            >
                                {suggestLoading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <span>Enviar Solicitação</span>
                                )}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
