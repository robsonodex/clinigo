'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import type { ChatConversation, ChatMessage } from './ChatLayout'
import { UserPlus, X, Search } from 'lucide-react'

interface MessageAreaProps {
    conversationId: string
    conversation: ChatConversation
    currentUserId: string
    onMessagesUpdated: () => void
}

export function MessageArea({
    conversationId,
    conversation,
    currentUserId,
    onMessagesUpdated,
}: MessageAreaProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editingContent, setEditingContent] = useState('')
    
    // Add participants state
    const [showAddParticipants, setShowAddParticipants] = useState(false)
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; full_name: string; role: string }>>([])
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
    const [searchAvailableUsers, setSearchAvailableUsers] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    
    const scrollRef = useRef<HTMLDivElement>(null)
    const isFirstLoad = useRef(true)

    const scrollToBottom = useCallback((smooth = true) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto',
            })
        }
    }, [])

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/chat/conversations/${conversationId}/messages?limit=200`)
            if (res.ok) {
                const result = await res.json()
                setMessages(result.data || [])
                // Scroll to bottom on first load
                if (isFirstLoad.current) {
                    isFirstLoad.current = false
                    setTimeout(() => scrollToBottom(false), 50)
                }
            }
        } catch (error) {
            console.error('[Chat] Error loading messages:', error)
        } finally {
            setIsLoading(false)
        }
    }, [conversationId, scrollToBottom])

    useEffect(() => {
        isFirstLoad.current = true
        setIsLoading(true)
        setMessages([])
        fetchMessages()
    }, [conversationId, fetchMessages])

    // Realtime subscription for this conversation's messages
    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel(`chat-messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Fetch the full message with sender info
                        const { data: fullMessage } = await supabase
                            .from('chat_messages')
                            .select(`*, sender:sender_id(id, full_name, avatar_url, role)`)
                            .eq('id', (payload.new as ChatMessage).id)
                            .single()

                        if (fullMessage) {
                            setMessages(prev => {
                                // Avoid duplicates
                                if (prev.find(m => m.id === fullMessage.id)) return prev
                                return [...prev, fullMessage as ChatMessage]
                            })
                            setTimeout(() => scrollToBottom(true), 50)
                        }

                        // Mark as read if it's not from us
                        if ((payload.new as ChatMessage).sender_id !== currentUserId) {
                            fetch(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {})
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev =>
                            prev.map(m => m.id === (payload.new as ChatMessage).id
                                ? { ...m, ...(payload.new as Partial<ChatMessage>) }
                                : m
                            )
                        )
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev =>
                            prev.filter(m => m.id !== (payload.old as { id: string }).id)
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId, currentUserId, scrollToBottom])

    const handleSendMessage = async (content: string, messageType: string, attachmentData?: {
        url: string; name: string; size: number
    }) => {
        try {
            const body: Record<string, unknown> = { content, message_type: messageType }
            if (attachmentData) {
                body.attachment_url = attachmentData.url
                body.attachment_name = attachmentData.name
                body.attachment_size = attachmentData.size
            }

            const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                onMessagesUpdated()
                setTimeout(() => scrollToBottom(true), 100)
            }
        } catch (error) {
            console.error('[Chat] Error sending message:', error)
        }
    }

    const handleEditMessage = async (messageId: string, newContent: string) => {
        try {
            const res = await fetch(`/api/chat/messages/${messageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent }),
            })
            if (res.ok) {
                setEditingMessageId(null)
                setEditingContent('')
                fetchMessages()
            }
        } catch (error) {
            console.error('[Chat] Error editing message:', error)
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Deseja deletar esta mensagem?')) return
        try {
            const res = await fetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' })
            if (res.ok) {
                setMessages(prev =>
                    prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: null } : m)
                )
                onMessagesUpdated()
            }
        } catch (error) {
            console.error('[Chat] Error deleting message:', error)
        }
    }

    const startEditing = (message: ChatMessage) => {
        setEditingMessageId(message.id)
        setEditingContent(message.content || '')
    }

    const cancelEditing = () => {
        setEditingMessageId(null)
        setEditingContent('')
    }

    const loadAvailableUsers = async () => {
        try {
            const supabase = createClient()
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', currentUserId)
                .single()

            if (profile?.clinic_id) {
                const currentParticipantIds = conversation.participants.map(p => p.user_id)
                const { data: users } = await supabase
                    .from('users')
                    .select('id, full_name, role')
                    .eq('clinic_id', profile.clinic_id)
                    .eq('is_active', true)
                
                if (users) {
                    setAvailableUsers(users.filter(u => !currentParticipantIds.includes(u.id)))
                }
            }
        } catch (error) {
            console.error('[Chat] Error loading users:', error)
        }
    }

    const handleAddParticipants = async () => {
        if (selectedUsers.size === 0) return
        setIsAdding(true)
        try {
            const res = await fetch(`/api/chat/conversations/${conversationId}/participants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participant_ids: Array.from(selectedUsers) })
            })
            if (res.ok) {
                setShowAddParticipants(false)
                setSelectedUsers(new Set())
                onMessagesUpdated()
            } else {
                alert('Erro ao adicionar participantes.')
            }
        } catch (error) {
            console.error('[Chat] Error adding participants:', error)
        } finally {
            setIsAdding(false)
        }
    }

    // Get names of other participants for subtitle
    const otherNames = conversation.participants
        .filter(p => p.user_id !== currentUserId)
        .map(p => p.users?.full_name || 'Usuário')

    // Get conversation title for header
    const title = conversation.title ||
        otherNames.join(', ') ||
        'Conversa'

    const headerSubtitle = otherNames.length > 0
        ? `Você e ${otherNames.join(', ')}`
        : 'Conversa'
    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 shadow-sm shadow-slate-100/30 dark:shadow-none">
                <div>
                    <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">{title}</h3>
                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                        {headerSubtitle}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {conversation.type === 'internal' && (
                        <button
                            onClick={() => {
                                setShowAddParticipants(true)
                                loadAvailableUsers()
                            }}
                            className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-805 hover:text-emerald-600 dark:hover:text-emerald-500 rounded-xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 transition-all duration-200 cursor-pointer active:scale-90"
                            title="Adicionar Participantes"
                        >
                            <UserPlus className="w-4.5 h-4.5" />
                        </button>
                    )}
                    {conversation.type === 'support' && (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/10 shadow-sm shadow-amber-500/5">
                            Suporte
                        </span>
                    )}
                    {conversation.type === 'admin_to_clinic' && (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/10 shadow-sm shadow-emerald-500/5">
                            Admin
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 py-5 space-y-2 bg-slate-50/20 dark:bg-slate-950/5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-805"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full shadow-md shadow-emerald-500/10" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-3">
                            <span className="text-2xl animate-bounce">👋</span>
                        </div>
                        <p className="text-sm font-semibold">Nenhuma mensagem por aqui ainda</p>
                        <p className="text-xs text-slate-400/80 dark:text-slate-500/80 mt-1">Escreva uma mensagem para iniciar o papo!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const prevMsg = idx > 0 ? messages[idx - 1] : null
                        const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id ||
                            (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 300000

                        return (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isOwn={msg.sender_id === currentUserId}
                                showAvatar={showAvatar}
                                isEditing={editingMessageId === msg.id}
                                editContent={editingContent}
                                onEditContentChange={setEditingContent}
                                onStartEdit={() => startEditing(msg)}
                                onSaveEdit={() => handleEditMessage(msg.id, editingContent)}
                                onCancelEdit={cancelEditing}
                                onDelete={() => handleDeleteMessage(msg.id)}
                            />
                        )
                    })
                )}
            </div>

            {/* Input */}
            <MessageInput
                conversationId={conversationId}
                onSend={handleSendMessage}
            />

            {/* Add Participants Modal */}
            {showAddParticipants && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Adicionar Participantes</h3>
                            <button 
                                onClick={() => setShowAddParticipants(false)} 
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-105 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800/60">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    value={searchAvailableUsers}
                                    onChange={(e) => setSearchAvailableUsers(e.target.value)}
                                    placeholder="Buscar por nome..."
                                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/50 border border-slate-250 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-1.5 bg-slate-50/30 dark:bg-slate-950/10">
                            {availableUsers.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">Nenhum usuário disponível para adicionar.</p>
                            ) : (
                                availableUsers
                                    .filter(user => user.full_name.toLowerCase().includes(searchAvailableUsers.toLowerCase()))
                                    .map(user => (
                                        <label key={user.id} className="flex items-center gap-3.5 p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 rounded-xl cursor-pointer transition-colors active:scale-[0.99]">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={(e) => {
                                                    const next = new Set(selectedUsers)
                                                    if (e.target.checked) next.add(user.id)
                                                    else next.delete(user.id)
                                                    setSelectedUsers(next)
                                                }}
                                                className="w-4.5 h-4.5 text-emerald-600 focus:ring-emerald-500/30 dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{(user.role || '').replace('_', ' ').toLowerCase()}</p>
                                            </div>
                                        </label>
                                    ))
                            )}
                            {availableUsers.length > 0 && availableUsers.filter(user => user.full_name.toLowerCase().includes(searchAvailableUsers.toLowerCase())).length === 0 && (
                                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Nenhum usuário encontrado.</p>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddParticipants(false)}
                                className="px-4.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 active:scale-95 min-h-[44px]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddParticipants}
                                disabled={selectedUsers.size === 0 || isAdding}
                                className="px-4.5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-650 rounded-xl disabled:opacity-40 transition-all duration-200 active:scale-95 min-h-[44px] shadow-md shadow-emerald-650/10"
                            >
                                {isAdding ? 'Adicionando...' : 'Adicionar Selecionados'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
