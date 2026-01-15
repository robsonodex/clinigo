'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Notification } from '@/types/notification'
import { toast } from 'sonner'

export function useNotifications() {
    const { user, supabase } = useAuth()
    const queryClient = useQueryClient()

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            return data as Notification[]
        },
        enabled: !!user?.id,
    })

    // Unread count
    const unreadCount = notifications.filter(n => !n.read).length

    // Realtime subscription
    useEffect(() => {
        if (!user?.id) return

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification
                    queryClient.setQueryData(['notifications', user.id], (old: Notification[] = []) => [
                        newNotification,
                        ...old,
                    ])
                    toast(newNotification.title, {
                        description: newNotification.message,
                    })
                    // Play sound?
                    // const audio = new Audio('/sounds/notification.mp3')
                    // audio.play().catch(() => {})
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user?.id, queryClient, supabase])

    // Mark as read mutation
    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('notifications')
                .update({ read: true })
                .eq('id', id)
            if (error) throw error
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] })
            const previous = queryClient.getQueryData(['notifications', user?.id])
            queryClient.setQueryData(['notifications', user?.id], (old: Notification[] = []) =>
                old.map(n => n.id === id ? { ...n, read: true } : n)
            )
            return { previous }
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications', user?.id], context?.previous)
            toast.error('Erro ao marcar como lida')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
        }
    })

    // Mark all as read
    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!user?.id) return
            const { error } = await (supabase as any)
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
        }
    })

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
    }
}
