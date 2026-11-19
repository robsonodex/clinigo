'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, X, CheckCheck, Clock, User, Headphones, Building } from 'lucide-react'

interface ChatUser {
    id: string
    name: string
    role: string
    clinic: {
        id: string
        name: string
        plan_type: string
    }
}

interface Message {
    id: number
    conversation_id: number
    sender_type: 'SUPPORT' | 'CLINIC'
    sender_name: string
    message: string
    created_at: string
    read: boolean
}

interface ChatWidgetProps {
    user: ChatUser
}

export function ChatWidget({ user }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Early return if user data is not available
    if (!user || !user.clinic) {
        return null
    }

    // Verificar se tem acesso ao chat (PRO ou ENTERPRISE)
    const hasAccess = ['PRO', 'PROFISSIONAL', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK'].includes(user.clinic?.plan_type || '')

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        // Carregar mensagens iniciais
        if (hasAccess && messages.length === 0) {
            setMessages([
                {
                    id: 1,
                    conversation_id: 1,
                    sender_type: 'SUPPORT',
                    sender_name: 'Marina - Suporte CliniGo',
                    message: 'Olá! Sou a Marina, sua gerente de suporte. Como posso ajudar hoje?',
                    created_at: new Date().toISOString(),
                    read: true,
                },
            ])
        }
    }, [hasAccess, messages.length])

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
            setUnreadCount(0)
        }
    }, [isOpen, messages])

    const sendMessage = async () => {
        if (!newMessage.trim()) return

        const message: Message = {
            id: messages.length + 1,
            conversation_id: 1,
            sender_type: 'CLINIC',
            sender_name: user?.name || 'Você',
            message: newMessage,
            created_at: new Date().toISOString(),
            read: false,
        }

        setMessages([...messages, message])
        setNewMessage('')

        // Simular resposta do suporte
        setIsTyping(true)
        setTimeout(() => {
            setIsTyping(false)
            const supportReply: Message = {
                id: messages.length + 2,
                conversation_id: 1,
                sender_type: 'SUPPORT',
                sender_name: 'Marina - Suporte CliniGo',
                message: 'Recebi sua mensagem! Vou verificar isso para você.',
                created_at: new Date().toISOString(),
                read: false,
            }
            setMessages((prev) => [...prev, supportReply])
            if (!isOpen) setUnreadCount((prev) => prev + 1)
        }, 2000)
    }

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    if (!hasAccess) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    type="button"
                    onClick={() =>
                        alert(
                            'Chat de suporte prioritário disponível no plano Professional.\n\nFaça upgrade para ter acesso ao atendimento direto.'
                        )
                    }
                    className="bg-muted text-muted-foreground border border-border rounded-md p-3.5 shadow-md hover:bg-muted/80 transition relative cursor-not-allowed"
                    title="Disponível no Plano Professional"
                >
                    <MessageCircle className="w-5 h-5" />
                </button>
            </div>
        )
    }

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-md p-3.5 shadow-lg hover:bg-primary/90 transition active:scale-[0.98] z-50"
                    title="Abrir Suporte CliniGo"
                >
                    <MessageCircle className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[11px] font-mono rounded-md min-w-[20px] h-5 px-1 flex items-center justify-center font-bold">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[580px] max-h-[82vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-foreground/15 p-2 rounded-lg">
                                <Headphones className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Suporte CliniGo</h3>
                                <p className="text-xs opacity-90 flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-emerald-300 rounded-full"></span>
                                    Online · Tempo médio: 2 min
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-primary-foreground/15 p-1.5 rounded-md transition"
                            aria-label="Fechar suporte"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Plan Badge */}
                    <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-2 text-xs">
                            <Building className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium text-foreground">{user?.clinic?.name || 'Clínica'}</span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-accent text-accent-foreground border border-primary/20">
                            Professional
                        </span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                        {messages.map((msg) => {
                            const isSupport = msg.sender_type === 'SUPPORT'
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isSupport ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className="max-w-[78%]">
                                        {isSupport && (
                                            <div className="flex items-center gap-2 mb-1 ml-1">
                                                <div className="bg-primary p-1 rounded-md">
                                                    <User className="w-3 h-3 text-primary-foreground" />
                                                </div>
                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                    {msg.sender_name}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`rounded-xl p-3 ${isSupport
                                                ? 'bg-card border border-border text-foreground rounded-tl-xs'
                                                : 'bg-primary text-primary-foreground rounded-tr-xs'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed">{msg.message}</p>
                                            <div
                                                className={`flex items-center justify-end gap-1 mt-1 text-[11px] font-mono ${isSupport ? 'text-muted-foreground' : 'text-primary-foreground/75'
                                                    }`}
                                            >
                                                <Clock className="w-3 h-3" />
                                                <span>{formatTime(msg.created_at)}</span>
                                                {!isSupport && (
                                                    <CheckCheck
                                                        className={`w-3 h-3 ${msg.read ? 'text-emerald-200' : ''}`}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-card border border-border rounded-xl rounded-tl-xs p-3 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span
                                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: '0ms' }}
                                        ></span>
                                        <span
                                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: '150ms' }}
                                        ></span>
                                        <span
                                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                                            style={{ animationDelay: '300ms' }}
                                        ></span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Digitando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3.5 border-t border-border bg-card">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                            />
                            <button
                                type="button"
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className={`px-3 py-2 rounded-md transition ${newMessage.trim()
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                                    }`}
                                aria-label="Enviar mensagem"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground text-center mt-2">
                            Tempo médio de resposta: 2 minutos
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
