'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Stethoscope,
    Building2,
    ChevronRight,
    Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface HistoryItem {
    id: string
    date: string
    startTime: string
    endTime: string
    type: string
    doctor: { name: string; specialty: string }
    clinic: { name: string }
}

export default function PatientHistoryPage() {
    const router = useRouter()
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pagination, setPagination] = useState({ total: 0, hasMore: false })

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        try {
            const res = await fetch('/api/patient/history')
            if (!res.ok) {
                router.push('/paciente/entrar')
                return
            }
            const data = await res.json()
            setHistory(data.history)
            setPagination(data.pagination)
        } catch (error) {
            console.error('Erro ao carregar histórico:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            VIDEO: '📹 Teleconsulta',
            PRESENTIAL: '🏥 Presencial',
            PHONE: '📞 Telefone',
        }
        return types[type] || type
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/paciente/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg">Meu Histórico</h1>
                        <p className="text-sm text-muted-foreground">
                            Consultas realizadas
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                ) : history.length === 0 ? (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h2 className="text-xl font-semibold mb-2">Nenhuma consulta realizada</h2>
                            <p className="text-muted-foreground mb-6">
                                Seu histórico aparecerá aqui após sua primeira consulta.
                            </p>
                            <Link href="/paciente/agendar">
                                <Button>Agendar Consulta</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground mb-4">
                            {pagination.total} consultas realizadas
                        </p>

                        <div className="space-y-4">
                            {history.map((item) => (
                                <Card key={item.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start gap-4">
                                            {/* Date */}
                                            <div className="text-center min-w-[60px]">
                                                <p className="text-3xl font-bold text-primary">
                                                    {format(new Date(item.date), 'd')}
                                                </p>
                                                <p className="text-sm uppercase text-muted-foreground">
                                                    {format(new Date(item.date), 'MMM', { locale: ptBR })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(item.date), 'yyyy')}
                                                </p>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{item.doctor.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {item.doctor.specialty}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {item.clinic.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {item.startTime} - {item.endTime}
                                                    </span>
                                                    <span>{getTypeLabel(item.type)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {pagination.hasMore && (
                            <div className="text-center mt-6">
                                <Button variant="outline">
                                    Carregar mais
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

