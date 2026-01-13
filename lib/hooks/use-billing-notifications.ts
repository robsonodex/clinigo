
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface BillingNotification {
    id: string
    type: 'REMINDER_7D' | 'REMINDER_3D' | 'REMINDER_1D' | 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED' | 'OVERDUE' | 'SUSPENDED'
    title: string
    message: string
    sent_at: string
    read_at: string | null
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

async function fetchNotifications(): Promise<BillingNotification[]> {
    const res = await fetch('/api/billing/notifications')
    if (!res.ok) throw new Error('Failed to fetch notifications')
    return res.json()
}

async function markAsRead(id: string): Promise<void> {
    await fetch('/api/billing/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id }),
    })
}

export function useBillingNotifications() {
    const queryClient = useQueryClient()

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['billing-notifications'],
        queryFn: fetchNotifications,
        refetchInterval: 60000, // Check every minute
    })

    const { mutateAsync: markRead } = useMutation({
        mutationFn: markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-notifications'] })
        },
    })

    const unreadNotifications = notifications.filter(n => !n.read_at)
    const unreadCount = unreadNotifications.length

    return {
        notifications,
        unreadNotifications,
        unreadCount,
        isLoading,
        markAsRead: markRead,
    }
}
