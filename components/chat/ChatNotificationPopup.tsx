'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationData {
    id: string
    senderName: string
    senderAvatar: string | null
    preview: string
    conversationId: string
    timestamp: Date
}

/**
 * ChatNotificationPopup — Pop-up flutuante de notificação de chat
 * Aparece quando:
 *   1. Uma nova mensagem chega via Supabase Realtime
 *   2. O usuário NÃO está na página do chat
 *   3. A mensagem é de outro usuário
 * Auto-dismiss após 5 segundos
 */
export function ChatNotificationPopup() {
    const { profile } = useAuth()
    const pathname = usePathname()
    const [notifications, setNotifications] = useState<NotificationData[]>([])
    const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

    // Não exibir notificações se já estiver na página do chat
    const isOnChatPage = pathname?.includes('/dashboard/chat')

    // Criar áudio de notificação
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAACAgICAgICAgICAgICAgICAgICBgYOEhoiKjI2Oj5CRkZGRkZCPjo2MioiGhIKBgH9+fXx7e3t7fH1+f4GCg4WGiImLjI2Oj5CQkZGRkJCPjo2MioiGhIKBgH9+fXx7e3t7fH1+gIGDhIaIiouMjY6PkJCRkZGQkI+OjYuKiIaEgoGAf359fHt7e3t8fX5/gYKDhYaIiYuMjY6Pj5CQkJGQkI+OjYyKiIaEgoGAf359fHt7e3t8fX6AgYOEhoiJi4yNjo+QkJCRkZCQj46NjIqIhoSCgYB/fn18e3t7e3x9fn+BgoSFhoiJi4yNjo+PkJCQkZCQj46NjIqIhoSCgYB/fn18e3t7')
            audio.volume = 0.3
            setAudioRef(audio)
        }
    }, [])

    // Subscription Realtime para novas mensagens
    useEffect(() => {
        if (!profile?.id) return

        const supabase = createClient()

        const channel = supabase
            .channel('chat-notification-popup')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                },
                async (payload) => {
                    const msg = payload.new as any

                    // Ignorar mensagens próprias
                    if (msg.sender_id === profile.id) return

                    // Ignorar se estiver na página de chat
                    if (isOnChatPage) return

                    // Buscar nome do remetente
                    const { data: sender } = await supabase
                        .from('users')
                        .select('full_name, avatar_url')
                        .eq('id', msg.sender_id)
                        .single()

                    const notification: NotificationData = {
                        id: msg.id,
                        senderName: sender?.full_name || 'Usuário',
                        senderAvatar: sender?.avatar_url || null,
                        preview: msg.content?.substring(0, 80) || (msg.message_type === 'image' ? '📷 Imagem' : msg.message_type === 'document' ? '📄 Documento' : msg.message_type === 'audio' ? '🎤 Áudio' : 'Nova mensagem'),
                        conversationId: msg.conversation_id,
                        timestamp: new Date(),
                    }

                    // Play sound
                    audioRef?.play().catch(() => {})

                    setNotifications(prev => [notification, ...prev].slice(0, 3)) // máximo 3 notificações
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile?.id, isOnChatPage, audioRef])

    // Auto-dismiss após 5 segundos
    useEffect(() => {
        if (notifications.length === 0) return

        const timer = setTimeout(() => {
            setNotifications(prev => prev.slice(0, -1)) // remove a mais antiga
        }, 5000)

        return () => clearTimeout(timer)
    }, [notifications])

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const handleClick = (conversationId: string, notifId: string) => {
        dismissNotification(notifId)
        window.location.href = `/dashboard/chat?conversation=${conversationId}`
    }

    if (notifications.length === 0 || isOnChatPage) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    onClick={() => handleClick(notif.conversationId, notif.id)}
                    className={cn(
                        "bg-white rounded-xl shadow-2xl border border-gray-200 p-4 cursor-pointer",
                        "transform transition-all duration-300 ease-out",
                        "hover:shadow-3xl hover:scale-[1.02]",
                        "animate-in slide-in-from-right-5 fade-in duration-300"
                    )}
                >
                    <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            {notif.senderAvatar ? (
                                <img
                                    src={notif.senderAvatar}
                                    alt={notif.senderName}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                    {notif.senderName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {notif.senderName}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        dismissNotification(notif.id)
                                    }}
                                    className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-0.5">
                                {notif.preview}
                            </p>
                        </div>
                    </div>

                    {/* Accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                </div>
            ))}
        </div>
    )
}
