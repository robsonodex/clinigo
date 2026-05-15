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
            <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
                <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                    <p className="text-xs text-gray-500">
                        {headerSubtitle}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {conversation.type === 'internal' && (
                        <button
                            onClick={() => {
                                setShowAddParticipants(true)
                                loadAvailableUsers()
                            }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-sky-600 rounded-md transition-colors"
                            title="Adicionar Participantes"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                    )}
                    {conversation.type === 'support' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            Suporte
                        </span>
                    )}
                    {conversation.type === 'admin_to_clinic' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                            Admin
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50/50"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Nenhuma mensagem ainda. Diga olá! 👋
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-semibold text-lg text-gray-900">Adicionar Participantes</h3>
                            <button onClick={() => setShowAddParticipants(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchAvailableUsers}
                                    onChange={(e) => setSearchAvailableUsers(e.target.value)}
                                    placeholder="Buscar por nome..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-2">
                            {availableUsers.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário disponível para adicionar.</p>
                            ) : (
                                availableUsers
                                    .filter(user => user.full_name.toLowerCase().includes(searchAvailableUsers.toLowerCase()))
                                    .map(user => (
                                        <label key={user.id} className="flex items-center gap-3 p-3 border border-gray-200 hover:bg-sky-50 rounded-lg cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={(e) => {
                                                    const next = new Set(selectedUsers)
                                                    if (e.target.checked) next.add(user.id)
                                                    else next.delete(user.id)
                                                    setSelectedUsers(next)
                                                }}
                                                className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                                <p className="text-xs text-gray-500 capitalize">{(user.role || '').replace('_', ' ').toLowerCase()}</p>
                                            </div>
                                        </label>
                                    ))
                            )}
                            {availableUsers.length > 0 && availableUsers.filter(user => user.full_name.toLowerCase().includes(searchAvailableUsers.toLowerCase())).length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário encontrado.</p>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddParticipants(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddParticipants}
                                disabled={selectedUsers.size === 0 || isAdding}
                                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 transition-colors"
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
