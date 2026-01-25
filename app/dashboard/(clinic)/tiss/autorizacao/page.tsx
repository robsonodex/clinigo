'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Send, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AuthorizationRequest {
    id: string
    request_number: string
    authorization_number?: string
    status: 'PENDING' | 'SENT' | 'APPROVED' | 'REJECTED'
    clinical_indication: string
    created_at: string
    patient: {
        full_name: string
        cpf: string
    }
    doctor: {
        user: {
            full_name: string
        }
    }
    health_insurance: {
        name: string
    }
    procedures: Array<{
        procedure_code: string
        procedure_description: string
        quantity: number
    }>
}

const STATUS_CONFIG = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-800', icon: Send },
    APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function AutorizacaoPage() {
    const [requests, setRequests] = useState<AuthorizationRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('ALL')

    useEffect(() => {
        fetchRequests()
    }, [filter])

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filter !== 'ALL') {
                params.append('status', filter)
            }

            const response = await fetch(`/api/tiss/autorizacao?${params}`)
            const data = await response.json()

            if (data.success !== false) {
                setRequests(data.requests || [])
            } else {
                toast.error('Erro ao carregar solicitações')
            }
        } catch (error) {
            console.error('[AUTORIZACAO] Error:', error)
            toast.error('Erro ao carregar solicitações')
        } finally {
            setLoading(false)
        }
    }

    const handleSendRequest = async (requestId: string) => {
        try {
            const response = await fetch(`/api/tiss/autorizacao/${requestId}/enviar`, {
                method: 'POST',
            })

            const data = await response.json()

            if (data.message) {
                toast.success(data.message)
                fetchRequests() // Reload list
            } else {
                toast.error('Erro ao enviar solicitação')
            }
        } catch (error) {
            console.error('[AUTORIZACAO] Send error:', error)
            toast.error('Erro ao enviar solicitação')
        }
    }

    const filteredRequests = requests

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Solicitação de Autorização</h1>
                    <p className="text-muted-foreground">Gerencie solicitações TISS (SP/SADT)</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Solicitação
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {['ALL', 'PENDING', 'SENT', 'APPROVED', 'REJECTED'].map((status) => (
                    <Button
                        key={status}
                        variant={filter === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(status)}
                    >
                        {status === 'ALL' ? 'Todos' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}
                    </Button>
                ))}
            </div>

            {/* Requests List */}
            <div className="grid gap-4">
                {loading ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Carregando solicitações...
                        </CardContent>
                    </Card>
                ) : filteredRequests.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Nenhuma solicitação encontrada
                        </CardContent>
                    </Card>
                ) : (
                    filteredRequests.map((request) => {
                        const statusConfig = STATUS_CONFIG[request.status]
                        const StatusIcon = statusConfig.icon

                        return (
                            <Card key={request.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">
                                                #{request.request_number}
                                            </CardTitle>
                                            <CardDescription>
                                                {request.patient.full_name} • {request.health_insurance.name}
                                            </CardDescription>
                                        </div>
                                        <Badge className={statusConfig.color} variant="secondary">
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Médico:</span>
                                            <p className="font-medium">{request.doctor.user.full_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Data:</span>
                                            <p className="font-medium">
                                                {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                            </p>
                                        </div>
                                        {request.authorization_number && (
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground">Número de Autorização:</span>
                                                <p className="font-medium text-green-600">{request.authorization_number}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Procedures */}
                                    <div>
                                        <span className="text-sm text-muted-foreground">Procedimentos:</span>
                                        <ul className="mt-2 space-y-1">
                                            {request.procedures.map((proc, idx) => (
                                                <li key={idx} className="text-sm flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span>
                                                        {proc.procedure_code} - {proc.procedure_description}
                                                        {proc.quantity > 1 && ` (${proc.quantity}x)`}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Clinical Indication */}
                                    <div>
                                        <span className="text-sm text-muted-foreground">Justificativa Clínica:</span>
                                        <p className="mt-1 text-sm bg-muted p-3 rounded-md">
                                            {request.clinical_indication}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    {request.status === 'PENDING' && (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                onClick={() => handleSendRequest(request.id)}
                                                size="sm"
                                            >
                                                <Send className="w-4 h-4 mr-2" />
                                                Enviar para Operadora
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
