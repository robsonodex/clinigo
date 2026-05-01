'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

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
                    doctor:doctors(users(full_name))
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Evoluções
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : records.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground">Nenhuma evolução encontrada.</div>
                ) : (
                    <div className="space-y-4">
                        {records.map(record => {
                            let customData: any = {}
                            try {
                                if (record.follow_up_instructions) {
                                    customData = JSON.parse(record.follow_up_instructions)
                                }
                            } catch(e) {}

                            return (
                                <div key={record.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-sm">
                                                {record.appointment?.appointment_date ? format(new Date(record.appointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy') : format(new Date(record.created_at), 'dd/MM/yyyy')} 
                                                <span className="text-muted-foreground font-normal ml-2 text-xs">
                                                    Profissional: {record.doctor?.users?.full_name || 'Desconhecido'}
                                                </span>
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/prontuarios/${record.appointment_id}`)}>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Ver Completo
                                        </Button>
                                    </div>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {record.chief_complaint && (
                                            <p><strong className="text-slate-700">Queixa:</strong> {record.chief_complaint}</p>
                                        )}
                                        {record.history_present_illness && (
                                            <p className="line-clamp-2"><strong className="text-slate-700">Evolução (Médica):</strong> {record.history_present_illness}</p>
                                        )}
                                        {customData.evolucao_psicologica && (
                                            <p className="line-clamp-2"><strong className="text-slate-700">Evolução (Psi):</strong> {customData.evolucao_psicologica}</p>
                                        )}
                                        {customData.evolucao_funcional && (
                                            <p className="line-clamp-2"><strong className="text-slate-700">Evolução (Terapia):</strong> {customData.evolucao_funcional}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
