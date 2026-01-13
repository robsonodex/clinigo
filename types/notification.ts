export interface Notification {
    id: string
    user_id: string
    clinic_id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'system'
    read: boolean
    link?: string
    metadata?: Record<string, any>
    created_at: string
}
