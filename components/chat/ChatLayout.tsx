'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { ConversationList } from './ConversationList'
import { MessageArea } from './MessageArea'
import { MessageCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatConversation {
    id: string
    clinic_id: string | null
    type: 'internal' | 'admin_to_clinic' | 'support'
    title: string | null
    created_by: string
    last_message_at: string
    last_message_preview: string | null
    created_at: string
    unread_count: number
    participants: Array<{
        user_id: string
        role: string
        users: { full_name: string; avatar_url: string | null; role: string } | null
    }>
}

export interface ChatMessage {
    id: string
    conversation_id: string
    sender_id: string
    content: string | null
    message_type: 'text' | 'image' | 'document' | 'audio'
    attachment_url: string | null
    attachment_name: string | null
    attachment_size: number | null
    is_edited: boolean
    is_deleted: boolean
    edited_at: string | null
    created_at: string
    sender: {
        id: string
        full_name: string
        avatar_url: string | null
        role: string
    } | null
}

interface ChatLayoutProps {
    isSuperAdmin?: boolean
    clinicFilter?: string | null
}

export function ChatLayout({ isSuperAdmin = false, clinicFilter }: ChatLayoutProps) {
    const { profile } = useAuth()
    const [conversations, setConversations] = useState<ChatConversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showMobileMessages, setShowMobileMessages] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null)

    // Create notification sound on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAACAgICAgICAgICAgICAgICAgICBgYOEhoiKjI2Oj5CRkZGRkZCPjo2MioiGhIKBgH9+fXx7e3t7fH1+f4GCg4WGiImLjI2Oj5CQkZGRkJCPjo2MioiGhIKBgH9+fXx7e3t7fH1+gIGDhIaIiouMjY6PkJCRkZGQkI+OjYuKiIaEgoGAf359fHt7e3t8fX5/gYKDhYaIiYuMjY6Pj5CQkJGQkI+OjYyKiIaEgoGAf359fHt7e3t8fX6AgYOEhoiJi4yNjo+QkJCRkZCQj46NjIqIhoSCgYB/fn18e3t7e3x9fn+BgoSFhoiJi4yNjo+PkJCQkZCQj46NjIqIhoSCgYB/fn18e3t7')
            audio.volume = 0.3
            notificationSoundRef.current = audio
        }
    }, [])

    const fetchConversations = useCallback(async () => {
        try {
            let url = '/api/chat/conversations'
            if (clinicFilter) {
                url += `?clinic_id=${clinicFilter}`
            }
            const res = await fetch(url)
            if (res.ok) {
                const result = await res.json()
                setConversations(result.data || [])
            }
        } catch (error) {
            console.error('[Chat] Error loading conversations:', error)
        } finally {
            setIsLoading(false)
        }
    }, [clinicFilter])

    useEffect(() => {
        fetchConversations()
    }, [fetchConversations])

    // Realtime subscription for new messages
    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel('chat-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                },
                (payload) => {
                    const newMessage = payload.new as ChatMessage
                    // Play notification sound if message is from someone else
                    if (newMessage.sender_id !== profile?.id) {
                        notificationSoundRef.current?.play().catch(() => {})
                    }
                    // Refresh conversations list
                    fetchConversations()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile?.id, fetchConversations])

    // Supabase Realtime Presence — rastrear quem está online na clínica
    useEffect(() => {
        if (!profile?.id || !profile?.clinic_id) return

        const supabase = createClient()
        const presenceChannel = supabase.channel(`presence:clinic:${profile.clinic_id}`, {
            config: { presence: { key: profile.id } },
        })

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState()
                const ids = new Set<string>(Object.keys(state))
                setOnlineUsers(ids)
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                setOnlineUsers(prev => new Set([...prev, key]))
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev)
                    next.delete(key)
                    return next
                })
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user_id: profile.id,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        return () => {
            supabase.removeChannel(presenceChannel)
        }
    }, [profile?.id, profile?.clinic_id])

    const handleSelectConversation = (id: string) => {
        setSelectedConversation(id)
        setShowMobileMessages(true)

        // Mark as read
        fetch(`/api/chat/conversations/${id}/read`, { method: 'POST' }).catch(() => {})

        // Update local unread count
        setConversations(prev =>
            prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c)
        )
    }

    const handleBackToList = () => {
        setShowMobileMessages(false)
        setSelectedConversation(null)
    }

    const handleNewConversation = async (type: string, participantIds: string[], title?: string, clinicId?: string) => {
        try {
            const res = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    participant_ids: participantIds,
                    title,
                    clinic_id: clinicId,
                }),
            })
            if (res.ok) {
                const result = await res.json()
                await fetchConversations()
                setSelectedConversation(result.data.id)
                setShowMobileMessages(true)
            }
        } catch (error) {
            console.error('[Chat] Error creating conversation:', error)
        }
    }

    const selectedConvData = conversations.find(c => c.id === selectedConversation)
    const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

    return (
        <div className="flex h-[calc(100vh-11rem)] bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/30 dark:shadow-slate-950/40 transition-all duration-300">
            {/* Conversations List - Desktop always visible, mobile toggleable */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 border-r border-slate-100 dark:border-slate-800/60 flex flex-col transition-all duration-300",
                showMobileMessages ? "hidden md:flex" : "flex"
            )}>
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedConversation}
                    onSelect={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    isLoading={isLoading}
                    isSuperAdmin={isSuperAdmin}
                    currentUserId={profile?.id || ''}
                    onlineUsers={onlineUsers}
                />
            </div>

            {/* Message Area */}
            <div className={cn(
                "flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/20 transition-all duration-300",
                !showMobileMessages ? "hidden md:flex" : "flex"
            )}>
                {selectedConversation && selectedConvData ? (
                    <>
                        {/* Mobile back button */}
                        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
                            <button
                                onClick={handleBackToList}
                                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/30 dark:border-slate-700/30 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                                title="Voltar"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                {selectedConvData.title ||
                                    selectedConvData.participants
                                        .filter(p => p.user_id !== profile?.id)
                                        .map(p => p.users?.full_name || 'Usuário')
                                        .join(', ') ||
                                    'Conversa'}
                            </span>
                        </div>
                        <MessageArea
                            conversationId={selectedConversation}
                            conversation={selectedConvData}
                            currentUserId={profile?.id || ''}
                            onMessagesUpdated={fetchConversations}
                            onlineUsers={onlineUsers}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 p-6">
                        <div className="text-center max-w-sm">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 flex items-center justify-center shadow-inner relative animate-pulse">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 animate-ping duration-1000" />
                                <MessageCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Sua Central de Comunicação</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs mx-auto">
                                Selecione uma conversa na barra lateral ou inicie um novo chat com seus colegas de equipe.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
