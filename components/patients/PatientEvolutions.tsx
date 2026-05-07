'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History, FileText, Loader2, Activity, User, CalendarDays, TrendingUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

interface PatientEvolutionsProps {
    patientId: string
}

export function PatientEvolutions({ patientId }: PatientEvolutionsProps) {
    const [records, setRecords] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const loadRecords = async () => {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('medical_records')
                .select(`
                    *,
                    appointment:appointments(appointment_date, status),
                    doctor:doctors(users(full_name), specialty)
                `)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                
            if (!error && data) {
                setRecords(data)
            }
            setIsLoading(false)
        }
        if (patientId) loadRecords()
    }, [patientId])

    if (isLoading) {
        return (
            <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground animate-pulse">Carregando jornada do paciente...</p>
                </CardContent>
            </Card>
        )
    }

    if (records.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Jornada em Branco</h3>
                    <p className="text-muted-foreground max-w-md">
                        Este paciente ainda não possui evoluções registradas. A linha do tempo começará a ser construída após a primeira sessão.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const lastSessionDate = records[0]?.created_at ? new Date(records[0].created_at) : null

    return (
        <div className="space-y-6">
            {/* Dashboard Resumo da Jornada */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Sessões</p>
                            <h4 className="text-2xl font-bold">{records.length}</h4>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Início do Tratamento</p>
                            <h4 className="text-lg font-bold">
                                {format(new Date(records[records.length - 1].created_at), 'MMM yyyy', { locale: ptBR })}
                            </h4>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Última Sessão</p>
                            <h4 className="text-lg font-bold">
                                {lastSessionDate ? formatDistanceToNow(lastSessionDate, { addSuffix: true, locale: ptBR }) : 'Desconhecida'}
                            </h4>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Linha do Tempo (Timeline) */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="w-5 h-5 text-primary" />
                        Linha do Tempo Clínica
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                    <div className="relative border-l-2 border-primary/20 ml-3 md:ml-4 space-y-8 pb-4">
                        {records.map((record, index) => {
                            let customData: any = {}
                            try {
                                if (record.follow_up_instructions) {
                                    customData = JSON.parse(record.follow_up_instructions)
                                }
                            } catch(e) {}

                            const recordDate = record.appointment?.appointment_date 
                                ? new Date(record.appointment.appointment_date + 'T00:00:00') 
                                : new Date(record.created_at)

                            const doctorName = record.doctor?.users?.full_name || 'Profissional'
                            const specialty = record.doctor?.specialty || 'Atendimento'

                            // Determine main content snippet
                            const contentSnippet = record.history_present_illness 
                                || customData.evolucao_psicologica 
                                || customData.evolucao_funcional 
                                || record.chief_complaint 
                                || "Sessão realizada sem detalhes descritivos longos."

                            return (
                                <div key={record.id} className="relative pl-6 md:pl-8 group">
                                    {/* Timeline Dot */}
                                    <div className="absolute w-4 h-4 bg-primary rounded-full left-[-9px] top-1.5 ring-4 ring-background group-hover:scale-125 group-hover:bg-primary transition-all duration-300 shadow-sm" />
                                    
                                    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group-hover:border-primary/30">
                                        {/* Color accent bar on top */}
                                        <div className="h-1 w-full bg-gradient-to-r from-primary/40 to-primary/10" />
                                        
                                        <CardContent className="p-4 sm:p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-medium">
                                                            {format(recordDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                        </Badge>
                                                        {index === 0 && (
                                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                                                Mais Recente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                                        <User className="w-3.5 h-3.5" />
                                                        <span className="font-medium text-foreground">{doctorName}</span>
                                                        <span className="text-xs opacity-60">•</span>
                                                        <span className="text-xs uppercase tracking-wider">{specialty}</span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="shrink-0 text-primary hover:bg-primary/10 w-full sm:w-auto"
                                                    onClick={() => router.push(`/dashboard/prontuarios/${record.appointment_id}`)}
                                                >
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Ver Prontuário
                                                </Button>
                                            </div>

                                            <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed text-foreground/80 border border-border/40">
                                                {record.chief_complaint && (
                                                    <div className="mb-2">
                                                        <strong className="text-foreground/90 block mb-0.5 text-xs uppercase tracking-wider">Queixa Principal</strong>
                                                        <p className="italic">{record.chief_complaint}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <strong className="text-foreground/90 block mb-0.5 text-xs uppercase tracking-wider mt-3">Evolução Resumida</strong>
                                                    <p className="line-clamp-3">{contentSnippet}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
