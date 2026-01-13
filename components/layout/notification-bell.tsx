'use client'

import { useState } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Simple date formatter to avoid dependency issues if date-fns is missing or not configured
function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
    return `${Math.floor(diffInSeconds / 86400)}d atrás`
}

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse ring-2 ring-white" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notificações</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1 text-primary hover:text-primary/80"
                            onClick={() => markAllAsRead.mutate()}
                            disabled={markAllAsRead.isPending}
                        >
                            Marcar todas como lidas
                        </Button>
                    )}
                </div>
                <div className="h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 p-4 text-muted-foreground">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">Nenhuma notificação</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-muted/50 transition-colors relative group",
                                        !notification.read ? "bg-blue-50/50" : "bg-background"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 space-y-1">
                                            <p className={cn("text-sm", !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 pt-1">
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatTimeAgo(notification.created_at)}
                                                </span>
                                                {notification.link && (
                                                    <Link
                                                        href={notification.link}
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5 ml-2"
                                                        onClick={() => {
                                                            if (!notification.read) markAsRead.mutate(notification.id)
                                                            setOpen(false)
                                                        }}
                                                    >
                                                        Ver <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    markAsRead.mutate(notification.id)
                                                }}
                                                title="Marcar como lida"
                                            >
                                                <Check className="h-3 w-3" />
                                                <span className="sr-only">Marcar como lida</span>
                                            </Button>
                                        )}
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-2 border-t text-center">
                    <Link href="/dashboard/notificacoes" passHref>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setOpen(false)}>
                            Ver histórico completo
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
