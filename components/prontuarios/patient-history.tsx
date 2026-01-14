'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Calendar, User, FileText, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MedicalRecord {
    id: string
    chief_complaint: string
    diagnosis: string | null
    created_at: string
    doctor: {
        user: {
            name: string
        }
    } | null
    appointment: {
        appointment_date: string
        status: string
    } | null
}

interface PatientHistoryProps {
    patientId: string | null
}

export default function PatientHistory({ patientId }: PatientHistoryProps) {
    const [records, setRecords] = useState<MedicalRecord[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (patientId) {
            loadHistory()
        } else {
            setRecords([])
        }
    }, [patientId])

    async function loadHistory() {
        if (!patientId) return

        setLoading(true)
        try {
            const res = await fetch(`/api/patients/${patientId}/medical-records`)
            if (res.ok) {
                const data = await res.json()
                setRecords(data.records || [])
            }
        } catch (error) {
            console.error('Error loading patient history:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!patientId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Histórico do Paciente
                    </CardTitle>
                    <CardDescription>
                        Selecione um paciente para ver o histórico
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Histórico do Paciente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                </CardContent>
            </Card>
        )
    }

    if (records.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Histórico do Paciente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                            Nenhum prontuário encontrado para este paciente
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Histórico do Paciente
                </CardTitle>
                <CardDescription>
                    {records.length} {records.length === 1 ? 'prontuário' : 'prontuários'} encontrado
                    {records.length !== 1 ? 's' : ''}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {records.map((record, index) => (
                            <div key={record.id}>
                                {index > 0 && <Separator className="my-4" />}
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-medium">
                                                    {format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy", {
                                                        locale: ptBR,
                                                    })}
                                                </span>
                                            </div>
                                            {record.doctor?.user && (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {record.doctor.user.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {record.appointment && (
                                            <Badge variant="outline" className="text-xs">
                                                {record.appointment.status}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="pl-5 space-y-1">
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Queixa Principal:
                                            </span>
                                            <p className="text-sm">{record.chief_complaint}</p>
                                        </div>
                                        {record.diagnosis && (
                                            <div>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Diagnóstico:
                                                </span>
                                                <p className="text-sm">{record.diagnosis}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
