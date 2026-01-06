'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, MonitorSmartphone, Smartphone, Tablet, Trash2, MapPin, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Session {
    id: string
    device_name: string | null
    device_type: string
    browser: string | null
    os: string | null
    ip_address: string
    location_city: string | null
    location_country: string | null
    is_active: boolean
    last_active_at: string
    created_at: string
    is_current?: boolean
}

export function SessionsManager() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [revoking, setRevoking] = useState<string | null>(null)
    const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)

    useEffect(() => {
        fetchSessions()
    }, [])

    async function fetchSessions() {
        try {
            const res = await fetch('/api/auth/sessions')
            if (res.ok) {
                const data = await res.json()
                setSessions(data.sessions)
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error)
            toast.error('Erro ao carregar sessões')
        } finally {
            setLoading(false)
        }
    }

    async function revokeSession(sessionId: string) {
        try {
            setRevoking(sessionId)
            const res = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                toast.success('Sessão encerrada')
                fetchSessions()
            } else {
                toast.error('Erro ao encerrar sessão')
            }
        } catch (error) {
            toast.error('Erro ao encerrar sessão')
        } finally {
            setRevoking(null)
        }
    }

    async function revokeAllOtherSessions() {
        try {
            setRevoking('all')
            const res = await fetch('/api/auth/sessions', {
                method: 'DELETE',
            })

            if (res.ok) {
                toast.success('Todas as outras sessões foram encerradas')
                fetchSessions()
            } else {
                toast.error('Erro ao encerrar sessões')
            }
        } catch (error) {
            toast.error('Erro ao encerrar sessões')
        } finally {
            setRevoking(null)
            setShowRevokeAllDialog(false)
        }
    }

    function getDeviceIcon(deviceType: string) {
        switch (deviceType) {
            case 'mobile':
                return <Smartphone className="h-5 w-5" />
            case 'tablet':
                return <Tablet className="h-5 w-5" />
            default:
                return <MonitorSmartphone className="h-5 w-5" />
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MonitorSmartphone className="h-5 w-5" />
                                Sessões Ativas
                            </CardTitle>
                            <CardDescription>
                                Dispositivos conectados à sua conta
                            </CardDescription>
                        </div>
                        {sessions.length > 1 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRevokeAllDialog(true)}
                                disabled={revoking === 'all'}
                            >
                                Encerrar outras sessões
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {sessions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            Nenhuma sessão ativa encontrada.
                        </p>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${session.is_current ? 'border-primary bg-primary/5' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {getDeviceIcon(session.device_type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {session.browser || 'Navegador desconhecido'} • {session.os || 'SO desconhecido'}
                                            </span>
                                            {session.is_current && (
                                                <Badge variant="default" className="text-xs">
                                                    Sessão atual
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            {session.location_city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {session.location_city}, {session.location_country}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(session.last_active_at), {
                                                    addSuffix: true,
                                                    locale: ptBR,
                                                })}
                                            </span>
                                            <span className="text-xs">{session.ip_address}</span>
                                        </div>
                                    </div>
                                </div>
                                {!session.is_current && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => revokeSession(session.id)}
                                        disabled={revoking === session.id}
                                    >
                                        {revoking === session.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Encerrar outras sessões?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso irá desconectar todos os outros dispositivos. Você precisará fazer login
                            novamente neles.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={revokeAllOtherSessions}>
                            Encerrar todas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
