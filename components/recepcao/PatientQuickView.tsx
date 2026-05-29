/**
 * Patient Quick View Drawer Component
 * Used by reception to quickly view patient information
 */

'use client'

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarGradient } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

interface PatientQuickViewProps {
    patientId: string
    open: boolean
    onClose: () => void
}

export function PatientQuickView({ patientId, open, onClose }: PatientQuickViewProps) {
    const supabase = createClient()

    const { data: patient, isLoading } = useQuery({
        queryKey: ['patient-quick', patientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('patients')
                .select(`
          *,
          health_insurance:health_insurance_plans(*),
          documents:patient_documents(*),
          appointments(
            id,
            appointment_date,
            appointment_time,
            status,
            no_show,
            doctor:doctors(user:users(full_name))
          )
        `)
                .eq('id', patientId)
                .single()

            if (error) throw error

            // Calculate stats
            const appointments = data.appointments || []
            const totalAppointments = appointments.length
            const completed = appointments.filter((a: any) => a.status === 'COMPLETED').length
            const noShowCount = appointments.filter((a: any) => a.no_show).length

            return {
                ...data,
                total_appointments: totalAppointments,
                completed_appointments: completed,
                no_show_count: noShowCount,
                initials: data.full_name.split(' ').map((n: string) => n[0]).join(''),
            }
        },
        enabled: open && !!patientId,
    })

    if (!open) return null
    if (isLoading) return null

    return (
        <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader>
                    <div className="flex items-center gap-4">
                        {patient?.avatar_url ? (
                            <Avatar className="w-16 h-16">
                                <AvatarImage src={patient.avatar_url} />
                                <AvatarFallback className="text-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                    {patient.initials}
                                </AvatarFallback>
                            </Avatar>
                        ) : (() => {
                            const avatar = getAvatarGradient(patient?.full_name || '')
                            return (
                                <div 
                                    style={avatar.style}
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-md shrink-0"
                                >
                                    {avatar.initials}
                                </div>
                            )
                        })()}
                        <div>
                            <DrawerTitle className="text-2xl">{patient?.full_name}</DrawerTitle>
                            <DrawerDescription>
                                CPF: {patient?.cpf} | Tel: {patient?.phone}
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>

                <div className="px-4 overflow-y-auto pb-6">
                    {/* Alertas */}
                    {patient?.no_show_count > 2 && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Atenção: Histórico de Faltas</AlertTitle>
                            <AlertDescription>
                                Paciente possui {patient.no_show_count} faltas registradas. Considere
                                solicitar confirmação adicional.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Tabs */}
                    <Tabs defaultValue="admin">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="admin">Administrativo</TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                            <TabsTrigger value="docs">Documentos</TabsTrigger>
                            <TabsTrigger value="prefs">Preferências</TabsTrigger>
                        </TabsList>

                        {/* Tab: Administrativo */}
                        <TabsContent value="admin" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados Cadastrais</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <InfoRow label="Nome Completo" value={patient?.full_name} />
                                    <InfoRow label="CPF" value={patient?.cpf} />
                                    <InfoRow
                                        label="Data Nascimento"
                                        value={
                                            patient?.date_of_birth
                                                ? format(new Date(patient.date_of_birth), 'dd/MM/yyyy')
                                                : 'Não informado'
                                        }
                                    />
                                    <InfoRow label="Email" value={patient?.email} />
                                    <InfoRow label="Telefone" value={patient?.phone} />
                                </CardContent>
                            </Card>

                            {patient?.health_insurance && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Convênio</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <InfoRow label="Operadora" value={patient.health_insurance.name} />
                                        <InfoRow
                                            label="Plano"
                                            value={patient.insurance_plan || 'Não especificado'}
                                        />
                                        <InfoRow
                                            label="Carteirinha"
                                            value={patient.insurance_card_number || 'Não informado'}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Tab: Histórico */}
                        <TabsContent value="history">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Estatísticas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-3xl font-bold">{patient?.total_appointments}</p>
                                            <p className="text-sm text-muted-foreground">Total</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-green-600">
                                                {patient?.completed_appointments}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Realizadas</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-red-600">
                                                {patient?.no_show_count}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Faltas</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-2">
                                        <h3 className="font-semibold">Últimas Consultas</h3>
                                        {patient?.appointments.slice(0, 5).map((apt: any) => (
                                            <div
                                                key={apt.id}
                                                className="flex justify-between items-center p-2 border-b last:border-0"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {format(new Date(apt.appointment_date), 'dd/MM/yyyy')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Dr(a). {apt.doctor.user.full_name}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={apt.status === 'COMPLETED' ? 'default' : 'secondary'}
                                                >
                                                    {apt.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Documentos */}
                        <TabsContent value="docs">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Documentos</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {patient?.documents && patient.documents.length > 0 ? (
                                            patient.documents.map((doc: any) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5" />
                                                        <div>
                                                            <p className="font-medium">{doc.file_name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => window.open(doc.file_url, '_blank')}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-muted-foreground py-8">
                                                Nenhum documento cadastrado
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Preferências */}
                        <TabsContent value="prefs">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Observações da Recepção</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {patient?.reception_notes || 'Sem observações registradas'}
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex justify-between py-2 border-b last:border-0">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold">{value || '-'}</span>
        </div>
    )
}
