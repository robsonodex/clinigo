'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Calendar,
    Clock,
    User,
    MapPin,
    Video,
    CreditCard,
    FileText,
    Stethoscope,
    Phone,
    Mail
} from 'lucide-react'
import { type Appointment } from '@/lib/api-client'
import { formatCurrency, formatPhone } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface AppointmentDetailsModalProps {
    appointment: Appointment | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit?: (appointment: Appointment) => void
    onCancel?: (appointment: Appointment) => void
}

export function AppointmentDetailsModal({
    appointment,
    open,
    onOpenChange,
    onEdit,
    onCancel
}: AppointmentDetailsModalProps) {
    const router = useRouter()

    if (!appointment) return null

    const statusColors: Record<string, string> = {
        CONFIRMED: 'bg-blue-100 text-blue-800',
        PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
        COMPLETED: 'bg-green-100 text-green-800',
        CANCELLED: 'bg-red-100 text-red-800',
        NO_SHOW: 'bg-gray-100 text-gray-800',
    }

    const statusLabels: Record<string, string> = {
        CONFIRMED: 'Confirmado',
        PENDING_PAYMENT: 'Aguardando Pagamento',
        COMPLETED: 'Concluído',
        CANCELLED: 'Cancelado',
        NO_SHOW: 'Não Compareceu',
    }

    const handleOpenMedicalRecord = () => {
        router.push(`/dashboard/consultas/${appointment.id}`)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle>Detalhes do Agendamento</DialogTitle>
                        <Badge className={`${statusColors[appointment.status] || 'bg-gray-100'} hover:bg-opacity-80`}>
                            {statusLabels[appointment.status] || appointment.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Patient Info */}
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg leading-none">{appointment.patient.full_name}</h3>
                            <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    {formatPhone(appointment.patient.phone)}
                                </div>
                                {appointment.patient.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3 w-3" />
                                        {appointment.patient.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        {/* Time & Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-medium flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Data
                                </span>
                                <p className="font-medium">
                                    {format(new Date(appointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-medium flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Horário
                                </span>
                                <p className="font-medium">
                                    {appointment.appointment_time.substring(0, 5)}
                                </p>
                            </div>
                        </div>

                        {/* Doctor */}
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-medium flex items-center gap-1">
                                <Stethoscope className="h-3 w-3" /> Médico
                            </span>
                            <p className="font-medium">
                                Dr. {appointment.doctor.user.full_name} <span className="text-muted-foreground font-normal">- {appointment.doctor.specialty}</span>
                            </p>
                        </div>

                        {/* Type & Payment */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-medium flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Tipo
                                </span>
                                <div className="flex items-center gap-2 font-medium">
                                    {appointment.video_link ? (
                                        <>
                                            <Video className="h-4 w-4 text-primary" />
                                            Telemedicina
                                        </>
                                    ) : (
                                        'Presencial'
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground uppercase font-medium flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" /> Pagamento
                                </span>
                                <p className="font-medium">
                                    {appointment.payment_type === 'CONVENIO' ? 'Convênio' : 'Particular'}
                                </p>
                            </div>
                        </div>

                        {/* Notes */}
                        {appointment.notes && (
                            <div className="space-y-1 bg-muted/50 p-3 rounded-md">
                                <span className="text-xs text-muted-foreground uppercase font-medium flex items-center gap-1 mb-1">
                                    <FileText className="h-3 w-3" /> Observações
                                </span>
                                <p className="text-sm">{appointment.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {appointment.status === 'CONFIRMED' && (
                        <Button className="w-full sm:w-auto" onClick={handleOpenMedicalRecord}>
                            <FileText className="h-4 w-4 mr-2" />
                            Abrir Prontuário
                        </Button>
                    )}
                    {onEdit && (
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => onEdit(appointment)}>
                            Editar
                        </Button>
                    )}

                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
