'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/use-notifications'
import { Bell, Check, ExternalLink, MailOpen, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

export default function NotificationsPage() {
    const { notifications, isLoading, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotifications()

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Bell className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Notificações</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Histórico de alertas e mensagens do sistema</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                                if (confirm('Tem certeza que deseja excluir TODAS as notificações? Esta ação não pode ser desfeita.')) {
                                    deleteAllNotifications.mutate()
                                }
                            }}
                            disabled={deleteAllNotifications.isPending}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Limpar Histórico
                        </Button>
                    )}
                    {notifications.some(n => !n.read) && (
                        <Button
                            variant="outline"
                            onClick={() => markAllAsRead.mutate()}
                            disabled={markAllAsRead.isPending}
                        >
                            <MailOpen className="w-4 h-4 mr-2" />
                            Marcar lidas
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/4" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Você não tem notificações</p>
                            <p>Tudo tranquilo por aqui.</p>
                        </div>
                    ) : (
                        <div className="divide-y border rounded-lg">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 transition-colors flex items-start gap-4",
                                        !notification.read ? "bg-blue-50/50 hover:bg-blue-50" : "bg-card hover:bg-muted/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                        !notification.read ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"
                                    )}>
                                        <Bell className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={cn("text-base", !notification.read ? "font-semibold" : "font-medium")}>
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                                    NOVA
                                                </span>
                                            )}
                                            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-sm text-muted-foreground mb-2 whitespace-pre-line">
                                            {notification.message}
                                        </p>

                                        <div className="flex items-center gap-3">
                                            {notification.link && (
                                                <Link href={notification.link}>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                                        Ver Detalhes
                                                        <ExternalLink className="w-3 h-3 ml-2" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                    onClick={() => markAsRead.mutate(notification.id)}
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Marcar como lida
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botão de excluir individual */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 -mt-2 -mr-2 opacity-50 hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            if (confirm('Excluir esta notificação permanentemente?')) {
                                                deleteNotification.mutate(notification.id)
                                            }
                                        }}
                                        title="Excluir notificação"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
