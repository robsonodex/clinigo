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
                    onClick={() =>
                        alert(
                            'Chat de suporte disponível apenas nos planos Profissional e Enterprise.\n\nFaça upgrade para ter acesso ao suporte direto!'
                        )
                    }
                    className="bg-gray-400 text-white rounded-full p-4 shadow-lg hover:bg-gray-500 transition relative cursor-not-allowed"
                    title="Upgrade necessário"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            </div>
        )
    }

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition transform hover:scale-110 z-50"
                >
                    <MessageCircle className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full">
                                <Headphones className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold">Suporte CliniGo</h3>
                                <p className="text-xs opacity-90 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    Online - Tempo médio: 2min
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-2 rounded-full transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Plan Badge */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2 flex items-center justify-between border-b">
                        <div className="flex items-center gap-2 text-sm">
                            <Building className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-gray-700">{user?.clinic?.name || 'Clínica'}</span>
                        </div>
                        <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${user.clinic.plan_type === 'ENTERPRISE'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                : 'bg-purple-600 text-white'
                                }`}
                        >
                            {user.clinic.plan_type === 'ENTERPRISE' ? '⭐ Enterprise' : 'Pro'}
                        </span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg) => {
                            const isSupport = msg.sender_type === 'SUPPORT'
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isSupport ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`max-w-[75%]`}>
                                        {isSupport && (
                                            <div className="flex items-center gap-2 mb-1 ml-2">
                                                <div className="bg-blue-600 p-1.5 rounded-full">
                                                    <User className="w-3 h-3 text-white" />
                                                </div>
                                                <span className="text-xs font-medium text-gray-600">
                                                    {msg.sender_name}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`rounded-2xl p-3 ${isSupport
                                                ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed">{msg.message}</p>
                                            <div
                                                className={`flex items-center justify-end gap-1 mt-1 text-xs ${isSupport ? 'text-gray-400' : 'text-white/70'
                                                    }`}
                                            >
                                                <Clock className="w-3 h-3" />
                                                <span>{formatTime(msg.created_at)}</span>
                                                {!isSupport && (
                                                    <CheckCheck
                                                        className={`w-3 h-3 ${msg.read ? 'text-blue-300' : ''}`}
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
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '0ms' }}
                                        ></span>
                                        <span
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '150ms' }}
                                        ></span>
                                        <span
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '300ms' }}
                                        ></span>
                                    </div>
                                    <span className="text-xs text-gray-500">Digitando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t bg-white rounded-b-2xl">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className={`p-3 rounded-full transition ${newMessage.trim()
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:scale-105'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            Tempo médio de resposta: 2 minutos
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
